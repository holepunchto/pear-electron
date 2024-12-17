'use strict'
const bootstrap = require('./scripts/bootstrap.js')

async function bin () {
  await import('./scripts/decal.js')
  await import('./scripts/bundle.mjs')
  await bootstrap.download()
}

bin().catch(console.error)




