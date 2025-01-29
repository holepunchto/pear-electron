'use strict'

/* global Pear */
/* eslint-env node, browser */
module.exports = (state) => {
  if (!process.isMainFrame) return
  const electron = require('electron')
  const timers = require('timers')
  const { isMac, isWindows, platform } = require('which-runtime')
  const API = require('pear-api')
  const GUI = require('./gui')
  const { parentWcId, env, id, runtimeInfo, ...config } = state
  const isDecal = state.isDecal || false
  if (config.key?.type === 'Buffer') config.key = Buffer.from(config.key.data)
  const dir = config.dir
  state.config = config
  process.chdir(dir)
  if (config.fragment) history.replaceState(null, null, '#' + config.fragment)

  const gui = new GUI({ API, state })
  window.Pear = gui.api
  const PearElectron = Pear[Pear.constructor.UI]

  if (isDecal === false) Object.assign(process.env, env)

  {
    const { setTimeout, clearTimeout, setImmediate, clearImmediate, setInterval, clearInterval } = timers
    global.setTimeout = setTimeout
    global.clearTimeout = clearTimeout
    global.setImmediate = setImmediate
    global.clearImmediate = clearImmediate
    global.setInterval = setInterval
    global.clearInterval = clearInterval
  }

  if (isDecal) {
    electron.ipcRenderer.once('exit', (e, code) => { Pear.exit(code) })
  } else {
    process.once('exit', (code) => {
      const actuallyARefresh = code === undefined
      if (actuallyARefresh) return
      electron.ipcRenderer.send('send-to', parentWcId, 'exit', code)
    })
  }

  function descopeGlobals () {
    delete global.require
    delete global.module
    delete global.__dirname
    delete global.__filename
  }

  const { warn } = console
  console.warn = (msg, ...args) => {
    if (/Insecure Content-Security-Policy/.test(msg)) return
    warn.call(console, msg, ...args)
  }

  if (Pear.config.options.gui?.preload) {
    const run = require('node-bare-bundle')
    const key = Pear.config.options.gui.preload
    Pear.get({ key, bundle: true }).then((preload) => {
      run(preload, { mount: '/', entrypoint: key })
    }, console.error).finally(descopeGlobals)
  } else {
    descopeGlobals()
  }

  customElements.define('pear-ctrl', class extends HTMLElement {
    #onfocus = null
    #onblur = null
    #demax = null
    #closing = null
    get closing () {
      return this.#closing === null ? Promise.resolve() : this.#closing
    }

    static get observedAttributes () {
      return ['data-minimizable', 'data-maximizable']
    }

    attributeChangedCallback (name) {
      if (name.startsWith('data-') === false) return
      if (name === 'data-minimizable') {
        this.#setMinimizable(strToBool(this.dataset.minimizable))
      }
      if (name === 'data-maximizable') {
        this.#setMaximizable(strToBool(this.dataset.maximizable))
      }
    }

    async #maclights (visible) {
      await gui.ipc.setWindowButtonVisibility({ id: gui.id, visible })
      const { x, y } = this.root.querySelector('#ctrl').getBoundingClientRect()
      await gui.ipc.setWindowButtonPosition({ id: gui.id, point: { x, y: y - 6 } })
    }

    connectedCallback () {
      this.dataset.platform = platform
      if (isMac) {
        this.#maclights(true).catch(console.error)
        this.mutations = new MutationObserver(async () => {
          const { x, y } = this.root.querySelector('#ctrl').getBoundingClientRect()
          await gui.ipc.setWindowButtonPosition({ id: gui.id, point: { x, y: y - 6 } })
        })
        this.mutations.observe(this, { attributes: true })

        this.intesections = new IntersectionObserver(([element]) => this.#maclights(element.isIntersecting), { threshold: 0 })

        this.intesections.observe(this)
        this.#setCtrl()
        return
      }
      const min = this.root.querySelector('#min')
      const max = this.root.querySelector('#max')
      const restore = this.root.querySelector('#restore')
      const close = this.root.querySelector('#close')

      max.addEventListener('click', this.#max)
      min.addEventListener('click', this.#min)

      if (restore) restore.addEventListener('click', this.#restore)
      close.addEventListener('click', this.#close)
      window.addEventListener('focus', this.#onfocus)
      window.addEventListener('blur', this.#onblur)
      window.addEventListener('mouseover', (e) => {
        const x = e.clientX
        const y = e.clientY
        if (document.elementFromPoint(x, y) === this) this.#onfocus()
      })

      this.#setCtrl()
    }

    async #setCtrl () {
      if (this.dataset.minimizable !== undefined) this.#setMinimizable(strToBool(this.dataset.minimizable))
      if (this.dataset.maximizable !== undefined) this.#setMaximizable(strToBool(this.dataset.maximizable))
    }

    async #setMaximizable (value) {
      if (!isMac) {
        this.root.querySelector('#max').style.display = value ? 'inline' : 'none'
      } else {
        await gui.ipc.setMaximizable({ id: gui.id, value: !!value })
      }
    }

    async #setMinimizable (value) {
      if (!isMac) {
        this.root.querySelector('#min').style.display = value ? 'inline' : 'none'
      } else {
        await gui.ipc.setMinimizable({ id: gui.id, value: !!value })
      }
    }

    disconnectedCallback () {
      if (isMac) {
        this.mutations.disconnect()
        this.intesections.disconnect()
        this.#closing = gui.ipc.setWindowButtonVisibility({ id: gui.id, visible: false })
        return
      }

      const min = this.root.querySelector('#min')
      const max = this.root.querySelector('#max')
      const restore = this.root.querySelector('#restore')
      const close = this.root.querySelector('#close')
      min.removeEventListener('click', this.#min)
      max.removeEventListener('click', this.#max)
      if (restore) restore.removeEventListener('click', this.#restore)
      close.removeEventListener('click', this.#close)
      window.removeEventListener('focus', this.#onfocus)
      window.removeEventListener('blur', this.#onblur)
    }

    constructor () {
      super()
      this.template = document.createElement('template')
      this.template.innerHTML = isWindows ? this.#win() : (isMac ? this.#mac() : this.#gen())
      this.root = this.attachShadow({ mode: 'open' })
      this.root.appendChild(this.template.content.cloneNode(true))
      this.#onfocus = () => this.root.querySelector('#ctrl').classList.add('focused')
      this.#onblur = () => this.root.querySelector('#ctrl').classList.remove('focused')
      this.#demax = () => this.root.querySelector('#ctrl').classList.remove('max')
    }

    async #min () { await PearElectron.Window.self.minimize() }
    async #max (e) {
      if (isMac) await PearElectron.Window.self.fullscreen()
      else await PearElectron.Window.self.maximize()
      e.target.root.querySelector('#ctrl').classList.add('max')
    }

    async #restore (e) {
      await PearElectron.Window.self.restore()
      e.target.root.querySelector('#ctrl').classList.remove('max')
    }

    async #close () { await PearElectron.Window.self.close() }
    #win () {
      return `
    <style>
      #ctrl {
        user-select: none;
        -webkit-app-region: no-drag;
        display: table-row;
        float: right;
        margin-left: .6em;
        margin-top: 0.22em;
        border-spacing: 0.3em 0;
      }
      #ctrl > .ctrl {
        opacity: 0.8;
        height: 24px;
        width: 36px;
        display: table-cell;
        vertical-align: middle;
        text-align: center;

      }
      #ctrl > .ctrl:hover {
        opacity: 1;
      }
      .max #max  {
        display: none;
      }
      #restore.ctrl  {
        display: none;
      }
      .max #restore.ctrl  {
        display: table-cell;
      }
      #min {
        padding-bottom: 4px;
      }
    </style>
    <div id="ctrl">
      <div id="min" class="ctrl">
        <svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="10" height="1" fill="white"/>
        </svg>
      </div>
      <div id="max" class="ctrl">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M9 1H1V9H9V1ZM0 0V10H10V0H0Z" fill="white"/>
        </svg>
      </div>
      <div id="restore" class="ctrl">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3 1H9V7H8V8H9H10V7V1V0H9H3H2V1V2H3V1Z" fill="white"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M7 3H1V9H7V3ZM0 2V10H8V2H0Z" fill="white"/>
        </svg>
      </div>
      <div id="close" class="ctrl">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M4.64645 5.35355L0 0.707107L0.707107 0L5.35355 4.64645L10 0L10.7071 0.707107L6.06066 5.35355L10.7071 10L10 10.7071L5.35355 6.06066L0.707107 10.7071L0 10L4.64645 5.35355Z" fill="white"/>
        </svg>
      </div>
    </div>
    `
    }

    #mac () {
      return `
      <style>:host {display: block;}</style>
      <div id=ctrl></div>
      `
    }

    #gen () {
      // linux uses frame atm
      return `
        <style>
          #ctrl {
            user-select: none;
            -webkit-app-region: no-drag;
            display: flex;
            float: right;
            margin-left: .6em;
            margin-top: 0.8em;
            border-spacing: 0.3em 0;
            margin-right: .9em;
          }
          #ctrl > .ctrl {
            opacity: 0.8;
            height: 24px;
            width: 24px;
            display: table-cell;
            vertical-align: middle;
            text-align: center;
            margin-left: .9em;
          }
          #ctrl > .ctrl:hover {
            opacity: 1;
          }
          .max #max  {
            display: none;
          }
          #restore.ctrl  {
            display: none;
          }
          .max #restore.ctrl  {
            display: table-cell;
          }
          svg {
            width: 1em;
            height: 1em;
          }
          #titlebar{
            -webkit-app-region: drag;
            width: 100%;
            height: 50px;
          }
        </style>
        <div id="titlebar">
          <div id="ctrl">
            <div id="min" class="ctrl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12.998H5V10.998H19V12.998Z" fill="white"/>
              </svg>
            </div>
            <div id="max" class="ctrl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" stroke="white" stroke-width="2"/>
              </svg>
            </div>
            <div id="restore" class="ctrl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_9105_112084)">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M8.11108 6H17.2222V15.1111H19.2222V5V4H18.2222H8.11108V6ZM6 10.3333H12.8889V17.2222H6V10.3333ZM4 8.33333H6H12.8889H14.8889V10.3333V17.2222V19.2222H12.8889H6H4V17.2222V10.3333V8.33333Z" fill="white"/>
                </g>
                <defs>
                  <clipPath id="clip0_9105_112084">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div id="close" class="ctrl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z" fill="white"/>
              </svg>
            </div>
          </div>
        </div>
      `
    }
  })
}

function strToBool (str) { return str === 'true' }
