'use strict'
const { isElectron, isElectronRenderer, isElectronWorker } = require('which-runtime')
const rtiFlagIx = process.argv.indexOf('--rti')
const RTI = rtiFlagIx > -1 && process.argv[rtiFlagIx + 1]
const match = process.argv.find((s) => s.startsWith('--state='))
const state = RTI ? null : match ? JSON.parse(match.replace('--state=', '')) : null
const app = {}
class API {
  static RTI = RTI ? JSON.parse(RTI) : state?.rti // runtime information
  static get CONSTANTS() {
    return require('pear-constants')
  }
  app = app
  config = app
}
global.Pear = new API()

const BOOT_ELECTRON_MAIN = 1
const BOOT_ELECTRON_PRELOAD = 2

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

function getBootType() {
  if (isElectron) {
    return isElectronRenderer || isElectronWorker ? BOOT_ELECTRON_PRELOAD : BOOT_ELECTRON_MAIN
  }
}
