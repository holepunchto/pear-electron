'use strict'
/* global Pear */
const path = require('bare-path')
const installed = Pear.config.entrypoint.startsWith('/node_modules/.bin/')
const { pear } = installed ? require('../../pear-electron/package.json') : require('../package.json')
const { isTTY } = require('pear-api/terminal')
const bootstrap = installed ? require('../../pear-electron/bootstrap') : require('../bootstrap')

const { pathname } = new URL(Pear.config.applink)
const opts = {
  id: Pear.pid,
  dir: installed ? path.join(pathname, 'node_modules', 'pear-electron') : pathname,
  link: pear.bootstrap,
  only: installed ? ['/by-arch', '/prebuilds'] : ['/by-arch'],
  json: !isTTY,
  force: true
}

module.exports = () => bootstrap(opts)
