'use strict'
/* global Pear */
const Localdrive = require('localdrive')
const cenc = require('compact-encoding')
function srcs (html) {
  return [
    ...(html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gis))
  ].map(m => m[1] || m[2] || m[3])
}

async function configure (options) {
  const { stage = {} } = options
  const { pathname } = new URL(global.Pear.config.applink + '/')
  const drive = new Localdrive(pathname)
  const html = (await drive.get(options.gui?.main ?? 'index.html')).toString()
  const entrypoints = srcs(html)
  stage.entrypoints = Array.isArray(stage.entrypoints) ? [...stage.entrypoints, ...entrypoints] : entrypoints
  options.stage = stage
  const pkg = (options.assets?.ui && !options.assets.ui.only) ? null : JSON.parse(await drive.get('node_modules/pear-electron/package.json'))
  options.assets = options.assets ?? pkg?.pear?.assets
  options.assets.ui.only = options.assets?.ui?.only ?? pkg?.pear?.assets?.ui?.only
  return options
}

Pear.pipe.on('end', () => { Pear.pipe.end() })

Pear.pipe.once('data', (data) => {
  const options = cenc.decode(cenc.any, data)
  configure(options).then((config) => {
    const buffer = cenc.encode(cenc.any, { tag: 'configure', data: config })
    Pear.pipe.end(buffer)
  }, (err) => {
    Pear.pipe.destroy(err)
  })
})
