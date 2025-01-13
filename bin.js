#!/usr/bin/env pear run
const inBin = global.Pear?.config.entrypoint.startsWith('/node_modules/.bin/pear-electron')
const bootstrap = inBin ? require('../pear-electron/scripts/bootstrap') : require('./scripts/bootstrap')
const bundle = inBin ? require('../pear-electron/scripts/bootstrap') : require('./scripts/bundle')

async function pearElectron () {
  await bootstrap()
  await bundle()
}

pearElectron().catch(console.error)
