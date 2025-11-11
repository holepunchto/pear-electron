'use strict'
const { isWindows, isMac, isLinux, isElectron, isElectronRenderer, isElectronWorker } = require('which-runtime')
const { pathToFileURL } = require('url-file-url')
const evaluate = require('bare-bundle-evaluate')
const Bundle = require('bare-bundle')
const electron = require('electron')
const BOOT_ELECTRON_MAIN = 1
const BOOT_ELECTRON_PRELOAD = 2

function type () {
  if (isElectron) {
    return (isElectronRenderer || isElectronWorker)
      ? BOOT_ELECTRON_PRELOAD
      : BOOT_ELECTRON_MAIN
  }
}

setup()

switch (type()) {
  case BOOT_ELECTRON_PRELOAD: {
    try {
      const uint8 = electron.ipcRenderer.sendSync('preload')
      const buffer = Buffer.from(uint8)
      const bundle = Bundle.from(buffer)
      evaluate(bundle)
    } catch (err) {
      console.error(err)
    }

    break
  }
  case BOOT_ELECTRON_MAIN: {
    configureElectron()

    const API = global.Pear.constructor

    const Client = require('pear-ipc/raw-client')

    const ipc = new Client({
      lock: API.CONSTANTS.PLATFORM_LOCK,
      socketPath: API.CONSTANTS.SOCKET_PATH,
      connectTimeout: API.CONSTANTS.CONNECT_TIMEOUT
    })
    global.Pear[API.IPC] = ipc

    ipc.ready()
      .then(() => ipc.identify({ startId: API.RTI.startId }), console.error) // TODO: have to identify for ipc.get to be valid
      .then(async () => {
        const buffer = await ipc.get({ key: '/node_modules/pear-electron/load.bundle' })
        const loader = Bundle.from(buffer)
        const prefix = pathToFileURL(API.RTI.ui)
        for (const o of Object.values(loader.resolutions)) {
          if (Object.hasOwn(o, 'require-addon') === false) continue
          for (const hosts of Object.values(o)) {
            const { platform, arch } = global.process
            if (Object.hasOwn(hosts, platform) === false) continue
            const prebuilds = hosts[platform]
            if (typeof prebuilds === 'string') hosts[platform] = prefix + hosts[platform]
            else hosts[platform][arch] = prefix + hosts[platform][arch]
          }
        }
        const load = evaluate(loader).exports
        const bundle = await load('file:///node_modules/pear-electron/electron-main.js')
        setImmediate(() => { // preserve unhandled exceptions so they don't become rejections
          evaluate(bundle)
        })
        electron.ipcMain.on('preload', async (evt) => {
          const bundle = await load('file:///node_modules/pear-electron/preload.js')
          evt.returnValue = bundle.toBuffer()
        })
      }, console.error)
      .finally(() => {
        const closing = ipc.close()
        closing.catch(console.error)
        return closing
      })

    break
  }
  default: throw Error('Unrecognized Environment')
}

function setup () {
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
  global.BOOT = require?.main?.filename // TODO put this on API (make sure it transfers to later API instance)
}

function applingPath () {
  const i = process.argv.indexOf('--appling')
  if (i === -1 || process.argv.length <= i + 1) return null
  return process.argv[i + 1]
}

function applingName () {
  const a = applingPath()
  if (!a) return null

  if (isMac) {
    const end = a.indexOf('.app')
    if (end === -1) return null
    const start = a.lastIndexOf('/', end) + 1
    return a.slice(start, end)
  }

  if (isWindows) {
    const name = a.slice(a.lastIndexOf('\\') + 1).replace(/\.exe$/i, '')
    return name || null
  }

  return null
}

function configureElectron () {
  const appName = applingName()
  if (appName) {
    process.title = appName
    electron.app.on('ready', () => { process.title = appName })
  }

  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

  /* c8 ignore start */
  const inspix = process.argv.indexOf('--inspector-port')
  if (inspix > -1) {
    electron.app.commandLine.appendSwitch('remote-debugging-port', inspix + 1)
  }
  /* c8 ignore stop */
  electron.protocol.registerSchemesAsPrivileged([
    { scheme: 'file', privileges: { secure: true, bypassCSP: true, corsEnabled: true, supportFetchAPI: true, allowServiceWorkers: true } }
  ])

  // TODO: Remove when issue https://github.com/electron/electron/issues/29458 is resolved.
  electron.app.commandLine.appendSwitch('disable-features', 'WindowCaptureMacV2')

  // Needed for running fully-local WebRTC proxies
  electron.app.commandLine.appendSwitch('allow-loopback-in-peer-connection')

  if (isLinux && process.env.XDG_SESSION_TYPE === 'wayland') {
    electron.app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,WaylandWindowDecorations')
    electron.app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
  }
}
