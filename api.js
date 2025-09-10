/* globals Pear */
'use strict'
const streamx = require('streamx')
const { EventEmitter } = require('events')

module.exports = (api) => {
  class API extends api {
    static UI = Symbol('ui')
    #ipc = null

    // These are v2 methods that we set to undefined so they cant be used
    // This is to prevent issues when we move the methods to modules later on
    run = undefined
    get pipe () { return undefined }
    get = undefined
    exists = undefined
    compare = undefined
    dump = undefined
    stage = undefined
    release = undefined
    info = undefined
    seed = undefined

    constructor (ipc, state, teardown, id) {
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
        desktopSources: (options = {}) => ipc.desktopSources(options),
        getPathForFile: (file) => ipc.getPathForFile(file)
      }

      class Found extends streamx.Readable {
        #id = null
        #stream = null
        #listener = (data) => {
          this.push(data.result)
        }

        constructor (id) {
          super()
          this.#id = id
          this.#stream = ipc.found(this.#id)
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
        constructor (id) {
          super()
          this.id = id
          ipc.receiveFrom(id, (...args) => {
            this.emit('message', ...args)
          })
        }

        async find (options) {
          const found = new Found(this.id)
          await ipc.find({ id: this.id, options })
          return found
        }

        send (...args) { return ipc.sendTo(this.id, ...args) }
        focus (options = null) { return ipc.parent({ act: 'focus', id: this.id, options }) }
        blur () { return ipc.parent({ act: 'blur', id: this.id }) }
        show () { return ipc.parent({ act: 'show', id: this.id }) }
        hide () { return ipc.parent({ act: 'hide', id: this.id }) }
        minimize () { return ipc.parent({ act: 'minimize', id: this.id }) }
        maximize () { return ipc.parent({ act: 'maximize', id: this.id }) }
        fullscreen () { return ipc.parent({ act: 'fullscreen', id: this.id }) }
        restore () { return ipc.parent({ act: 'restore', id: this.id }) }
        dimensions (options = null) { return ipc.parent({ act: 'dimensions', id: this.id, options }) }
        isVisible () { return ipc.parent({ act: 'isVisible', id: this.id }) }
        isMinimized () { return ipc.parent({ act: 'isMinimized', id: this.id }) }
        isMaximized () { return ipc.parent({ act: 'isMaximized', id: this.id }) }
        isFullscreen () { return ipc.parent({ act: 'isFullscreen', id: this.id }) }
        isClosed () { return ipc.parent({ act: 'isClosed', id: this.id }) }
      }

      class App {
        id = null
        #untray = null

        get parent () {
          const parentId = ipc.getParentId()
          Object.defineProperty(this, 'parent', { value: new Parent(parentId) })
          return this.parent
        }

        constructor (id) {
          this.id = id
          this.tray.scaleFactor = state.tray?.scaleFactor
          this.tray.darkMode = state.tray?.darkMode

          ipc.systemTheme().on('data', ({ mode }) => {
            this.tray.darkMode = mode === 'dark'
          })
        }

        find = (options) => {
          const found = new Found(this.id)
          ipc.find({ id: this.id, options })
          return found
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
        report = (rpt) => { return ipc.report(rpt) }
      }

      class GuiCtrl extends EventEmitter {
        #listener = null
        #unlisten = null

        static get parent () {
          if (!api.COMPAT) console.warn('Pear.Window.parent & Pear.View.parent are deprecated use ui.app.parent')
          return Pear[API.UI].app.parent
        }

        static get self () {
          if (!api.COMPAT) console.warn('Pear.Window.self & Pear.View.self are deprecated use ui.app')
          return Pear[API.UI].app
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
          const found = new Found(this.id)
          await ipc.find({ id: this.id, options })
          return found
        }

        send (...args) { return ipc.sendTo(this.id, ...args) }

        async open (opts) {
          if (this.id === null) {
            await new Promise(setImmediate) // needed for windows/views opening on app load
            this.#rxtx()
            this.id = await ipc.ctrl({
              parentId: Pear[API.UI].app.id,
              type: this.constructor[kGuiCtrl],
              entry: this.entry,
              options: this.options,
              state,
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
              'pear-constants': require('pear-constants')
            }
          }
        }
      }

      this[this.constructor.UI] = new PearElectron()
    }

    get tray () {
      if (!this.constructor.COMPAT) console.warn('Pear.tray is deprecated use require(\'pear-electron\').app.tray')
      return this[this.constructor.UI].app.tray
    }

    get badge () {
      if (!this.constructor.COMPAT) console.warn('Pear.badge is deprecated use require(\'pear-electron\').app.badge')
      return this[this.constructor.UI].app.badge
    }

    get media () {
      if (!this.constructor.COMPAT) console.warn('Pear.media is deprecated use require(\'pear-electron\').media')
      return this[this.constructor.UI].media
    }

    get Window () {
      if (!this.constructor.COMPAT) console.warn('Pear.Window is deprecated use require(\'pear-electron\').Window')
      return this[this.constructor.UI].Window
    }

    get View () {
      if (!this.constructor.COMPAT) console.warn('Pear.View is deprecated use require(\'pear-electron\').View')
      return this[this.constructor.UI].View
    }

    get worker () {
      if (!this.constructor.COMPAT) console.warn('[ DEPRECATED ] Pear.worker is deprecated and will be removed (use pear-run & pear-pipe)')
      const ipc = this.#ipc
      return new class DeprecatedWorker {
        #pipe = null
        run (link, args = []) {
          if (!this.constructor.COMPAT) console.warn('[ DEPRECATED ] Pear.worker.run() is now pear-run')
          return ipc.run(link, args)
        }

        pipe () {
          if (!this.constructor.COMPAT) console.warn('[ DEPRECATED ] Pear.worker.pipe() is now pear-pipe')
          if (this.#pipe !== null) return this.#pipe
          this.#pipe = ipc.pipe()
          return this.#pipe
        }
      }()
    }

    exit = (code) => {
      process.exitCode = code
      this.#ipc.exit(code)
    }
  }
  return API
}
