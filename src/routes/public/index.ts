import { Router } from 'express'
import { Category } from '../../models/Category'
import { HomeContent } from '../../models/HomeContent'
import { Product, toPublicProduct } from '../../models/Product'
import { getSettings } from '../../models/Settings'
import { notFound } from '../../lib/http'

/** Read-only storefront API. Every response is wrapped as `{ data }`, like the mocks were. */
export const publicRouter = Router()

publicRouter.get('/home', async (_req, res) => {
  const doc = await HomeContent.findOne({ key: 'home' })
  if (!doc) throw notFound('Home content')
  res.json({ data: doc.content })
})

publicRouter.get('/categories', async (req, res) => {
  const filter: Record<string, unknown> = { isActive: true }
  if (typeof req.query.group === 'string') filter.group = req.query.group
  const list = await Category.find(filter).sort({ order: 1, createdAt: 1 })
  res.json({ data: list })
})

publicRouter.get('/categories/:slug', async (req, res) => {
  const doc = await Category.findOne({ slug: req.params.slug, isActive: true })
  if (!doc) throw notFound('Category')
  res.json({ data: doc })
})

publicRouter.get('/products', async (req, res) => {
  const filter: Record<string, unknown> = { isActive: true }
  if (typeof req.query.category === 'string') filter.categorySlug = req.query.category
  if (typeof req.query.ids === 'string') filter.id = { $in: req.query.ids.split(',').filter(Boolean) }
  const list = await Product.find(filter).sort({ order: 1, createdAt: 1 })
  res.json({ data: list.map(toPublicProduct) })
})

publicRouter.get('/products/:id', async (req, res) => {
  const doc = await Product.findOne({ id: req.params.id, isActive: true })
  if (!doc) throw notFound('Product')
  res.json({ data: toPublicProduct(doc) })
})

publicRouter.get('/settings', async (_req, res) => {
  const s = await getSettings()
  res.json({ data: { whatsappNumber: s.whatsappNumber, social: s.social } })
})
