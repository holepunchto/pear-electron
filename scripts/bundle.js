'use strict'
const pack = require('pear-pack')
const Localdrive = require('localdrive')

async function bundle (name, prebuildPrefix = '') {
  const { pathname } = new URL(global.Pear.config.applink + '/')
  const drive = new Localdrive(pathname)
  const hosts = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']
  const builtins = [
    'electron', 'net', 'assert', 'console', 'events', 'fs', 'fs/promises', 'http', 'https', 'os',
    'path', 'child_process', 'repl', 'url', 'tty', 'module', 'process', 'timers', 'inspector'
  ]
  const entry = 'file:///' + name + '.js'
  const conditions = ['electron', 'node']
  const extensions = ['.node']
  const prepack = await pack(drive, { entry, hosts, builtins, conditions, extensions })
  for (const [prebuild, addon] of prepack.prebuilds) await drive.put(prebuild, addon)
  const { bundle, prebuilds } = await pack(drive, { entry, hosts, builtins, linked: false, conditions, extensions, prebuildPrefix })
  for (const [prebuild, addon] of prebuilds) await drive.put(prebuild, addon)
  await drive.put('/' + name + '.bundle', bundle)
}

async function bundles () {
  await bundle('boot', '/..')
  await bundle('load')
  console.log('boot.bundle, load.bundle & prebuilds generated')
}

module.exports = bundles().catch(console.error)
