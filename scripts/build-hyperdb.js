const Hyperschema = require('hyperschema')
const Builder = require('hyperdb/builder')

const SCHEMA_DIR = './spec/schema'
const DB_DIR = './spec/db'

const schema = Hyperschema.from(SCHEMA_DIR, { versioned: false })
const electronSchema = schema.namespace('electron')

electronSchema.register({
  name: 'appStorage',
  fields: [
    {
      name: 'key',
      type: 'string',
      required: true
    },
    {
      name: 'value',
      type: 'string',
      required: true
    }
  ]
})

Hyperschema.toDisk(schema)

const db = Builder.from(SCHEMA_DIR, DB_DIR)
const electronDB = db.namespace('electron')

electronDB.collections.register({
  name: 'appStorage',
  schema: '@electron/appStorage',
  key: ['key']
})

Builder.toDisk(db)
