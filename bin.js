#!/usr/bin/env pear run
/* global Pear, Bare */
const path = require('path')
const IPC = require('pear-ipc')
const { encode } = require('hypercore-id-encoding')
const { PLATFORM_LOCK, SOCKET_PATH, CONNECT_TIMEOUT } = require('pear-api/constants')
const tryboot = require('pear-api/tryboot')
const link = require('pear-link')()
const { runtimes } = Pear.config.entrypoint.startsWith('/node_modules/.bin')
  ? require('../pear-electron/package.json').pear
  : require('./package.json').pear

async function pearElectron () {
  const { protocol, drive } = link(runtimes)

  const opts = {
    id: Bare.pid,
    link: protocol + '//' + encode(drive.key) + '/by-arch/',
    dir: path.join(new URL(Pear.config.applink).pathname, 'node_modules', 'pear-electron'),
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
  const stream = ipc.dump(opts)
  for await (const output of stream) console.log(output)
  await ipc.close()
}

pearElectron().catch(console.error)
