#!/usr/bin/env pear
/* global Pear */
if (!global.Pear && global.process) {
  const { status } = require('child_process').spawnSync('pear', process.argv.slice(1), { stdio: 'inherit', shell: true })
  process.exit(status)
}
const installed = Pear.config.entrypoint.startsWith('/node_modules/.bin/')
if (Pear.pipe === undefined) throw new Error('Incompatible with current Pear version (must be v2+)')
const bin = Pear.pipe === null
  ? (installed ? require('../pear-electron/bin/bootstrap') : require('./bootstrap'))
  : require('../pear-electron/bin/configure')
bin().catch(console.error)
