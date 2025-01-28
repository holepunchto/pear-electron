/** @typedef {import('pear-interface')} */
'use strict'
const { isElectron, isElectronRenderer, isElectronWorker, isWindows } = require('which-runtime')
const BOOT_ELECTRON_MAIN = 1
const BOOT_ELECTRON_PRELOAD = 2
const rtix = process.argv.indexOf('--runtime-info')
const rti = rtix > -1 && process.argv[rtix + 1]
const state = rti ? null : JSON.parse(process.argv.slice(isWindows ? -2 : -1)[0])
const RUNTIME_INFO = rti ? JSON.parse(rti) : state.runtimeInfo

class API {
  static CHECKOUT = RUNTIME_INFO.checkout
  static MOUNT = RUNTIME_INFO.mount
  static get CONSTANTS () { return require('pear-api/constants') }
  config = {}
}
global.Pear = new API()

switch (getBootType()) {
  case BOOT_ELECTRON_MAIN: {
    require('./electron-main.js')
    break
  }
  case BOOT_ELECTRON_PRELOAD: {
    require('./preload.js')(state)
    break
  }
}

function getBootType () {
  if (isElectron) {
    return (isElectronRenderer || isElectronWorker)
      ? BOOT_ELECTRON_PRELOAD
      : BOOT_ELECTRON_MAIN
  }
}
