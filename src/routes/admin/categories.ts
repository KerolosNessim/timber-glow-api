import { Router } from 'express'
import { z } from 'zod'
import { Category } from '../../models/Category'
import { Product } from '../../models/Product'
import { HttpError, notFound } from '../../lib/http'
import { categoryInput } from '../../lib/schemas'
import { collectPublicIds, destroyImages, removedImages } from '../../lib/cloudinary'

export const adminCategoriesRouter = Router()

/** Every category, including hidden ones, with how many products each has. */
adminCategoriesRouter.get('/', async (_req, res) => {
  const [list, counts] = await Promise.all([
    Category.find().sort({ order: 1, createdAt: 1 }),
    Product.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$categorySlug', n: { $sum: 1 } } }]),
  ])
  const bySlug = new Map(counts.map((c) => [c._id, c.n]))
  res.json({ data: list.map((c) => ({ ...c.toJSON(), productCount: bySlug.get(c.slug) ?? 0 })) })
})

adminCategoriesRouter.get('/:id', async (req, res) => {
  const doc = await Category.findOne({ id: req.params.id })
  if (!doc) throw notFound('Category')
  res.json({ data: doc })
})

adminCategoriesRouter.post('/', async (req, res) => {
  const input = categoryInput.parse(req.body)
  const id = input.id ?? `cat-${input.slug}`
  if (await Category.exists({ $or: [{ id }, { slug: input.slug }] })) {
    throw new HttpError(409, `A category with slug "${input.slug}" already exists`)
  }
  const last = await Category.findOne().sort({ order: -1 }).select('order')
  const doc = await Category.create({ ...input, id, badge: input.badge ?? undefined, order: (last?.order ?? -1) + 1 })
  res.status(201).json({ data: doc })
})

/** New order of categories, as a list of ids. Registered before /:id so "order" isn't read as an id. */
adminCategoriesRouter.put('/order', async (req, res) => {
  const ids = z.array(z.string()).parse(req.body?.ids)
  await Category.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { id }, update: { $set: { order } } } })))
  res.json({ data: { ok: true } })
})

adminCategoriesRouter.put('/:id', async (req, res) => {
  const input = categoryInput.parse(req.body)
  const current = await Category.findOne({ id: req.params.id })
  if (!current) throw notFound('Category')

  if (input.slug !== current.slug) {
    if (await Category.exists({ slug: input.slug })) throw new HttpError(409, `A category with slug "${input.slug}" already exists`)
    // Products point at their category by slug, so move them along with it.
    await Product.updateMany({ categorySlug: current.slug }, { $set: { categorySlug: input.slug } })
  }

  const before = current.toJSON()
  const { badge, id: _ignored, ...rest } = input
  current.set({ ...rest, badge: badge ?? undefined })
  await current.save()
  await destroyImages(removedImages(before, current.toJSON()))
  res.json({ data: current })
})

adminCategoriesRouter.delete('/:id', async (req, res) => {
  const doc = await Category.findOne({ id: req.params.id })
  if (!doc) throw notFound('Category')
  const n = await Product.countDocuments({ categorySlug: doc.slug })
  if (n > 0) throw new HttpError(409, `This category still has ${n} products. Move or delete them first.`)
  await doc.deleteOne()
  await destroyImages([...collectPublicIds(doc.toJSON())])
  res.json({ data: { id: doc.id } })
})
