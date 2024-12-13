/** @typedef {import('pear-interface')} */ /* global Pear */
'use strict'
const fs = require('bare-fs')
const os = require('bare-os')
const tty = require('bare-tty')
const path = require('bare-path')
const Pipe = require('bare-pipe')
const { spawn } = require('bare-subprocess')
const env = require('bare-env')
const ReadyResource = require('ready-resource')
const { command } = require('paparam')
const { isLinux, isWindows } = require('which-runtime')
const { pathToFileURL } = require('url-file-url')
const constants = require('pear-api/constants')
const parseLink = require('pear-api/parse-link')
const { ERR_INVALID_INPUT } = require('pear-api/errors')
const { version, pear } = require('./package.json')
const EXEC = isWindows
  ? 'pear-runtime-app/Pear Runtime.exe'
  : isLinux
    ? 'pear-runtime-app/pear-runtime'
    : 'Pear Runtime.app/Contents/MacOS/Pear Runtime'
const BOOT = require.resolve('./boot.js')
const shell = require('pear-api/shell')
const run = require('pear-api/cmd-def/run')
const noop = () => {}
class PearElectron extends ReadyResource {
  ipc = null
  stderr = null
  bin = ''

  async _open () {
    this.ipc = Pear[Pear.constructor.IPC]
    Pear.teardown(() => this.close())
    const INTERFACE = path.join(constants.PLATFORM_DIR, 'interfaces', 'pear-electron', version)
    this.bin = path.join(INTERFACE, 'by-arch', require.addon.host, 'bin', EXEC)

    if (fs.existsSync(INTERFACE)) {
      this.ipc.gc({ resource: 'interfaces' }).catch(noop) // background gc unused interfaces
      return
    }

    console.log('Bootstrapping Application Runtime...')
    // TODO  check that dump understands length
    for await (const info of this.ipc.dump(pear.ui.runtime, INTERFACE)) {
      if (info.tag === 'error') throw new Error('Bootstrapping failure: ' + info.stack)
      // TODO info.tag === 'byte-diff' in-place updating
    }

    // TODO: need stage --dry-run to output expected length,
    // flow then autosets pear.ui.runtime link to correct length & updates semver and tags
    // CI workflow then runs this flow to stage to given key
    // to release npm author git pulls after workflow and does npm pub
    console.log('Application Runtime Bootstrapped')

    this.ipc.gc({ resource: 'interfaces' }).catch(noop) // background gc unused interfaces
  }

  async _close () {
    await this.ipc.close()
  }

  start (info) {
    let argv = Pear.argv
    const parsed = shell(Pear.argv)
    const cmdIx = parsed?.indices.args.cmd ?? -1
    if (cmdIx > -1) argv = argv.slice(cmdIx)
    const cmd = command('run', ...run)
    let { args, indices, flags } = cmd.parse(argv)
    let link = Pear.config.link
    const { drive, pathname } = parseLink(link)
    const entry = isWindows ? path.normalize(pathname.slice(1)) : pathname
    const { key } = drive
    const isPear = link.startsWith('pear://')
    const isFile = link.startsWith('file://')
    const isPath = isPear === false && isFile === false

    let cwd = os.cwd()
    const originalCwd = cwd
    let dir = cwd
    let base = null
    if (key === null) {
      try {
        dir = fs.statSync(entry).isDirectory() ? entry : path.dirname(entry)
      } catch { /* ignore */ }
      base = project(dir, pathname, cwd)
      dir = base.dir
      if (dir !== cwd) {
        global.Bare.on('exit', () => os.chdir(originalCwd)) // TODO: remove this once Pear.shutdown is used to close
        Pear.teardown(() => os.chdir(originalCwd))
        os.chdir(dir)
        cwd = dir
      }
      if (isPath) {
        link = pathToFileURL(path.join(dir, base.entrypoint || '/')).pathname
      }
    }

    if (isPath) args[indices.args.link] = 'file://' + (base.entrypoint || '/')
    args[indices.args.link] = args[indices.args.link].replace('://', '_||') // for Windows
    if ((isLinux || isWindows) && !flags.sandbox) args.splice(indices.args.link, 0, '--no-sandbox')
    const detach = args.includes('--detach')
    const mountpoint = constants.MOUNT
    args = [BOOT, '--runtime-info', info, '--mountpoint', mountpoint, '--start-id=' + Pear.config.startId, ...args]
    const stdio = detach ? 'ignore' : ['ignore', 'inherit', 'pipe', 'overlapped']
    const sp = spawn(this.bin, args, {
      stdio,
      cwd,
      windowsHide: true,
      ...{ env: { ...env, NODE_PRESERVE_SYMLINKS: 1 } }
    })
    if (detach) return null
    const pipe = sp.stdio[3]
    sp.on('exit', (code) => {
      this.close().finally(() => Pear.exit(code))
    })
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
