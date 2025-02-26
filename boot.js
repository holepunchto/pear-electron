/** @typedef {import('pear-interface')} */
'use strict'
const s = require('sodium-native')
console.log(s)
// const { isElectron, isElectronRenderer, isElectronWorker, isWindows } = require('which-runtime')
// const BOOT_ELECTRON_MAIN = 1
// const BOOT_ELECTRON_PRELOAD = 2
// const rtiFlagIx = process.argv.indexOf('--rti')
// const RTI = rtiFlagIx > -1 && process.argv[rtiFlagIx + 1]
// const state = RTI ? null : JSON.parse(process.argv.slice(isWindows ? -2 : -1)[0])

// class API {
//   static RTI = RTI ? JSON.parse(RTI) : state.rti
//   static get CONSTANTS () { return require('pear-api/constants') }
//   config = {}
// }
// global.Pear = new API()

// switch (getBootType()) {
//   case BOOT_ELECTRON_MAIN: {
//     require('./electron-main.js')
//     break
//   }
//   case BOOT_ELECTRON_PRELOAD: {
//     require('./preload.js')(state)
//     break
//   }
// }

// function getBootType () {
//   if (isElectron) {
//     return (isElectronRenderer || isElectronWorker)
//       ? BOOT_ELECTRON_PRELOAD
//       : BOOT_ELECTRON_MAIN
//   }
// }
