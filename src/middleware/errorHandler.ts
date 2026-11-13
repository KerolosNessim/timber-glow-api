import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../lib/http'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid input', issues: err.issues })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
