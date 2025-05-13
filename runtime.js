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
const constants = require('pear-api/constants')
const plink = require('pear-api/link')
const Logger = require('pear-api/logger')
const { ERR_INVALID_APPLING, ERR_INVALID_PROJECT_DIR } = require('pear-api/errors')
const { ansi, byteSize, indicator, outputter } = require('pear-api/terminal')
const run = require('pear-api/cmd/run')
const pear = require('pear-api/cmd')
const pkg = require('./package.json')

const bin = () => {
  const name = Pear.config.name[0].toUpperCase() + Pear.config.name.slice(1)
  const app = isMac ? name + ' Runtime.app' : Pear.config.name + '-runtime-app'
  const exe = isWindows ? name + 'Runtime.exe' : (isMac ? 'Contents/MacOS/' + name + ' Runtime' : Pear.config.name + '-runtime')
  return isWindows ? 'bin\\' + app + '\\' + exe : (isMac ? 'bin/' + app + '/' + exe : 'bin/' + app + '/' + exe)
}

const BIN = isWindows
  ? 'bin\\pear-runtime-app\\Pear Runtime.exe'
  : isMac
    ? 'bin/Pear Runtime.app/Contents/MacOS/Pear Runtime'
    : 'bin/pear-runtime-app/pear-runtime'

class PearElectron {
  constructor () {
    this.ipc = Pear[Pear.constructor.IPC]
    this.applink = new URL(Pear.config.applink)
    this.LOG = new Logger({ labels: [pkg.name] })
    Pear.teardown(() => this.ipc.close())
  }

  #outs () {
    if (this.LOG.INF === false) {
      return {
        stats ({ upload, download, peers }) {
          const dl = download.total + download.speed === 0 ? '' : `[${ansi.down} ${byteSize(download.total)} - ${byteSize(download.speed)}/s ] `
          const ul = upload.total + upload.speed === 0 ? '' : `[${ansi.up} ${byteSize(upload.total)} - ${byteSize(upload.speed)}/s ] `
          return {
            output: 'status',
            message: `Syncing Runtime [ Peers: ${peers} ] ${dl}${ul}`
          }
        },
        final (asset) {
          if (asset.forced === false && asset.inserted === false) return {}
          return 'Synced\x1b[K'
        }
      }
    }
    return {
      dumping: ({ link, dir }) => this.LOG.format('INF', 'Syncing runtime from peers\nfrom: ' + link + '\ninto: ' + dir + '\n'),
      byteDiff: ({ type, sizes, message }) => {
        sizes = sizes.map((size) => (size > 0 ? '+' : '') + byteSize(size)).join(', ')
        return this.LOG.format('INF', indicator(type, 'diff') + ' ' + message + ' (' + sizes + ')')
      },
      file: ({ key }) => this.LOG.format('INF', key),
      complete: () => this.LOG.format('INF', 'Asset fetch complete'),
      error: (err) => this.LOG.format('INF', `Asset fetch Failure (code: ${err.code || 'none'}) ${err.stack}`)
    }
  }

  async #asset (opts, force = false) {
    const output = outputter('asset', this.#outs())
    const json = false
    const bootstrap = opts.bootstrap ?? pkg.pear.bootstrap
    const executable = opts.bootstrap ? bin() : BIN
    const stream = Pear.asset(bootstrap, {
      only: ['/boot.bundle', '/by-arch/' + require.addon.host, '/prebuilds/' + require.addon.host],
      force
    })
    const asset = await output(json, stream)
    if (asset === null) throw new Error('Failed to determine runtime asset from sidecar')
    return path.join(asset.path, 'by-arch', require.addon.host, executable)
  }

  async start (opts = {}) {
    this.LOG.info('Fetching asset & determining bin path')
    this.bin = await this.#asset(opts)
    // if disk tampered then resync:
    if (fs.existsSync(this.bin) === false) this.bin = await this.#asset(opts, true)
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

    argv = ['boot.bundle', '--rti', info, ...argv]
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
