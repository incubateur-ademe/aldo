const { MongoClient } = require('mongodb')

const connectionString = process.env.ATLAS_URI || ''

const client = new MongoClient(connectionString)

module.exports = {
  dbPromise: client.connect().then((conn) => conn.db('aldo'))
}
