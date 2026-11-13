import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config'
import { connectDB } from './db'
import { errorHandler } from './middleware/errorHandler'
import { adminRouter } from './routes/admin'
import { LOCAL_UPLOAD_DIR } from './routes/admin/uploads'
import { publicRouter } from './routes/public'
import { ordersRouter } from './routes/public/orders'

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: env.corsOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Images uploaded locally when Cloudinary isn't configured (development only).
if (!env.isProduction) app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '1d' }))

// Open (or reuse) the database connection before any route that needs it.
app.use(async (_req, _res, next) => {
  await connectDB()
  next()
})

app.use(
  '/admin',
  (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  },
  adminRouter,
)
app.use(publicRouter)
app.use(ordersRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use(errorHandler)
