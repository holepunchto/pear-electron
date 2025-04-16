'use strict'
const Localdrive = require('localdrive')

function srcs (html){
  return [
    ...(html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gis))
  ].map(m => m[1] || m[2] || m[3])
}

async function configure (options) {
  const { stage = {} } = options
  const ignore = ['/node_modules/**/prebuilds', '!/node_modules/pear-electron/prebuilds']
  const { pathname } = new URL(global.Pear.config.applink + '/')
  const drive = new Localdrive(pathname)
  const html = (await drive.get(options.gui.main)).toString()
  const entrypoints = srcs(html)
  stage.ignore = Array.isArray(stage.ignore) ? [...stage.ignore, ...ignore] : ignore
  stage.entrypoints = Array.isArray(stage.entrypoints) ? [...stage.entrypoints, ...entrypoints] : entrypoints

  options.via = undefined
  options.stage = stage

  return options
}

module.exports = () => new Promise((resolve, reject) => {
  Pear.pipe.on('end', () => {
    Pear.pipe.end()
    resolve()
  })
  Pear.pipe.once('data', (options) => {
    configure(JSON.parse(options)).then((config) => { 
      Pear.pipe.end(JSON.stringify(config))
      resolve()
    }, reject)
  })
})
