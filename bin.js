#!/usr/bin/env pear
/* global Pear */

if (!global.Pear && global.process) {
  const { status } = require('child_process').spawnSync('pear', process.argv.slice(1), { stdio: 'inherit', shell: true })
  process.exit(status)
}

const path = require('path')
const inDotBin = global.Pear.config.entrypoint.startsWith('/node_modules/.bin/')
const { runtimes } = inDotBin ? require('../pear-electron/package.json').pear : require('./package.json').pear
const IPC = require('pear-ipc')
const { encode } = require('hypercore-id-encoding')
const { PLATFORM_LOCK, SOCKET_PATH, CONNECT_TIMEOUT } = require('pear-api/constants')
const tryboot = require('pear-api/tryboot')
const link = require('pear-link')()
const { outputter, ansi, byteSize } = require('pear-api/terminal')

const output = outputter('dump', {
  dumping: ({ link, dir, list }) => list > -1 ? '' : `\n${ansi.pear} Bootstrapping pear-electron runtimes from peers\n\nfrom: ${link}\ninto: ${dir}\n`,
  file: ({ key, value }) => `${key}${value ? '\n' + value : ''}`,
  complete: () => '\x1b[1A\nBootstrap complete\n',
  stats ({ upload, download, peers }) {
    const dl = download.total + download.speed === 0 ? '' : `[${ansi.down} ${byteSize(download.total)} - ${byteSize(download.speed)}/s ] `
    const ul = upload.total + upload.speed === 0 ? '' : `[${ansi.up} ${byteSize(upload.total)} - ${byteSize(upload.speed)}/s ] `
    return {
      output: 'status',
      message: `[ Peers: ${peers} ] ${dl}${ul}`
    }
  },
  error: (err) => `Bootstrap Failure (code: ${err.code || 'none'}) ${err.stack}`
})

async function pearElectron () {
  const { protocol, drive } = link(runtimes)
  const root = new URL(Pear.config.applink).pathname
  const opts = {
    id: Pear.pid,
    link: protocol + '//' + encode(drive.key) + '/by-arch/',
    dir: inDotBin ? path.join(root, 'node_modules', 'pear-electron') : root,
    // checkout: drive.length,
    force: true

  }
  const ipc = new IPC.Client({
    lock: PLATFORM_LOCK,
    socketPath: SOCKET_PATH,
    connectTimeout: CONNECT_TIMEOUT,
    connect: tryboot
  })
  await ipc.ready()
  await output(false, ipc.dump(opts))
  await ipc.close()
}

pearElectron().catch(console.error)
