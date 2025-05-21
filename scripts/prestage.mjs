import bootstrap from './bootstrap'
await bootstrap
await import('./decal')
const { default: bundle } = await import('./bundle')
await bundle
