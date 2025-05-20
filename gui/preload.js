/* eslint-env browser */
'use strict'
const IPC = require('./ipc')
const api = require('../api')
const electron = require('electron')

module.exports = class PearGUI {
  constructor ({ API, state }) {
    const id = this.id = electron.ipcRenderer.sendSync('id')

    this.ipc = new IPC()
    electron.ipcRenderer.on('ipc', (e, data) => {
      this.ipc.stream.push(Buffer.from(data))
    })

    const teardown = async (fn) => {
      if (state.isDecal) return
      const action = await this.ipc.unloading({ id }) // only resolves when unloading occurs
      await fn()
      await this.ipc.completeUnload({ id, action })
      if (action.type === 'reload') location.reload()
      else if (action.type === 'nav') location.href = action.url
    }

    API = api(API)
    this.api = new API(this.ipc, state, teardown)
  }
}
