import { Router } from 'express'
import { ORDER_NUMBER_OFFSET, nextSequence } from '../../models/Counter'
import { Order } from '../../models/Order'
import { Product } from '../../models/Product'
import { getSettings } from '../../models/Settings'
import { HttpError } from '../../lib/http'
import { orderInput } from '../../lib/schemas'
import { orderMessage, whatsappLink } from '../../lib/whatsapp'

export const ordersRouter = Router()

/**
 * Checkout. Prices and availability come from the database, never from the client.
 * Stock is only checked here; it is deducted when the admin confirms the order.
 */
ordersRouter.post('/orders', async (req, res) => {
  const input = orderInput.parse(req.body)
  if (input.website) throw new HttpError(400, 'Invalid input')

  // Merge repeated lines (same product and size).
  const wanted = new Map<string, { productId: string; size: (typeof input.items)[number]['size']; qty: number }>()
  for (const item of input.items) {
    const key = `${item.productId}:${item.size}`
    const prev = wanted.get(key)
    wanted.set(key, { ...item, qty: (prev?.qty ?? 0) + item.qty })
  }

  const ids = [...new Set([...wanted.values()].map((i) => i.productId))]
  const products = new Map((await Product.find({ id: { $in: ids }, isActive: true })).map((p) => [p.id, p]))

  const unavailable: { productId: string; size: string; available: number }[] = []
  const items = [...wanted.values()].flatMap((line) => {
    const product = products.get(line.productId)
    const available = product?.stock.find((s) => s.size === line.size)?.qty ?? 0
    if (!product || available < line.qty) {
      unavailable.push({ productId: line.productId, size: line.size, available })
      return []
    }
    return [
      {
        productId: product.id,
        name: { ar: product.name.ar, en: product.name.en },
        color: product.color,
        photo: product.photo.src,
        size: line.size,
        qty: line.qty,
        price: product.price,
      },
    ]
  })

  if (unavailable.length) {
    res.status(409).json({ error: 'Some items are no longer available', unavailable })
    return
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const number = `TG-${ORDER_NUMBER_OFFSET + (await nextSequence('order'))}`
  const order = await Order.create({ number, customer: input.customer, items, subtotal })

  const settings = await getSettings()
  const message = orderMessage(order, input.lang)
  res.status(201).json({
    data: {
      number: order.number,
      subtotal,
      whatsappUrl: settings.whatsappNumber ? whatsappLink(settings.whatsappNumber, message) : null,
    },
  })
})
