'use strict'
const path = require('path')
const fs = require('fs')
const { pathname } = new URL(global.Pear.config.applink + '/')
const fonts = fs.readFileSync(path.join(pathname, 'fonts.css'), { encoding: 'utf8' }).split('\n')
const decal = fs.readFileSync(path.join(pathname, 'decal.html'), { encoding: 'utf8' }).split('\n')

const indices = []
const srcs = fonts
  .filter((line, index) => {
    const match = line.includes('url(')
    if (match) indices.push(index)
    return match
  })
  .map((line) => {
    const file = line.slice(12, -20)
    const data = fs.readFileSync(file).toString('base64')
    return `  src: url('data:font/woff2;base64,${data}') format('woff2'));`
  })

for (const src of srcs) fonts[indices.shift()] = src

const index = decal.findIndex((line) => line.includes('<link rel="stylesheet" href="./fonts.css">'))

decal[index] = '<style>\n' + fonts.join('\n') + '\n</style>'

const js = `// GENERATED, DO NOT MODIFY\nmodule.exports = 'data:text/html;base64,${Buffer.from(decal.join('\n')).toString('base64')}'`

fs.writeFileSync(path.join(pathname, 'gui', 'decal.js'), js)

console.log('gui/decal.js generated')
