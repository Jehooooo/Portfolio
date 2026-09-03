import { MongoClient, MongoClientOptions, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || ''
const dbName = process.env.MONGODB_DB_NAME || 'jehosue_ai'

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (!uri) {
  // Provide a rejected promise so serverless callers handle missing config gracefully
  clientPromise = Promise.reject(new Error('MONGODB_URI is not defined in environment variables'))
} else if (process.env.NODE_ENV === 'development') {
  // In development, preserve connection across hot module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production (Vercel Serverless / Lambda), cache connection across invocations
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
}

export default clientPromise

/**
 * Returns a connected Db instance or null if unavailable.
 * Safe to call in any serverless API route without crashing.
 */
export async function getDatabase(): Promise<Db | null> {
  if (!uri) {
    return null
  }
  try {
    const connectedClient = await clientPromise
    return connectedClient.db(dbName)
  } catch (error) {
    console.error('[MongoDB] Connection error:', error)
    return null
  }
}
