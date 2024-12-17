#!/usr/bin/env pear run
import bootstrap from './scripts/bootstrap.js'
import './scripts/bundle.mjs'

await bootstrap.download()
