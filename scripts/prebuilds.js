'use strict'
const pack = require('pear-pack')
const Localdrive = require('localdrive')

async function prebuilds() {
  const { pathname } = new URL(global.Pear.config.applink + '/')
  const drive = new Localdrive(pathname)
  const hosts = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']
  const builtins = [
    'electron',
    'net',
    'assert',
    'console',
    'events',
    'fs',
    'fs/promises',
    'http',
    'https',
    'os',
    'path',
    'child_process',
    'repl',
    'url',
    'tty',
    'module',
    'process',
    'timers',
    'inspector'
  ]
  const { prebuilds } = await pack(drive, { hosts, builtins })
  for (const [prebuild, addon] of prebuilds) await drive.put(prebuild, addon)
  console.log('prebuilds generated')
}

module.exports = prebuilds().catch(console.error)
