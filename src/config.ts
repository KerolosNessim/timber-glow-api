function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

export const env = {
  get mongoUri() {
    return required('MONGODB_URI')
  },
  get jwtSecret() {
    return required('JWT_SECRET')
  },
  get adminEmail() {
    return required('ADMIN_EMAIL').toLowerCase()
  },
  get adminPasswordHash() {
    return required('ADMIN_PASSWORD_HASH')
  },
  /** e.g. ".yourdomain.com" in production so the cookie works on the store and api subdomains */
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
  port: Number(process.env.PORT ?? 3000),
}
