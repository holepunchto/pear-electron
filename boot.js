'use strict'
const reset = compat()
const pack = require('pear-pack')
const evaluate = require('bare-bundle-evaluate')
reset()
const IPC = require('pear-ipc')
const tryboot = require('pear-tryboot')
const AppDrive = require('pear-appdrive')
const Bundle = require('bare-bundle')
const Localdrive = require('localdrive')
const { pathToFileURL } = require('url-file-url')
const { isWindows, isElectron, isElectronRenderer, isElectronWorker } = require('which-runtime')

const builtins = [
  'electron', 'net', 'assert', 'console', 'events', 'fs', 'fs/promises', 'http', 'https', 'os',
  'path', 'child_process', 'repl', 'url', 'tty', 'module', 'process', 'timers', 'inspector'
]
const target = [process.platform + '-' + process.arch]
const BOOT_ELECTRON_MAIN = 1
const BOOT_ELECTRON_PRELOAD = 2

function getEntry (type) {
  switch (type) {
    case BOOT_ELECTRON_MAIN: return 'file:///node_modules/pear-electron/electron-main.js'
    case BOOT_ELECTRON_PRELOAD: return 'file:///node_modules/pear-electron/preload.js'
  }
}

function getBootType () {
  if (isElectron) {
    return (isElectronRenderer || isElectronWorker)
      ? BOOT_ELECTRON_PRELOAD
      : BOOT_ELECTRON_MAIN
  }
}

async function boot () {
  const API = Pear.constructor
  const ipc = new IPC.Client({
    lock: API.CONSTANTS.PLATFORM_LOCK,
    socketPath: API.CONSTANTS.SOCKET_PATH,
    connectTimeout: API.CONSTANTS.CONNECT_TIMEOUT,
    connect: tryboot
  })
  global.Pear[API.IPC] = ipc
  const startId = API.RTI.startId
  await ipc.ready()
  await ipc.identify({ startId })
  const drive = new AppDrive()
  await drive.ready()
  const type = getBootType()
  const entry = getEntry(type)
  const packed = await pack(drive, { entry, target, builtins, prebuildPrefix: pathToFileURL(API.RTI.ui).toString() })
  await drive.close()
  await ipc.close()

  const ldrive = new Localdrive(API.RTI.ui)
  for (const [prebuild, addon] of packed.prebuilds) {
    if (await ldrive.entry(prebuild) !== null) continue
    await ldrive.put(prebuild, addon) // add any new prebuilds into asset prebuilds
  }

  const bundle = Bundle.from(packed.bundle)

  setImmediate(() => { // preserve unhandled exceptions (so they don't become rejections)
    evaluate(bundle, require)
  })
}

boot().catch(console.error)

function compat () {
  const kIPC = Symbol('boot-ipc')
  const rtiFlagIx = process.argv.indexOf('--rti')
  const RTI = rtiFlagIx > -1 && process.argv[rtiFlagIx + 1]
  const state = RTI ? null : JSON.parse(process.argv.slice(isWindows ? -2 : -1)[0])
  class API {
    static _STATE = state
    static RTI = RTI ? JSON.parse(RTI) : state.rti
    static IPC = kIPC
    app = {}
  }
  global.Pear = new API()
  global.Pear.config = global.Pear.app // TODO remove
  API.CONSTANTS = require('pear-constants')
  const Addon = (...args) => {
    console.log('attemptin Addon', args)
  }
  Addon.host = process.platform + '-' + process.arch
  // spoof
  global.Bare = {
    simulator: false,
    platform: process.platform,
    arch: process.arch,
    Addon,
    versions: { bare: '1.22.0', uv: '1.51.0', v8: '13.8.258.18' }
  }
  return () => {
    delete global.Bare // does not cause deopt as long as deleting the most recently added property on the object
  }
}

// function traceProxy (target, name = 'proxy') {
//   const cache = new WeakMap()
//   const wrap = val => {
//     if (val === null) return val
//     const t = typeof val
//     if (t !== 'object' && t !== 'function') return val
//     if (cache.has(val)) return cache.get(val)

//     const handler = {
//       get (o, prop, recv) {
//         console.log(name, 'get', String(prop))
//         return wrap(Reflect.get(o, prop, recv))
//       },
//       set (o, prop, value, recv) {
//         console.log(name, 'set', String(prop), value)
//         return Reflect.set(o, prop, value, recv)
//       },
//       apply (fn, thisArg, args) {
//         console.log(name, 'apply', args)
//         return Reflect.apply(fn, thisArg, args)
//       },
//       construct (fn, args, newT) {
//         console.log(name, 'construct', args)
//         return wrap(Reflect.construct(fn, args, newT))
//       }
//     }

//     const p = new Proxy(val, handler)
//     cache.set(val, p)
//     return p
//   }

//   return wrap(target)
// }
