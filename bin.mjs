#!/usr/bin/env pear run
import bootstrap from './scripts/bootstrap.js'
import './scripts/decal.js'
import './scripts/bundle.mjs'

await bootstrap.download()
