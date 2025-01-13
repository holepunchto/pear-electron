#!/usr/bin/env pear run
const bootstrap = require('./scripts/bootstrap')
const bundle = require('./scripts/bundle')

async function pearElectron () {
  await bootstrap()
  await bundle()
}

pearElectron().catch(console.error)
