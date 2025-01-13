'use strict'
const test = require('brittle')
const IPC = require('pear-ipc')
const API = require('pear-api')
const Runtime = require('../runtime')

const ipc = new IPC.Client()
const state = {}
global.Pear = new API(ipc, state)

test('test Runtime', async (t) => {
  const runtime = new Runtime()
  console.log(runtime)
  // TODO: implement test after fixing the early access to global.Pear in pear-api/constants.js
})
