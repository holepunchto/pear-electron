'use strict'
/* global Pear */
const IPC = require('pear-ipc')
const { PLATFORM_LOCK, SOCKET_PATH, CONNECT_TIMEOUT } = require('pear-api/constants')
const tryboot = require('pear-api/tryboot')
const { outputter, ansi, byteSize, isTTY } = require('pear-api/terminal')
const { pear } = require('../package.json')
const { pathname } = new URL(Pear.config.applink)

const opts = {
  id: Pear.pid,
  dir: pathname,
  link: pear.bootstrap,
  only: ['/by-arch', '/prebuilds', '/boot.bundle'],
  json: !isTTY
}

const transforms = {
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
}

async function bootstrap (opts, outs = transforms) {
  const output = outputter('dump', outs)
  const ipc = new IPC.Client({
    lock: PLATFORM_LOCK,
    socketPath: SOCKET_PATH,
    connectTimeout: CONNECT_TIMEOUT,
    connect: tryboot
  })
  const { json = false, log, ...options } = opts
  await ipc.ready()
  await output({ json, log }, ipc.dump(options))
  await ipc.close()
}

bootstrap(opts).catch(console.error)
