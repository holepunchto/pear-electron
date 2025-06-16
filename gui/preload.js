/* eslint-env browser */ /* globals Pear */
'use strict'
const streamx = require('streamx')
const { EventEmitter } = require('events')
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

    API = class extends API {
      static UI = Symbol('ui')
      #ipc = null
      #pipe = null

      constructor (ipc, state) {
        super(ipc, state, { teardown })
        this.#ipc = ipc
        const kGuiCtrl = Symbol('gui:ctrl')
        const media = {
          status: {
            microphone: () => ipc.getMediaAccessStatus({ id, media: 'microphone' }),
            camera: () => ipc.getMediaAccessStatus({ id, media: 'camera' }),
            screen: () => ipc.getMediaAccessStatus({ id, media: 'screen' })
          },
          access: {
            microphone: () => ipc.askForMediaAccess({ id, media: 'microphone' }),
            camera: () => ipc.askForMediaAccess({ id, media: 'camera' }),
            screen: () => ipc.askForMediaAccess({ id, media: 'screen' })
          },
          desktopSources: (options = {}) => ipc.desktopSources(options)
        }

        class Parent extends EventEmitter {
          #id
          constructor (id) {
            super()
            this.#id = id
            ipc.receiveFrom(id, (...args) => {
              this.emit('message', ...args)
            })
          }

          async find (options) {
            const rid = await ipc.find({ id: this.#id, options })
            return ipc.found(rid)
          }

          send (...args) { return ipc.sendTo(this.#id, ...args) }
          focus (options = null) { return ipc.parent({ act: 'focus', id: this.#id, options }) }
          blur () { return ipc.parent({ act: 'blur', id: this.#id }) }
          show () { return ipc.parent({ act: 'show', id: this.#id }) }
          hide () { return ipc.parent({ act: 'hide', id: this.#id }) }
          minimize () { return ipc.parent({ act: 'minimize', id: this.#id }) }
          maximize () { return ipc.parent({ act: 'maximize', id: this.#id }) }
          fullscreen () { return ipc.parent({ act: 'fullscreen', id: this.#id }) }
          restore () { return ipc.parent({ act: 'restore', id: this.#id }) }
          dimensions (options = null) { return ipc.parent({ act: 'dimensions', id: this.#id, options }) }
          isVisible () { return ipc.parent({ act: 'isVisible', id: this.#id }) }
          isMinimized () { return ipc.parent({ act: 'isMinimized', id: this.#id }) }
          isMaximized () { return ipc.parent({ act: 'isMaximized', id: this.#id }) }
          isFullscreen () { return ipc.parent({ act: 'isFullscreen', id: this.#id }) }
          isClosed () { return ipc.parent({ act: 'isClosed', id: this.#id }) }
        }

        class App {
          id = null
          #untray = null
          constructor (id) {
            this.id = id
            this.tray.scaleFactor = state.tray?.scaleFactor
            this.tray.darkMode = state.tray?.darkMode

            ipc.systemTheme().on('data', ({mode}) => {
              this.tray.darkMode = mode === 'dark'
            })
          }

          find = async (options) => {
            const rid = await ipc.find({ id: this.id, options })
            return ipc.found(rid)
          }

          badge = (count) => {
            if (!Number.isInteger(+count)) throw new Error('argument must be an integer')
            return ipc.badge({ id: this.id, count })
          }

          tray = async (opts = {}, listener) => {
            opts = {
              ...opts,
              menu: opts.menu ?? {
                show: `Show ${state.name}`,
                quit: 'Quit'
              }
            }
            listener = listener ?? ((key) => {
              if (key === 'click' || key === 'show') {
                this.show()
                this.focus({ steal: true })
                return
              }
              if (key === 'quit') {
                this.quit()
              }
            })

            const untray = async () => {
              if (this.#untray) {
                await this.#untray()
                this.#untray = null
              }
            }

            await untray()
            this.#untray = ipc.tray(opts, listener)
            return untray
          }

          focus = (options = null) => { return ipc.focus({ id: this.id, options }) }
          blur = () => { return ipc.blur({ id: this.id }) }
          show = () => { return ipc.show({ id: this.id }) }
          hide = () => { return ipc.hide({ id: this.id }) }
          minimize = () => { return ipc.minimize({ id: this.id }) }
          maximize = () => { return ipc.maximize({ id: this.id }) }
          fullscreen = () => { return ipc.fullscreen({ id: this.id }) }
          restore = () => { return ipc.restore({ id: this.id }) }
          close = () => { return ipc.close({ id: this.id }) }
          quit = () => { return ipc.quit({ id: this.id }) }
          dimensions (options = null) { return ipc.dimensions({ id: this.id, options }) }
          isVisible = () => { return ipc.isVisible({ id: this.id }) }
          isMinimized = () => { return ipc.isMinimized({ id: this.id }) }
          isMaximized = () => { return ipc.isMaximized({ id: this.id }) }
          isFullscreen = () => { return ipc.isFullscreen({ id: this.id }) }
        }

        class GuiCtrl extends EventEmitter {
          #listener = null
          #unlisten = null

          static get parent () {
            Object.defineProperty(this, 'parent', {
              value: new Parent(ipc.getParentId())
            })
            return this.parent
          }

          static get self () {
            console.warn('Pear.Window.self & Pear.View.self are deprecated use require(\'pear-electron\').app')
            return Pear[Pear.constructor.UI].app
          }

          constructor (entry, at, options = at) {
            super()
            if (options === at) {
              if (typeof at === 'string') options = { at }
            }
            if (!entry) throw new Error(`No path provided, cannot open ${this.constructor[kGuiCtrl]}`)
            this.entry = entry
            this.options = options
            this.id = null
          }

          #rxtx () {
            this.#listener = (e, ...args) => this.emit('message', ...args)
            this.#unlisten = ipc.receiveFrom(this.#listener)
          }

          #unrxtx () {
            if (this.#unlisten === null) return
            this.#unlisten()
            this.#unlisten = null
            this.#listener = null
          }

          find = async (options) => {
            const rid = await ipc.find({ id: this.id, options })
            return ipc.found(rid)
          }

          send (...args) { return ipc.sendTo(this.id, ...args) }

          async open (opts) {
            if (this.id === null) {
              await new Promise(setImmediate) // needed for windows/views opening on app load
              this.#rxtx()
              this.id = await ipc.ctrl({
                parentId: Pear[Pear.constructor.UI].app.id,
                type: this.constructor[kGuiCtrl],
                entry: this.entry,
                options: this.options,
                state: this.state,
                openOptions: opts
              })
              return true
            }
            return await ipc.open({ id: this.id })
          }

          async close () {
            const result = await ipc.close({ id: this.id })
            this.#unrxtx()
            this.id = null
            return result
          }

          show () { return ipc.show({ id: this.id }) }
          hide () { return ipc.hide({ id: this.id }) }
          focus (options = null) { return ipc.focus({ id: this.id, options }) }
          blur () { return ipc.blur({ id: this.id }) }

          dimensions (options = null) { return ipc.dimensions({ id: this.id, options }) }
          minimize () {
            if (this.constructor[kGuiCtrl] === 'view') throw new Error('A View cannot be minimized')
            return ipc.minimize({ id: this.id })
          }

          maximize () {
            if (this.constructor[kGuiCtrl] === 'view') throw new Error('A View cannot be maximized')
            return ipc.maximize({ id: this.id })
          }

          fullscreen () {
            if (this.constructor[kGuiCtrl] === 'view') throw new Error('A View cannot be fullscreened')
            return ipc.fullscreen({ id: this.id })
          }

          restore () { return ipc.restore({ id: this.id }) }

          isVisible () { return ipc.isVisible({ id: this.id }) }

          isMinimized () {
            if (this.constructor[kGuiCtrl] === 'view') throw new Error('A View cannot be minimized')
            return ipc.isMinimized({ id: this.id })
          }

          isMaximized () {
            if (this.constructor[kGuiCtrl] === 'view') throw new Error('A View cannot be maximized')
            return ipc.isMaximized({ id: this.id })
          }

          isFullscreen () {
            if (this.constructor[kGuiCtrl] === 'view') throw new Error('A View cannot be maximized')
            return ipc.isFullscreen({ id: this.id })
          }

          isClosed () { return ipc.isClosed({ id: this.id }) }
        }

        class Window extends GuiCtrl {
          static [kGuiCtrl] = 'window'
        }

        class View extends GuiCtrl { static [kGuiCtrl] = 'view' }

        class PearElectron {
          Window = Window
          View = View
          media = media
          #app = null
          get app () {
            if (this.#app) return this.#app
            this.#app = new App(ipc.getId())
            return this.#app
          }

          warming () { return ipc.warming() }

          async get (key) {
            return Buffer.from(await ipc.get(key)).toString('utf-8')
          }

          constructor () {
            if (state.isDecal) {
              this.constructor.DECAL = {
                ipc,
                'hypercore-id-encoding': require('hypercore-id-encoding'),
                'pear-api/constants': require('pear-api/constants')
              }
            }
          }
        }

        this[this.constructor.UI] = new PearElectron()
      }

      get media () {
        console.warn('Pear.media is deprecated use require(\'pear-electron\').media')
        return this[this.constructor.UI].media
      }

      get Window () {
        console.warn('Pear.Window is deprecated use require(\'pear-electron\').Window')
        return this[this.constructor.UI].Window
      }

      get View () {
        console.warn('Pear.View is deprecated use require(\'pear-electron\').View')
        return this[this.constructor.UI].View
      }

      run (link, args = []) { return this.#ipc.run(link, args) }

      get pipe () {
        if (this.#pipe !== null) return this.#pipe
        this.#pipe = this.#ipc.pipe()
        return this.#pipe
      }

      exit = (code) => {
        process.exitCode = code
        this.ipc.processExit(code)
      }
    }
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
  quit (...args) { return electron.ipcRenderer.invoke('quit', ...args) }
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
  find (...args) { return electron.ipcRenderer.invoke('find', ...args) }
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

  sendTo (id, ...args) { return electron.ipcRenderer.send('send-to', id, ...args) }
  receiveFrom (fn) {
    electron.ipcRenderer.on('send', fn)
    return () => electron.ipcRenderer.removeListener('send', fn)
  }

  getId () { return electron.ipcRenderer.sendSync('id') }
  getParentId () { return electron.ipcRenderer.sendSync('parentId') }
  processExit (code) { return electron.ipcRenderer.sendSync('process-exit', code) }

  found (args) { return new Stream('found', args) }  
  systemTheme () { return new Stream('system-theme') }
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
