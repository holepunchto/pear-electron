/* eslint-env browser */
'use strict'
const api = require('../api')
const streamx = require('streamx')
const Iambus = require('iambus')
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

class IPC {
  getMediaAccessStatus (...args) { return electron.ipcRenderer.invoke('getMediaAccessStatus', ...args) }
  askForMediaAccess (...args) { return electron.ipcRenderer.invoke('askForMediaAccess', ...args) }
  desktopSources (...args) { return electron.ipcRenderer.invoke('desktopSources', ...args) }
  chrome (...args) { return electron.ipcRenderer.invoke('chrome', ...args) }
  ctrl (...args) { return electron.ipcRenderer.invoke('ctrl', ...args) }
  parent (...args) { return electron.ipcRenderer.invoke('parent', ...args) }
  open (...args) { return electron.ipcRenderer.invoke('open', ...args) }
  close (...args) { return electron.ipcRenderer.invoke('close', ...args) }
  show (...args) { return electron.ipcRenderer.invoke('show', ...args) }
  hide (...args) { return electron.ipcRenderer.invoke('hide', ...args) }
  minimize (...args) { return electron.ipcRenderer.invoke('minimize', ...args) }
  maximize (...args) { return electron.ipcRenderer.invoke('maximize', ...args) }
  setMaximizable (...args) { return electron.ipcRenderer.invoke('setMaximizable', ...args) }
  setMinimizable (...args) { return electron.ipcRenderer.invoke('setMinimizable', ...args) }
  fullscreen (...args) { return electron.ipcRenderer.invoke('fullscreen', ...args) }
  restore (...args) { return electron.ipcRenderer.invoke('restore', ...args) }
  focus (...args) { return electron.ipcRenderer.invoke('focus', ...args) }
  blur (...args) { return electron.ipcRenderer.invoke('blur', ...args) }
  dimensions (...args) { return electron.ipcRenderer.invoke('dimensions', ...args) }
  isVisible (...args) { return electron.ipcRenderer.invoke('isVisible', ...args) }
  isClosed (...args) { return electron.ipcRenderer.invoke('isClosed', ...args) }
  isMinimized (...args) { return electron.ipcRenderer.invoke('isMinimized', ...args) }
  isMaximized (...args) { return electron.ipcRenderer.invoke('isMaximized', ...args) }
  isFullscreen (...args) { return electron.ipcRenderer.invoke('isFullscreen', ...args) }
  setSize (...args) { return electron.ipcRenderer.invoke('setSize', ...args) }
  permit (...args) { return electron.ipcRenderer.invoke('permit', ...args) }
  unloading (...args) { return electron.ipcRenderer.invoke('unloading', ...args) }
  completeUnload (...args) { return electron.ipcRenderer.invoke('completeUnload', ...args) }
  attachMainView (...args) { return electron.ipcRenderer.invoke('attachMainView', ...args) }
  detachMainView (...args) { return electron.ipcRenderer.invoke('detachMainView', ...args) }
  afterViewLoaded (...args) { return electron.ipcRenderer.invoke('afterViewLoaded', ...args) }
  setWindowButtonPosition (...args) { return electron.ipcRenderer.invoke('setWindowButtonPosition', ...args) }
  setWindowButtonVisibility (...args) { return electron.ipcRenderer.invoke('setWindowButtonVisibility', ...args) }
  async requestIdentity (...args) {
    const publicKey = await electron.ipcRenderer.invoke('requestIdentity', ...args)
    return Buffer.from(publicKey)
  }

  shareIdentity (...args) { return electron.ipcRenderer.invoke('shareIdentity', ...args) }
  clearIdentity (...args) { return electron.ipcRenderer.invoke('clearIdentity', ...args) }
  message (...args) { return electron.ipcRenderer.invoke('message', ...args) }
  checkpoint (...args) { return electron.ipcRenderer.invoke('checkpoint', ...args) }
  versions (...args) { return electron.ipcRenderer.invoke('versions', ...args) }
  updated (...args) { return electron.ipcRenderer.invoke('updated', ...args) }
  restart (...args) { return electron.ipcRenderer.invoke('restart', ...args) }
  get (...args) { return electron.ipcRenderer.invoke('get', ...args) }
  exists (...args) { return electron.ipcRenderer.invoke('exists', ...args) }
  compare (...args) { return electron.ipcRenderer.invoke('compare', ...args) }
  badge (...args) { return electron.ipcRenderer.invoke('badge', ...args) }

  tray (opts, listener) {
    electron.ipcRenderer.on('tray', (e, data) => { listener(data, opts, listener) })
    electron.ipcRenderer.send('tray', opts)
    return () => {
      electron.ipcRenderer.removeAllListeners('tray')
      return electron.ipcRenderer.invoke('untray')
    }
  }

  messages (pattern) {
    electron.ipcRenderer.send('messages', pattern)
    const bus = new Iambus()
    electron.ipcRenderer.on('messages', (e, msg) => {
      if (msg === null) bus.end()
      else bus.pub(msg)
    })
    const stream = bus.sub(pattern)
    return stream
  }

  messageStream (id) {
    const stream = new streamx.Readable({ read () {} })
    electron.ipcRenderer.on('send', (e, targetId, ...args) => {
      if (targetId === id) stream.push(args)
    })
    return stream
  }

  sendTo (id, ...args) { return electron.ipcRenderer.send('send-to', id, ...args) }

  getId () { return electron.ipcRenderer.sendSync('id') }
  getParentId () { return electron.ipcRenderer.sendSync('parentId') }
  exit (code) { return electron.ipcRenderer.sendSync('exit', code) }

  trayDarkMode () { return new Stream('tray/darkMode') }
  appFound () { return new Stream('app/found') }
  warming () { return new Stream('warming') }
  reports () { return new Stream('reports') }
  run (link, args) { return new Stream('run', link, args) }
  pipe () { return new Stream('pipe') }
  asset (opts = {}) { return new Stream('asset', opts) }
  dump (opts = {}) { return new Stream('dump', opts) }
  stage (opts = {}) { return new Stream('stage', opts) }
  release (opts = {}) { return new Stream('release', opts) }
  info (opts = {}) { return new Stream('info', opts) }
  seed (opts = {}) { return new Stream('seed', opts) }

  ref () {}
  unref () {}
}

class Stream extends streamx.Duplex {
  #id = null
  #method = null
  #guard (fn) {
    return (evt, id, ...args) => {
      if (id !== this.#id) return
      fn(...args)
    }
  }

  constructor (method, ...args) {
    super()
    this.#method = method
    this.#id = electron.ipcRenderer.sendSync('streamId')
    electron.ipcRenderer.send(this.#method, ...args)
    electron.ipcRenderer.on('streamError', this.#guard((stack) => {
      this.destroy(new Error('Stream Error (from electron-main): ' + stack))
    }))
    electron.ipcRenderer.on('streamClose', this.#guard(() => this.destroy()))
    electron.ipcRenderer.on('streamEnd', this.#guard(() => this.end()))
    electron.ipcRenderer.on('streamData', this.#guard((data) => { this.push(data) }))

    this.once('close', () => { electron.ipcRenderer.send('streamClose', this.#id) })
  }

  _write (data, cb) {
    electron.ipcRenderer.send('streamWrite', this.#id, data)
    cb()
  }

  _final (cb) {
    electron.ipcRenderer.send('streamEnd', this.#id)
    cb()
  }
}
