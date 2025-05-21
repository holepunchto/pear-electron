/** @typedef {import('pear-interface')} */ /* global Pear */
import ui from 'pear-electron'

document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

console.log(await ui.dimensions()) // log app dimensions