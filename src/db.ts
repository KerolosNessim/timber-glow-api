import mongoose from 'mongoose'
import { env } from './config'

/**
 * Serverless functions are re-invoked many times in the same process, so the
 * connection is cached on `global` instead of opening a new one per request.
 */
const cache = globalThis as typeof globalThis & { _mongoose?: Promise<typeof mongoose> }

export function connectDB() {
  if (!cache._mongoose) {
    cache._mongoose = mongoose.connect(env.mongoUri, { maxPoolSize: 5 }).catch((err) => {
      cache._mongoose = undefined
      throw err
    })
  }
  return cache._mongoose
}
