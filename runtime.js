/** @typedef {import('pear-interface')} */ /* global Pear */
'use strict'
const fs = require('bare-fs')
const os = require('bare-os')
const path = require('bare-path')
const { spawn } = require('bare-subprocess')
const env = require('bare-env')
const { command } = require('paparam')
const { isLinux, isWindows, isMac } = require('which-runtime')
const { pathToFileURL } = require('url-file-url')
const constants = require('pear-constants')
const plink = require('pear-link')
const Logger = require('pear-logger')
const { ERR_INVALID_APPLING, ERR_INVALID_PROJECT_DIR, ERR_INVALID_CONFIG } = require('pear-errors')

// cutover stops replaying & relaying subscriber streams between clients
// set to false to stop run flow from auto cutover, so we can cutover at end of ui init
Pear.constructor.CUTOVER = false

const pear = require('pear-cmd')
const run = require('pear-cmd/run')
const pkg = require('./package.json')

const bin = (name) => {
  const kebab = name.toLowerCase().split(' ').join('-')
  const cased = kebab.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
  const app = isMac ? cased + '.app' : kebab + '-app'
  const exe = isWindows ? cased + '.exe' : (isMac ? 'Contents/MacOS/' + cased : kebab)
  return isWindows ? 'bin\\' + app + '\\' + exe : (isMac ? 'bin/' + app + '/' + exe : 'bin/' + app + '/' + exe)
}

class PearElectron {
  constructor () {
    if (!Pear.config.assets.ui?.path) {
      const info =
        Pear.config.options.pre
          ? { assets: Pear.config.assets }
          : { assets: Pear.config.assets, hint: 'set pre: pear-electron/pre to autoset assets.ui' }
      throw new ERR_INVALID_CONFIG('pear.assets.ui must be defined for project', info)
    }
    if (!Pear.config.assets.ui?.name) {
      throw new ERR_INVALID_CONFIG('pear.assets.ui.name must be defined for project', { assets: Pear.config.assets })
    }
    this.ipc = Pear[Pear.constructor.IPC]
    this.applink = new URL(Pear.config.applink)
    this.LOG = new Logger({ labels: [pkg.name] })
    Pear.teardown(() => this.ipc.close())
  }

  async start (opts = {}) {
    this.bin = path.join(Pear.config.assets.ui.path, 'by-arch', require.addon.host, bin(Pear.config.assets.ui.name))
    const parsed = pear(Pear.argv.slice(1))
    const cmd = command('run', ...run)
    let argv = parsed.rest
    const { args, indices } = cmd.parse(argv)
    let link = Pear.config.link
    const { drive, pathname, hash, search } = plink.parse(link)
    const { key } = drive
    const isPear = link.startsWith('pear://')
    const isFile = link.startsWith('file://')
    const isPath = isPear === false && isFile === false

    const cwd = os.cwd()
    let dir = cwd
    if (key === null) {
      const initial = normalize(pathname)
      const base = project(initial, initial)
      dir = base.dir
      if (dir.length > 1 && dir.endsWith('/')) dir = dir.slice(0, -1)
      if (isPath) {
        link = pathToFileURL(path.join(dir, base.entrypoint || '/')) + search + hash
        argv[indices.args.link] = link
      }
    }

    argv[indices.args.link] = argv[indices.args.link].replace('://', '_||') // for Windows

    if ((isLinux || isWindows) && indices.flags.sandbox === undefined) argv.splice(indices.args.link, 0, '--no-sandbox')
    const info = JSON.stringify({
      checkout: constants.CHECKOUT,
      mount: constants.MOUNT,
      bridge: opts.bridge?.addr ?? undefined,
      startId: Pear.config.startId,
      dir
    })

    argv = ['run', '--rti', info, ...argv]
    const stdio = args.detach
      ? ['ignore', 'ignore', 'ignore', 'overlapped']
      : ['ignore', 'inherit', 'pipe', 'overlapped']
    const options = {
      stdio,
      cwd,
      windowsHide: true,
      ...{ env: { ...env, NODE_PRESERVE_SYMLINKS: 1 } }
    }
    let sp = null
    if (args.appling) {
      this.LOG.info('Spawning UI (appling)')
      const { appling } = args
      const applingApp = isMac ? appling.split('.app')[0] + '.app' : appling
      if (fs.existsSync(applingApp) === false) throw ERR_INVALID_APPLING('Appling does not exist')
      if (isMac) sp = spawn('open', [applingApp, '--args', ...argv], options)
      else sp = spawn(applingApp, argv, options)
    } else {
      this.LOG.info('Spawning UI (asset)')
      sp = spawn(this.bin, argv, options)
    }

    sp.on('exit', (code) => {
      this.LOG.info('UI exited with code', code)
      Pear.exitCode = code
      if (!pipe.destroyed) pipe.destroy()
    })

    const pipe = sp.stdio[3]

    if (args.detach) return pipe

    const onerr = (data) => {
      const str = data.toString()
      const ignore = str.indexOf('DevTools listening on ws://') > -1 ||
        str.indexOf('NSApplicationDelegate.applicationSupportsSecureRestorableState') > -1 ||
        str.indexOf('", source: devtools://devtools/') > -1 ||
        str.indexOf('sysctlbyname for kern.hv_vmm_present failed with status -1') > -1 ||
        str.indexOf('dev.i915.perf_stream_paranoid=0') > -1 ||
        str.indexOf('libva error: vaGetDriverNameByIndex() failed') > -1 ||
        str.indexOf('GetVSyncParametersIfAvailable() failed') > -1 ||
        str.indexOf('Unsupported pixel format: -1') > -1 ||
        (str.indexOf(':ERROR:') > -1 && /:ERROR:.+cache/.test(str))
      if (ignore) return
      fs.writeSync(2, data)
    }
    sp.stderr.on('data', onerr)
    return pipe
  }
}

function project (dir, initial) {
  try {
    if (JSON.parse(fs.readFileSync(path.join(dir, 'package.json'))).pear) {
      return { dir, entrypoint: initial.slice(dir.length) }
    }
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EISDIR' && err.code !== 'ENOTDIR') throw err
  }
  const parent = path.dirname(dir)
  if (parent === dir) {
    throw ERR_INVALID_PROJECT_DIR(`A valid package.json file with pear field must exist (checked from "${initial}" to "${dir}")`)
  }
  return project(parent, initial)
}

function normalize (pathname) {
  if (isWindows) return path.normalize(pathname.slice(1))
  return pathname
}

module.exports = PearElectron
