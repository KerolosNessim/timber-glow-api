import mongoose from 'mongoose'
import { env } from './config'
import { HttpError } from './lib/http'

/**
 * Serverless functions are re-invoked many times in the same process, so the
 * connection is cached on `global` instead of opening a new one per request.
 */
const cache = globalThis as typeof globalThis & { _mongoose?: Promise<typeof mongoose> }

export function connectDB() {
  if (!cache._mongoose) {
    cache._mongoose = mongoose
      // Fail in seconds (not at the function timeout) when the database can't be reached.
      .connect(env.mongoUri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
      .catch((err: Error) => {
        cache._mongoose = undefined
        console.error('MongoDB connection failed:', err.message)
        throw new HttpError(503, 'Database unavailable. Check MONGODB_URI and Atlas Network Access (0.0.0.0/0).')
      })
  }
  return cache._mongoose
}
