import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { env } from '../../config'
import { HttpError } from '../../lib/http'
import { endSession, requireAdmin, startSession } from '../../middleware/requireAdmin'

export const authRouter = Router()

const loginInput = z.object({ email: z.string().trim().toLowerCase(), password: z.string() })

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginInput.parse(req.body)
  // Always run bcrypt so a wrong email takes as long as a wrong password.
  const passwordOk = await bcrypt.compare(password, env.adminPasswordHash)
  if (email !== env.adminEmail || !passwordOk) throw new HttpError(401, 'Wrong email or password')
  startSession(res, email)
  res.json({ data: { email } })
})

authRouter.post('/logout', (_req, res) => {
  endSession(res)
  res.json({ data: { ok: true } })
})

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ data: { email: req.adminEmail } })
})
