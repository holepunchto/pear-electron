'use strict'
const electron = require('electron')
const { command } = require('paparam')
const { SWAP } = require('pear-constants')
const API = require('pear-api')
const crasher = require('pear-crasher')
const rundef = require('pear-cmd/run')
const State = require('pear-state')
const GUI = require('./gui/gui')
const argv = process.argv.slice(2) // ['path-to-runtime', 'run' ...args]

crasher('electron-main', SWAP, argv.indexOf('--log') > -1)
const run = command('run', ...rundef, electronMain)
run.parse(argv)
run.running?.catch(console.error)

async function electronMain (cmd) {
  const state = new State({
    startId: global.Pear.constructor.RTI.startId,
    dir: global.Pear.constructor.RTI.dir,
    link: cmd.args.link.replace('_||', '://'), // for Windows
    flags: cmd.flags,
    args: cmd.rest
  })

  if (state.error) {
    console.error(state.error)
    electron.app.quit(1)
    return
  }

  const gui = new GUI({ state })
  global.Pear = new API(gui.ipc, state)
  await gui.ready()
  // note: would be unhandled rejection on failure, but should never fail:
  const wakeup = await gui.ipc.wakeup(state.link, state.storage, state.key === null ? state.dir : null, true)
  if (wakeup) {
    electron.app.quit(0)
    return
  }

  electron.ipcMain.on('send-to', (e, id, channel, message) => { electron.webContents.fromId(id)?.send(channel, message) })

  const app = await gui.app()

  app.unloading().then(async () => {
    await app.close()
  }) // note: would be unhandled rejection on failure, but should never fail

  await app.cutover()
}
