const pack = require('pear-pack')
const Bundle = require('bare-bundle')
const AppDrive = require('pear-appdrive')
const Localdrive = require('localdrive')
const { pathToFileURL } = require('url-file-url')

const builtins = [
  'electron', 'net', 'assert', 'console', 'events', 'fs', 'fs/promises', 'http', 'https', 'os',
  'path', 'child_process', 'repl', 'url', 'tty', 'module', 'process', 'timers', 'inspector'
]
const hosts = [process.platform + '-' + process.arch]

async function load (entry) {
  const API = global.Pear.constructor
  const drive = new AppDrive()
  await drive.ready()
  const packed = await pack(drive, { entry, hosts, builtins, prebuildPrefix: pathToFileURL(API.RTI.ui).toString() })
  await drive.close()
  const ldrive = new Localdrive(API.RTI.ui)
  for (const [prebuild, addon] of packed.prebuilds) {
    if (await ldrive.entry(prebuild) !== null) continue
    await ldrive.put(prebuild, addon) // add any new prebuilds into asset prebuilds
  }
  return Bundle.from(packed.bundle)
}

module.exports = load
