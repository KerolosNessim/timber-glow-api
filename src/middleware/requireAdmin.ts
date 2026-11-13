import type { CookieOptions, RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config'
import { HttpError } from '../lib/http'

export const AUTH_COOKIE = 'tg_admin'
const SESSION_DAYS = 7

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    domain: env.cookieDomain,
    path: '/',
  }
}

export function startSession(res: Response, email: string) {
  const token = jwt.sign({ sub: email, role: 'admin' }, env.jwtSecret, { expiresIn: `${SESSION_DAYS}d` })
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 })
}

export function endSession(res: Response) {
  res.clearCookie(AUTH_COOKIE, cookieOptions())
}

/** Rejects the request with 401 unless it carries a valid admin session cookie. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined
  if (!token) throw new HttpError(401, 'Not signed in')
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload
    req.adminEmail = String(payload.sub)
  } catch {
    throw new HttpError(401, 'Session expired')
  }
  next()
}

declare module 'express-serve-static-core' {
  interface Request {
    adminEmail?: string
  }
}
