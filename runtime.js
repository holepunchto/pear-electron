/** @typedef {import('pear-interface')} */ /* global Pear */
'use strict'
const fs = require('bare-fs')
const os = require('bare-os')
const tty = require('bare-tty')
const path = require('bare-path')
const Pipe = require('bare-pipe')
const { spawn } = require('bare-subprocess')
const env = require('bare-env')
const { command } = require('paparam')
const { isLinux, isWindows, isMac } = require('which-runtime')
const { pathToFileURL, fileURLToPath } = require('url-file-url')
const constants = require('pear-api/constants')
const parseLink = require('pear-api/parse-link')
const { ERR_INVALID_INPUT, ERR_INVALID_APPLING } = require('pear-api/errors')
const run = require('pear-api/cmd/run')
const pear = require('pear-api/cmd')
const EXEC = isWindows
  ? 'pear-runtime-app\\Pear Runtime.exe'
  : isLinux
    ? 'pear-runtime-app/pear-runtime'
    : 'Pear Runtime.app/Contents/MacOS/Pear Runtime'
const BOOT = require.resolve('./boot.js')

class PearElectron {
  constructor () {
    this.stderr = null
    this.ipc = Pear[Pear.constructor.IPC]
    this.bin = fileURLToPath(new URL(Pear.config.applink + '/node_modules/pear-electron/by-arch/' + require.addon.host + '/bin/' + EXEC))
    Pear.teardown(() => this.ipc.close())
  }

  start (opts = {}) {
    const parsed = pear(Pear.argv)
    const cmd = command('run', ...run)
    let argv = parsed.rest.slice(parsed.indices.rest)
    const { args, indices, flags } = cmd.parse(argv)
    let link = Pear.config.link
    const { drive, pathname } = parseLink(link)
    const entry = isWindows ? path.normalize(pathname.slice(1)) : pathname
    const { key } = drive
    const isPear = link.startsWith('pear://')
    const isFile = link.startsWith('file://')
    const isPath = isPear === false && isFile === false

    const cwd = os.cwd()
    let dir = cwd
    let base = null
    if (key === null) {
      try {
        dir = fs.statSync(entry).isDirectory() ? entry : path.dirname(entry)
      } catch { /* ignore */ }
      base = project(dir, pathname, cwd)
      dir = base.dir
      if (dir.length > 1 && dir.endsWith('/')) dir = dir.slice(0, -1)
      if (isPath) {
        link = pathToFileURL(path.join(dir, base.entrypoint || '/')).pathname
      }
    }

    if (isPath) argv[indices.args.link] = 'file://' + (base.entrypoint || '/')
    argv[indices.args.link] = argv[indices.args.link].replace('://', '_||') // for Windows

    if ((isLinux || isWindows) && !flags.sandbox) argv.splice(indices.args.link, 0, '--no-sandbox')
    const info = JSON.stringify({
      checkout: constants.CHECKOUT,
      mount: constants.MOUNT,
      bridge: opts.bridge?.addr ?? undefined,
      dir
    })
    argv = [BOOT, '--rti', info, ...argv]
    const stdio = args.detach ? 'ignore' : ['ignore', 'inherit', 'pipe', 'pipe']
    const options = {
      stdio,
      cwd,
      windowsHide: true,
      ...{ env: { ...env, NODE_PRESERVE_SYMLINKS: 1 } }
    }

    const sp = spawn(this.bin, argv, options)
    if (args.appling) {
      const { appling } = args
      const applingApp = isMac ? appling.split('.app')[0] + '.app' : appling
      try {
        fs.statSync(applingApp)
      } catch {
        throw ERR_INVALID_APPLING('Appling does not exist')
      }
      if (isMac) spawn('open', [applingApp, '--args', ...argv], options).unref()
      else spawn(applingApp, argv, options).unref()
    }
    if (args.detach) return null
    const pipe = sp.stdio[3]
    sp.on('exit', (code) => { Pear.exit(code) })
    this.stderr = tty.isTTY(2) ? new tty.WriteStream(2) : new Pipe(2)

    const onerr = (data) => {
      const str = data.toString()
      const ignore = str.indexOf('DevTools listening on ws://') > -1 ||
        str.indexOf('NSApplicationDelegate.applicationSupportsSecureRestorableState') > -1 ||
        str.indexOf('", source: devtools://devtools/') > -1 ||
        str.indexOf('sysctlbyname for kern.hv_vmm_present failed with status -1') > -1 ||
        str.indexOf('dev.i915.perf_stream_paranoid=0') > -1 ||
        str.indexOf('libva error: vaGetDriverNameByIndex() failed') > -1 ||
        str.indexOf('GetVSyncParametersIfAvailable() failed') > -1 ||
        (str.indexOf(':ERROR:') > -1 && /:ERROR:.+cache/.test(str))
      if (ignore) return
      this.stderr.write(data)
    }
    sp.stderr.on('data', onerr)
    return pipe
  }
}

function project (dir, origin, cwd) {
  try {
    if (JSON.parse(fs.readFileSync(path.join(dir, 'package.json'))).pear) {
      return { dir, origin, entrypoint: isWindows ? path.normalize(origin.slice(1)).slice(dir.length) : origin.slice(dir.length) }
    }
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EISDIR' && err.code !== 'ENOTDIR') throw err
  }
  const parent = path.dirname(dir)
  if (parent === dir || parent.startsWith(cwd) === false) {
    const normalizedOrigin = !isWindows ? origin : path.normalize(origin.slice(1))
    const cwdIsOrigin = path.relative(cwd, normalizedOrigin).length === 0
    const condition = cwdIsOrigin ? `at "${cwd}"` : normalizedOrigin.includes(cwd) ? `from "${normalizedOrigin}" up to "${cwd}"` : `at "${normalizedOrigin}"`
    throw ERR_INVALID_INPUT(`A valid package.json file with pear field must exist ${condition}`)
  }
  return project(parent, origin, cwd)
}

module.exports = PearElectron
