/* globals Pear */
'use strict'
const streamx = require('streamx')
const { EventEmitter } = require('events')
const noop = () => {}
class Worker extends require('pear-api/worker') {
  #ipc = null
  constructor ({ ref = noop, unref = noop, ipc } = {}) {
    super({ ref, unref })
    this.#ipc = ipc
  }

  run (link, args = []) { return this.#ipc.run(link, args) }

  pipe () { return this.#ipc.pipe() }
}

module.exports = (api) => {
  class API extends api {
    static UI = Symbol('ui')

    #untray

    constructor (ipc, state, teardown) {
      const worker = new Worker({ ipc })
      super(ipc, state, { teardown, worker })
      this[Symbol.for('pear.ipc')] = ipc
      const kGuiCtrl = Symbol('gui:ctrl')
      const id = ipc.getId()
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

      this.tray.scaleFactor = state.tray?.scaleFactor
      this.tray.darkMode = state.tray?.darkMode

      ipc.trayDarkMode().on('data', (data) => {
        this.tray.darkMode = data
      })

      ipc.appFound().on('data', (result) => {
        this.message({ type: 'pear-electron/app/found', rid: result.requestId, result })
      })

      class Found extends streamx.Readable {
        #id = null
        #rid = null
        #stream = null
        #listener = (data) => {
          this.push(data.result)
        }

        constructor (rid, id) {
          super()
          this.#rid = rid
          this.#id = id
          this.#stream = this.messages({ type: 'pear-electron/app/found', rid: this.#rid })
          this.#stream.on('data', this.#listener)
        }

        proceed () {
          return ipc.find({ id: this.#id, next: true })
        }

        clear () {
          if (this.destroyed) throw Error('Nothing to clear, already destroyed')
          return ipc.find({ id: this.#id, stop: 'clear' }).finally(() => this.destroy())
        }

        keep () {
          if (this.destroyed) throw Error('Nothing to keep, already destroyed')
          return ipc.find({ id: this.#id, stop: 'keep' }).finally(() => this.destroy())
        }

        activate () {
          if (this.destroyed) throw Error('Nothing to activate, already destroyed')
          return ipc.find({ id: this.#id, stop: 'activate' }).finally(() => this.destroy())
        }

        _destroy () {
          this.#stream.destroy()
          return this.clear()
        }
      }

      class Parent extends EventEmitter {
        #id
        #messageStream
        constructor (id) {
          super()
          this.#id = id
          this.#messageStream = ipc.messageStream(id)
          this.#messageStream.on('data', (args) => {
            this.emit('message', ...args)
          })
        }

        async find (options) {
          const rid = await ipc.find({ id: this.#id, options })
          return new Found(rid, this.#id)
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
        constructor (id) { this.id = id }
        async find (options) {
          const rid = await ipc.find({ id: this.id, options })
          return new Found(rid, this.id)
        }

        focus (options = null) { return ipc.focus({ id: this.id, options }) }
        blur () { return ipc.blur({ id: this.id }) }
        show () { return ipc.show({ id: this.id }) }
        hide () { return ipc.hide({ id: this.id }) }
        minimize () { return ipc.minimize({ id: this.id }) }
        maximize () { return ipc.maximize({ id: this.id }) }
        fullscreen () { return ipc.fullscreen({ id: this.id }) }
        restore () { return ipc.restore({ id: this.id }) }
        close () { return ipc.close({ id: this.id }) }
        quit () { return ipc.quit({ id: this.id }) }
        dimensions (options = null) { return ipc.dimensions({ id: this.id, options }) }
        isVisible () { return ipc.isVisible({ id: this.id }) }
        isMinimized () { return ipc.isMinimized({ id: this.id }) }
        isMaximized () { return ipc.isMaximized({ id: this.id }) }
        isFullscreen () { return ipc.isFullscreen({ id: this.id }) }
      }

      class GuiCtrl extends EventEmitter {
        #listener = null
        #messageStream = null

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
          this.#listener = (...args) => this.emit('message', ...args)
          this.#messageStream = ipc.messageStream(this.id)
          this.#messageStream.on('data', this.#listener)
        }

        #unrxtx () {
          if (this.#messageStream) {
            this.#messageStream.destroy()
            this.#messageStream = null
          }
          this.#listener = null
        }

        async find (options) {
          const rid = await ipc.find({ id: this.id, options })
          return new Found(rid, this.id)
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

        badge = (count) => {
          if (!Number.isInteger(+count)) throw new Error('argument must be an integer')
          return ipc.badge({ id, count })
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

    tray = async (opts = {}, listener) => {
      const ipc = this[Symbol.for('pear.ipc')]
      opts = {
        ...opts,
        menu: opts.menu ?? {
          show: `Show ${this.state.name}`,
          quit: 'Quit'
        }
      }
      listener = listener ?? ((key) => {
        if (key === 'click' || key === 'show') {
          Pear[Pear.constructor.UI].app.show()
          Pear[Pear.constructor.UI].app.focus({ steal: true })
          return
        }
        if (key === 'quit') {
          Pear[Pear.constructor.UI].app.quit()
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

    exit = (code) => {
      process.exitCode = code
      this.ipc.exit(code)
    }
  }

  return API
}
