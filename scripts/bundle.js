'use strict'
const bundle = module.exports = require('../lib/bundle')
if (require.main === module) bundle().catch(console.error)
