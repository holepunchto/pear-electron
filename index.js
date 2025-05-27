/** @typedef {import('pear-interface')} */ /* global Pear */
'use strict'
module.exports = Pear.constructor.UI ? Pear[Pear.constructor.UI] : (Pear.pipe ? require('./pre') : require('./runtime'))
