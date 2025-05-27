'use strict'
const fs = require('fs')
const download = module.exports = require('../lib/bootstrap')

if (require.main === module) {
  if (download.ARCHDUMP) {
    const downloading = download(true)
    downloading.catch(console.error).then(advise)
  } else if (download.DLRUNTIME || fs.existsSync(download.HOST) === false) {
    const downloading = download(false)
    downloading.catch(console.error)
    if (download.DLRUNTIME === false) downloading.catch(console.error).then(advise)
  } else {
    advise()
  }
}

function advise () {
  console.log('Done')
}
