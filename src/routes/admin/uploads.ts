import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import express, { Router } from 'express'
import { env } from '../../config'
import { signUpload } from '../../lib/cloudinary'
import { HttpError } from '../../lib/http'

export const adminUploadsRouter = Router()

/** Local development without Cloudinary: images are saved here and served at /uploads. */
export const LOCAL_UPLOAD_DIR = path.resolve('uploads')

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

/**
 * How the browser should upload: straight to Cloudinary with a signature,
 * or (only locally, when Cloudinary isn't set up) to POST /admin/uploads/local.
 */
adminUploadsRouter.post('/sign', (_req, res) => {
  const signed = signUpload()
  if (signed) {
    res.json({ data: { mode: 'cloudinary', ...signed } })
    return
  }
  if (env.isProduction) throw new HttpError(503, 'Cloudinary is not configured on the server (CLOUDINARY_* variables).')
  res.json({ data: { mode: 'local' } })
})

adminUploadsRouter.post('/local', express.raw({ type: 'image/*', limit: '10mb' }), async (req, res) => {
  if (env.isProduction) throw new HttpError(404, 'Not found')
  const ext = EXTENSIONS[req.get('content-type') ?? '']
  if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'Send an image (jpg, png, webp, avif or gif)')
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true })
  const name = `${crypto.randomUUID()}.${ext}`
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, name), req.body)
  res.status(201).json({ data: { src: `${req.protocol}://${req.get('host')}/uploads/${name}` } })
})
