import { Router } from 'express'
import { Category } from '../../models/Category'
import { Product } from '../../models/Product'
import { HttpError, notFound } from '../../lib/http'
import { productInput } from '../../lib/schemas'
import { collectPublicIds, destroyImages, removedImages } from '../../lib/cloudinary'

export const adminProductsRouter = Router()

/** Every product, including hidden ones, with the full stock table. */
adminProductsRouter.get('/', async (req, res) => {
  const filter: Record<string, unknown> = {}
  if (typeof req.query.category === 'string' && req.query.category) filter.categorySlug = req.query.category
  const list = await Product.find(filter).sort({ order: 1, createdAt: 1 })
  res.json({ data: list })
})

adminProductsRouter.get('/:id', async (req, res) => {
  const doc = await Product.findOne({ id: req.params.id })
  if (!doc) throw notFound('Product')
  res.json({ data: doc })
})

async function assertCategoryExists(slug: string) {
  if (!(await Category.exists({ slug }))) throw new HttpError(400, `Category "${slug}" does not exist`)
}

adminProductsRouter.post('/', async (req, res) => {
  const input = productInput.parse(req.body)
  await assertCategoryExists(input.categorySlug)
  if (await Product.exists({ id: input.id })) throw new HttpError(409, `A product with id "${input.id}" already exists`)
  const last = await Product.findOne().sort({ order: -1 }).select('order')
  const doc = await Product.create({ ...input, order: (last?.order ?? -1) + 1 })
  res.status(201).json({ data: doc })
})

/** The id is the product's URL and is referenced by orders, so it cannot be changed here. */
adminProductsRouter.put('/:id', async (req, res) => {
  const input = productInput.parse({ ...req.body, id: req.params.id })
  await assertCategoryExists(input.categorySlug)
  const { compareAtPrice, badge, ...rest } = input
  const unset: Record<string, 1> = {}
  if (compareAtPrice == null) unset.compareAtPrice = 1
  if (!badge) unset.badge = 1
  const before = await Product.findOne({ id: req.params.id })
  if (!before) throw notFound('Product')
  const doc = await Product.findOneAndUpdate(
    { id: req.params.id },
    {
      $set: { ...rest, ...(compareAtPrice != null && { compareAtPrice }), ...(badge && { badge }) },
      ...(Object.keys(unset).length && { $unset: unset }),
    },
    { new: true, runValidators: true },
  )
  if (!doc) throw notFound('Product')
  await destroyImages(removedImages(before.toJSON(), doc.toJSON()))
  res.json({ data: doc })
})

adminProductsRouter.delete('/:id', async (req, res) => {
  const doc = await Product.findOneAndDelete({ id: req.params.id })
  if (!doc) throw notFound('Product')
  await destroyImages([...collectPublicIds(doc.toJSON())])
  res.json({ data: { id: doc.id } })
})
