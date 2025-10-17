'use strict'
/* global Pear */
const Localdrive = require('localdrive')
const cenc = require('compact-encoding')
const path = require('bare-path')
const pipe = require('pear-pipe')()
const unixpathresolve = require('unix-path-resolve')

function srcs (html) {
  return [
    ...(html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gis))
  ].map(m => m[1] || m[2] || m[3])
}

async function configure (options) {
  const { stage = {} } = options
  const url = new URL(global.Pear.config.applink + '/')
  const pathname = normalize(url.pathname)
  const drive = new Localdrive(pathname)
  const main = unixpathresolve('/', options.gui?.main || 'index.html')
  const html = (await drive.get(main)).toString()
  const entrypoints = srcs(html).map(e => unixpathresolve(path.dirname(main), e))
  stage.entrypoints = Array.isArray(stage.entrypoints) ? [...stage.entrypoints, ...entrypoints] : entrypoints
  options.stage = stage
  const pkg = (options.assets?.ui && !options.assets.ui.only) ? null : JSON.parse(await drive.get('node_modules/pear-electron/package.json'))
  options.assets = options.assets ?? pkg?.pear?.assets
  options.assets.ui.only = options.assets?.ui?.only ?? pkg?.pear?.assets?.ui?.only
  return options
}

pipe.on('end', () => { Pear.pipe.end() })

pipe.once('data', (data) => {
  const options = cenc.decode(cenc.any, data)
  configure(options).then((config) => {
    const buffer = cenc.encode(cenc.any, { tag: 'configure', data: config })
    pipe.end(buffer)
  }, (err) => {
    pipe.destroy(err)
  })
})

function normalize (pathname) {
  if (pathname[0] === '/' && pathname[2] === ':') return path.normalize(pathname.slice(1))
  return path.normalize(pathname)
}
