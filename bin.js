#!/usr/bin/env pear
if (!global.Pear && global.process) {
  const { status } = require('child_process').spawnSync('pear', process.argv.slice(1), { stdio: 'inherit', shell: true })
  process.exit(status)
}

const path = require('bare-path')
const installed = global.Pear.config.entrypoint.startsWith('/node_modules/.bin/')
const pkg = installed ? require('../pear-electron/package.json') : require('./package.json')
const { isTTY } = require('pear-api/terminal')
const bootstrap = installed ? require('../pear-electron/bootstrap') : require('./bootstrap')

async function pearElectron () {
  const { pathname } = new URL(global.Pear.config.applink)
  const opts = {
    id: global.Pear.pid,
    dir: installed ? path.join(pathname, 'node_modules', 'pear-electron') : pathname,
    link: pkg.pear.bootstrap,
    only: installed ? ['/by-arch', '/prebuilds'] : ['/by-arch'],
    json: !isTTY,
    force: true

  }
  await bootstrap(opts)
}

pearElectron().catch(console.error)
