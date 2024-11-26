/** @typedef {import('pear-interface')} */
'use strict'
const { isElectron, isElectronRenderer, isElectronWorker } = require('which-runtime')
const BOOT_ELECTRON_MAIN = 1
const BOOT_ELECTRON_PRELOAD = 2
switch (getBootType()) {
  case BOOT_ELECTRON_MAIN: {
    require('./electron-main.js')
    break
  }
  case BOOT_ELECTRON_PRELOAD: {
    require('./preload.js')
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
