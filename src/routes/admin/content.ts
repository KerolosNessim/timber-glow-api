import { Router } from 'express'
import { HomeContent } from '../../models/HomeContent'
import { getSettings } from '../../models/Settings'
import { destroyImages, removedImages } from '../../lib/cloudinary'
import { homeContentInput, settingsInput } from '../../lib/schemas'

/** Home page content and store settings. */
export const adminContentRouter = Router()

adminContentRouter.get('/home', async (_req, res) => {
  const doc = await HomeContent.findOne({ key: 'home' })
  res.json({ data: doc?.content ?? null })
})

adminContentRouter.put('/home', async (req, res) => {
  const content = homeContentInput.parse(req.body)
  const before = await HomeContent.findOne({ key: 'home' })
  await HomeContent.updateOne({ key: 'home' }, { $set: { content } }, { upsert: true })
  await destroyImages(removedImages(before?.content, content))
  res.json({ data: content })
})

adminContentRouter.get('/settings', async (_req, res) => {
  res.json({ data: await getSettings() })
})

adminContentRouter.put('/settings', async (req, res) => {
  const input = settingsInput.parse(req.body)
  const settings = await getSettings()
  settings.set(input)
  await settings.save()
  res.json({ data: settings })
})
