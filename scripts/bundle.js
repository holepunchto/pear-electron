'use strict'
const sodium = require('sodium-native')
const pack = require('bare-pack-drive')
const unpack = require('bare-unpack')
const lex = require('bare-module-lexer')
const traverse = require('bare-module-traverse')
const Localdrive = require('localdrive')
const gunk = require('pear-api/gunk')

async function bundle () {
  const { pathname } = new URL(global.Pear.config.applink + '/')
  const drive = new Localdrive(pathname)
  const target = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']
  // TODO: why isn't net in gunk overrides? 
  // const builtins = ['net', ...gunk.overrides]
  const builtins = ['fs', 'path', 'os'] // <-- FOR DEBUG
  const bundle = await pack(drive, '/boot.js', { resolve: resolve, target, builtins })
  const rebundle = await unpack(bundle, { addons: true, files: false }, async (key) => {
    console.log('KEY', key)
    const extIx = key.lastIndexOf('.')
    if (extIx === -1) return key
    const extname = key.slice(extIx)
    if (extname !== '.node' && extname !== '.bare') return key
    const hash = Buffer.allocUnsafe(32)
    const addon = await drive.get(key)
    sodium.crypto_generichash(hash, addon)
    const prebuilds = key.slice(key.indexOf('/prebuilds/'))
    const prebuild = prebuilds.slice(0, prebuilds.lastIndexOf('/') + 1) + hash.toString('hex') + extname
    await drive.put(prebuild, addon)
    return prebuild
  })
  await drive.put('/boot.bundle', rebundle.toBuffer())
  console.log('boot.bundle generated')
}

bundle().catch(console.error)

function resolve (entry, parentURL, opts = {}) {
  console.log(entry)
  let extensions
  let conditions = opts.target.map((host) => ['node', 'bare', ...host.split('-')])

  if (entry.type & lex.constants.ADDON) {
    extensions = ['.node', '.bare']
    conditions = conditions.map((conditions) => ['addon', ...conditions])

    return traverse.resolve.addon(entry.specifier || '.', parentURL, {
      extensions,
      conditions,
      hosts: opts.target,
      linked: false,
      ...opts
    })
  }

  if (entry.type & lex.constants.ASSET) {
    conditions = conditions.map((conditions) => ['asset', ...conditions])
  } else {
    extensions = ['.js', '.cjs', '.mjs', '.json', '.node', '.bare']

    if (entry.type & lex.constants.REQUIRE) {
      conditions = conditions.map((conditions) => ['require', ...conditions])
    } else if (entry.type & lex.constants.IMPORT) {
      conditions = conditions.map((conditions) => ['import', ...conditions])
    }
  }

  return traverse.resolve.module(entry.specifier, parentURL, {
    extensions,
    conditions,
    ...opts
  })
}