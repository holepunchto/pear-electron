'use strict'
const path = require('path')
const pack = require('pear-pack')
const Module = require('bare-module')
const Localdrive = require('localdrive')
const AppDrive = require('pear-appdrive')
const IPC = require('pear-ipc') // todo: freeze pear-ipc just for boot, pear-ipc-  -> hardcode pear-ipc version - or maybe create a ipc.bundle, then its updater when the runtime is updated, but updates to pear-ipc aren't required to consume later pear-ipc versions or actually thats the same thing as le`ving it in thre boot bundle so actaully no need to do anything
const tryboot = require('pear-tryboot')
const { isWindows, isElectron, isElectronRenderer, isElectronWorker } = require('which-runtime')
const { pathToFileURL } = require('url-file-url')
const builtins = [
  'electron', 'net', 'assert', 'console', 'events', 'fs', 'fs/promises', 'http', 'https', 'os',
  'path', 'child_process', 'repl', 'url', 'tty', 'module', 'process', 'timers', 'inspector'
]
const target = [process.platform + '-' + process.arch]
const program = global.process ?? Bare
const rtiFlagIx = program.argv.indexOf('--rti')
const RTI = rtiFlagIx > -1 && program.argv[rtiFlagIx + 1]
const state = RTI ? null : JSON.parse(program.argv.slice(isWindows ? -2 : -1)[0])
const kIPC = Symbol('boot-ipc')
const startId = Pear.config.startId
const BOOT_ELECTRON_MAIN = 1
const BOOT_ELECTRON_PRELOAD = 2

function getEntry (type) {
  switch (type) {
    case BOOT_ELECTRON_MAIN: return '/node_modules/pear-electron/electron-main.js'
    case BOOT_ELECTRON_PRELOAD: return '/node_modules/pear-electron/preload.js'
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
  class API {
    static _STATE = state
    static RTI = RTI ? JSON.parse(RTI) : state.rti
    static IPC = kIPC
    config = {}
  }
  API.CONSTANTS = require('pear-constants')
  const ipc = new IPC.Client({
    lock: API.CONSTANTS.PLATFORM_LOCK,
    socketPath: API.CONSTANTS.SOCKET_PATH,
    connectTimeout: API.CONSTANTS.CONNECT_TIMEOUT,
    connect: tryboot
  })
  global.Pear = new API()
  global.Pear[API.IPC] = ipc
  await ipc.ready()
  await ipc.identify({ startId })
  const drive = new AppDrive()
  await drive.ready()
  const type = getBootType()
  const entry = getEntry(type)
  const { bundle, prebuilds } = await pack(drive, { entry, target, builtins, prebuildPrefix: pathToFileURL(API.RTI.assets).toString() })
  await drive.close()
  await ipc.close()

  const ldrive = new Localdrive(API.RTI.assets)
  for (const [prebuild, addon] of prebuilds) {
    if (await ldrive.entry(prebuild) !== null) continue
    await ldrive.put(prebuild, addon)
  }

  setImmediate(() => { // preserve unhandled exceptions (so they don't become rejections)
    Module.load(pathToFileURL(path.join(__dirname, 'electron.bundle')), bundle, {
      type: Module.constants.types.BUNDLE
    })
  })
}

boot().catch(console.error)
