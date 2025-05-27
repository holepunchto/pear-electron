'use strict'
const pack = require('pear-pack')
const Localdrive = require('localdrive')

async function bundle () {
  const { pathname } = new URL(global.Pear.config.applink + '/')
  const drive = new Localdrive(pathname)
  const target = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']
  const builtins = [
    'electron', 'net', 'assert', 'console', 'events', 'fs', 'fs/promises', 'http', 'https', 'os',
    'path', 'child_process', 'repl', 'url', 'tty', 'module', 'process', 'timers', 'inspector'
  ]
  const { bundle, prebuilds } = await pack(drive, { target, builtins })
  for (const [prebuild, addon] of prebuilds) await drive.put(prebuild, addon)
  await drive.put('/boot.bundle', bundle)
  console.log('boot.bundle & prebuilds generated')
}

module.exports = bundle().catch(console.error)
