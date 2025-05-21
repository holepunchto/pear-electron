#!/usr/bin/env pear
/* global Pear */
if (!global.Pear && global.process) {
  const { status } = require('child_process').spawnSync('pear', process.argv.slice(1), { stdio: 'inherit', shell: true })
  process.exit(status)
}
if (Pear.pipe === undefined) throw new Error('Incompatible with current Pear version (must be v2+)')
if (Pear.pipe === null) throw new Error('This is a pre script: must have Pear.pipe')
require('./pre')
