'use strict'
const Bundle = require('bare-bundle')
const Localdrive = require('localdrive')
const DriveBundler = require('drive-bundler')
const path = require('path')
const fs = require('fs')
const dirname = global.Pear?.config.applink ? new URL(global.Pear.config.applink + '/').pathname : path.join(__dirname, '/..')
async function bundle () {
  const drive = new Localdrive(dirname)
  const b = new Bundle()

  const cache = {}
  const res = {}

  const { entrypoint, resolutions, sources } = await DriveBundler.bundle(drive, { cache, cwd: dirname, entrypoint: '/boot.js', absoluteFiles: false })

  for (const [key, map] of Object.entries(resolutions)) {
    res[key] = map
  }

  for (const [key, source] of Object.entries(sources)) {
    cache[key] = true
    
    b.write(key, source)
  }

  b.main = entrypoint
  b.resolutions = res
  await fs.promises.writeFile(path.join(dirname, 'boot.bundle'), b.toBuffer())
  console.log('boot.bundle generated')
}

bundle().catch(console.error)
