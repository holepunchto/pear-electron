/** @typedef {import('pear-interface')} */ /* global Pear */
'use strict'
module.exports = Pear.constructor.ui ? Pear[Pear.constructor.ui] : require('./runtime')
