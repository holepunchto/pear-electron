#!/usr/bin/env bare
'use strict'

const { platform, arch, isWindows, isBare } = require('which-runtime')
const fs = isBare ? require('bare-fs') : require('fs')
const path = isBare ? require('bare-path') : require('path')
const { command, flag, rest } = require('paparam')
const Corestore = require('corestore')
const Localdrive = require('localdrive')
const Hyperdrive = require('hyperdrive')
const Hyperswarm = require('hyperswarm')
const goodbye = global.Pear?.teardown || require('graceful-goodbye')
const byteSize = require('tiny-byte-size')
const { decode } = require('hypercore-id-encoding')
const Rache = require('rache')
const argv = global.Pear?.config.args || global.Bare?.argv || global.process.argv
const parser = command('bootstrap',
  flag('--archdump'),
  flag('--dlruntime'),
  flag('--external-corestore'),
  rest('rest')
)
const cmd = parser.parse(argv.slice(2), { sync: true })

const ARCHDUMP = cmd.flags.archdump === true
const DLRUNTIME = cmd.flags.dlruntime === true
const RUNTIMES_DRIVE_KEY = cmd.rest?.[0] || 'gd4n8itmfs6x7tzioj6jtxexiu4x4ijiu3grxdjwkbtkczw5dwho'
const CORESTORE = `/tmp/pear-archdump/${RUNTIMES_DRIVE_KEY}`

const ROOT = global.Pear ? path.join(new URL(global.Pear.config.applink).pathname, __dirname) : __dirname
const ADDON_HOST = require.addon?.host || platform + '-' + arch
const SWAP = path.join(ROOT, '..')
const HOST = path.join(SWAP, 'by-arch', ADDON_HOST)

if (ARCHDUMP) {
  const downloading = download(RUNTIMES_DRIVE_KEY, true)
  downloading.catch(console.error).then(advise)
} else if (DLRUNTIME || fs.existsSync(HOST) === false) {
  const downloading = download(RUNTIMES_DRIVE_KEY, false)
  downloading.catch(console.error)
  if (DLRUNTIME === false) downloading.catch(console.error).then(advise)
} else {
  advise()
}

function advise () {
  console.log('Done')
}

async function download (key, all = false) {
  for await (const output of downloader(key, all)) console.log(output)
}

async function * downloader (key, all) {
  if (all) yield '🍐 Fetching all runtimes from: \n   ' + key
  else yield '🍐 [ localdev ] - no local runtime: fetching runtime'

  const store = CORESTORE

  const maxCacheSize = 65536
  const globalCache = new Rache({ maxSize: maxCacheSize })

  const corestore = new Corestore(store, { globalCache })
  let runtimes = new Hyperdrive(corestore, decode(key))

  const swarm = new Hyperswarm()
  goodbye(() => swarm.destroy())

  swarm.on('connection', (socket) => { runtimes.corestore.replicate(socket) })

  await runtimes.ready()

  swarm.join(runtimes.discoveryKey, { server: false, client: true })
  const done = runtimes.corestore.findingPeers()
  swarm.flush().then(done, done)

  await runtimes.core.update() // make sure we have latest version

  runtimes = runtimes.checkout(runtimes.version)
  goodbye(() => runtimes.close())

  yield `\n  Extracting platform runtime${all ? 's' : ''} to disk\n`

  const runtime = runtimes.mirror(new Localdrive(SWAP), {
    prefix: '/by-arch' + (all ? '' : '/' + ADDON_HOST)
  })

  for await (const { op, key, bytesAdded } of runtime) {
    if (op === 'add') {
      yield '\x1B[32m+\x1B[39m ' + key + ' [' + byteSize(bytesAdded) + ']'
    } else if (op === 'change') {
      yield '\x1B[33m~\x1B[39m ' + key + ' [' + byteSize(bytesAdded) + ']'
    } else if (op === 'remove') {
      yield '\x1B[31m-\x1B[39m ' + key + ' [' + byteSize(bytesAdded) + ']'
    }
  }

  yield '\x1B[2K\x1B[200D  Runtime extraction complete\x1b[K\n'

  await runtimes.close()
  await swarm.destroy()
  await corestore.close()

  const tick = isWindows ? '^' : '✔'

  if (all) yield '\x1B[32m' + tick + '\x1B[39m Download complete\n'
  else yield '\x1B[32m' + tick + '\x1B[39m Download complete, initalizing...\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n'
}
