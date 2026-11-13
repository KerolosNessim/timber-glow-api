import crypto from 'node:crypto'

/**
 * Minimal Cloudinary helpers (no SDK): the browser uploads straight to Cloudinary
 * with a signature from us, so files never pass through Vercel's 4.5 MB body limit.
 */

export const UPLOAD_FOLDER = 'timber-glow'

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null
}

/** Cloudinary signature: sha1 of the sorted params joined with "&", followed by the secret. */
function sign(params: Record<string, string | number>, secret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHash('sha1').update(toSign + secret).digest('hex')
}

export function signUpload() {
  const cfg = cloudinaryConfig()
  if (!cfg) return null
  const timestamp = Math.round(Date.now() / 1000)
  const params = { folder: UPLOAD_FOLDER, timestamp }
  return { cloudName: cfg.cloudName, apiKey: cfg.apiKey, folder: UPLOAD_FOLDER, timestamp, signature: sign(params, cfg.apiSecret) }
}

/** Deletes images from Cloudinary. Failures are logged, never thrown: a leftover image is harmless. */
export async function destroyImages(publicIds: string[]) {
  const cfg = cloudinaryConfig()
  if (!cfg || publicIds.length === 0) return
  await Promise.all(
    publicIds.map(async (publicId) => {
      const timestamp = Math.round(Date.now() / 1000)
      const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: cfg.apiKey,
        signature: sign({ public_id: publicId, timestamp }, cfg.apiSecret),
      })
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`, { method: 'POST', body })
        if (!res.ok) console.warn('Cloudinary destroy failed', publicId, await res.text())
      } catch (err) {
        console.warn('Cloudinary destroy failed', publicId, err)
      }
    }),
  )
}

/** Every `publicId` found anywhere inside a document (photos, galleries, slides…). */
export function collectPublicIds(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectPublicIds(v, found))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'publicId' && typeof v === 'string' && v) found.add(v)
      else collectPublicIds(v, found)
    }
  }
  return found
}

/** Images that were in `before` but are gone from `after`. */
export function removedImages(before: unknown, after: unknown) {
  const kept = collectPublicIds(after)
  return [...collectPublicIds(before)].filter((id) => !kept.has(id))
}
