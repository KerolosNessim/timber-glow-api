import { Router } from 'express'
import mongoose, { type ClientSession } from 'mongoose'
import { ORDER_STATUSES, Order, type OrderStatus } from '../../models/Order'
import { Product } from '../../models/Product'
import { HttpError, notFound } from '../../lib/http'
import { orderUpdateInput } from '../../lib/schemas'
import { parseDay } from '../../lib/time'
import { customerChatLink } from '../../lib/whatsapp'

export const adminOrdersRouter = Router()

const PAGE_SIZE = 20

/** Statuses where the pieces have left (or are leaving) the stock. */
const HOLDS_STOCK: OrderStatus[] = ['confirmed', 'shipped', 'delivered']

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

adminOrdersRouter.get('/', async (req, res) => {
  const { status, q, from, to } = req.query as Record<string, string | undefined>
  const page = Math.max(1, Number(req.query.page) || 1)

  const filter: Record<string, unknown> = {}
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) filter.status = status
  if (q?.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i')
    filter.$or = [{ number: rx }, { 'customer.name': rx }, { 'customer.phone': rx }]
  }
  const start = parseDay(from)
  const end = parseDay(to, 1)
  if (start || end) filter.createdAt = { ...(start && { $gte: start }), ...(end && { $lt: end }) }

  const [items, total, counts] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: OrderStatus; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])

  res.json({
    data: {
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    },
  })
})

adminOrdersRouter.get('/:number', async (req, res) => {
  const order = await Order.findOne({ number: req.params.number })
  if (!order) throw notFound('Order')
  res.json({ data: { ...order.toJSON(), customerChatUrl: customerChatLink(order.customer.phone) } })
})

type StockLine = { productId: string; size: string; qty: number; name: { ar: string } }

/** Takes the order's pieces out of stock. Fails (and the transaction rolls back) if a size ran out. */
async function deductStock(items: StockLine[], session: ClientSession) {
  for (const item of items) {
    const result = await Product.updateOne(
      { id: item.productId, stock: { $elemMatch: { size: item.size, qty: { $gte: item.qty } } } },
      { $inc: { 'stock.$.qty': -item.qty } },
      { session },
    )
    if (result.modifiedCount === 0) {
      const product = await Product.findOne({ id: item.productId }).session(session)
      const left = product?.stock.find((s) => s.size === item.size)?.qty ?? 0
      throw new HttpError(
        409,
        product
          ? `مقاس ${item.size} من «${item.name.ar}» فاضل منه ${left} بس، والأوردر محتاج ${item.qty}.`
          : `المنتج «${item.name.ar}» اتحذف، مينفعش تأكد الأوردر ده.`,
      )
    }
  }
}

/** Puts the pieces back. A product deleted since is skipped. */
async function restoreStock(items: StockLine[], session: ClientSession) {
  for (const item of items) {
    const filter: Record<string, unknown> = { id: item.productId, 'stock.size': item.size }
    await Product.updateOne(filter, { $inc: { 'stock.$.qty': item.qty } }, { session })
  }
}

adminOrdersRouter.patch('/:number', async (req, res) => {
  const input = orderUpdateInput.parse(req.body)
  const session = await mongoose.startSession()
  try {
    const order = await session.withTransaction(async () => {
      const order = await Order.findOne({ number: req.params.number }).session(session)
      if (!order) throw notFound('Order')

      if (input.status && input.status !== order.status) {
        const holds = HOLDS_STOCK.includes(input.status)
        if (holds && !order.stockDeducted) {
          await deductStock(order.items, session)
          order.stockDeducted = true
        } else if (!holds && order.stockDeducted) {
          await restoreStock(order.items, session)
          order.stockDeducted = false
        }
        order.status = input.status
        order.statusHistory.push({ status: input.status, at: new Date() })
      }
      if (input.shippingFee !== undefined) order.shippingFee = input.shippingFee ?? undefined
      if (input.adminNotes !== undefined) order.adminNotes = input.adminNotes

      await order.save({ session })
      return order
    })
    res.json({ data: { ...order.toJSON(), customerChatUrl: customerChatLink(order.customer.phone) } })
  } finally {
    await session.endSession()
  }
})
