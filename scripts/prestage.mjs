import bootstrap from './bootstrap'
await bootstrap
await import('./decal')
const { default: prebuilds } = await import('./prebuilds')
await prebuilds
