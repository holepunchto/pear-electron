'use strict'
/* global Pear */
const IPC = require('pear-ipc')
const { PLATFORM_LOCK, SOCKET_PATH, CONNECT_TIMEOUT } = require('pear-constants')
const tryboot = require('pear-tryboot')
const { outputter, ansi, byteSize, isTTY } = require('pear-terminal')
const { pathname } = new URL(Pear.config.applink)

const RUNTIMES = 'pear://0.1167.6988abemqn7ogjpm8cjjg4aeb81rduxfn4h31sgn44u3cadu9s7o'

const opts = {
  id: Pear.pid,
  dir: pathname,
  link: RUNTIMES,
  only: [
    '/by-arch/darwin-arm64/bin/Pear Runtime.app',
    '/by-arch/darwin-x64/bin/Pear Runtime.app',
    '/by-arch/linux-arm64/bin/pear-runtime-app',
    '/by-arch/linux-x64/bin/pear-runtime-app',
    '/by-arch/win32-x64/bin/pear-runtime-app',
    '/prebuilds'
  ],
  force: true,
  json: !isTTY
}

const transforms = {
  dumping: ({ link, dir, list }) =>
    list > -1
      ? ''
      : `\n${ansi.pear} Bootstrapping pear-electron runtimes from peers\n\nfrom: ${link}\ninto: ${dir}\n`,
  file: ({ key, value }) => `${key}${value ? '\n' + value : ''}`,
  complete: () => '\x1b[1A\nBootstrap complete\n',
  stats({ upload, download, peers }) {
    const dl =
      download.bytes + download.speed === 0
        ? ''
        : `[${ansi.down} ${byteSize(download.bytes)} - ${byteSize(download.speed)}/s ] `
    const ul =
      upload.bytes + upload.speed === 0
        ? ''
        : `[${ansi.up} ${byteSize(upload.bytes)} - ${byteSize(upload.speed)}/s ] `
    return {
      output: 'status',
      message: `[ Peers: ${peers} ] ${dl}${ul}`
    }
  },
  error: (err) => `Bootstrap Failure (code: ${err.code || 'none'}) ${err.stack}`,
  final: () => 'Bootstrapped'
}

async function bootstrap(opts, outs = transforms) {
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

module.exports = bootstrap(opts).catch(console.error)
