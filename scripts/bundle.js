'use strict'
const pack = require('bare-pack')
const Localdrive = require('localdrive')
const DriveBundler = require('drive-bundler')
const path = require('path')
const dirname = global.Pear?.config.applink ? new URL(global.Pear.config.applink + '/').pathname : path.join(__dirname, '/..')

async function bundle () {
  const drive = new Localdrive(dirname)
  const { sources, resolutions } = await DriveBundler.bundle(drive, { cwd: dirname, entrypoint: '/boot.js', mount: 'pear://ui', absoluteFiles: false, prebuilds: false })
  const target = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']
  const b = await pack(new URL('pear://ui/boot.js'), { resolutions, target }, (url) => sources[url.href])
  await drive.put('/boot.bundle', b.toBuffer())
  console.log('boot.bundle generated')
}

bundle().catch(console.error)
