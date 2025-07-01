async function premigrate () {
  const v1 = !!Pear.config.tier
  if (!v1) return
  const { randomBytes } = require('hypercore-crypto')
  const path = require('path')
  const ui = require('./package.json').pear.assets.ui
  const ipc = Pear.constructor[Symbol.for('pear.ipc')]
  let asset = await ipc.getAsset({ link: ui.link })
  if (asset !== null) return
  const opwait = require('pear-api/opwait')
  asset = ui
  asset.only = asset.only.split(',').map((s) => s.trim().replace(/%%HOST%%/g, process.platform + '-' + process.arch))
  const reserved = await ipc.retrieveAssetPath({ link: asset.link })
  asset.path = reserved.path ?? path.join(Pear.config.pearDir, 'assets', randomBytes(16).toString('hex'))
  await ipc.reserveAssetPath({ link: asset.link, path: asset.path })
  await opwait(ipc.dump({ link: asset.link, dir: asset.path, only: asset.only }), (status) => {
    console.info('pear-electron/premigrate passive forward syncing', status)
  })
  await ipc.addAsset(asset)
}

premigrate().catch(console.error)
