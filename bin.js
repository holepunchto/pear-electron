#!/usr/bin/env pear run
/* global Pear, Bare */
const path = require('path')
const { runtimes } = Pear.config.entrypoint.startsWith('/node_modules/.bin') ?
  require('../pear-electron/package.json').pear : 
  require('./package.json').pear
const { decode } = require('hypercore-id-encoding')
const link = require('pear-link')
async function pearElectron () {
  const { protocol, pathname, drive } = link(runtimes)

  const opts = {
    id: Bare.pid,
    link: protocol + decode(drive.key) + pathname,
    dir: path.join(new URL(Pear.config.applink).pathname, pathname),
    checkout: drive.length,
    force: true
  }

  for await (const output of Pear[Pear.IPC].dump(opts)) {
    console.log(output)
  }
}

pearElectron().catch(console.error)
