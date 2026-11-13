import { Router } from 'express'
import { Order } from '../../models/Order'
import { Product } from '../../models/Product'
import { cairoDayStart, cairoToday } from '../../lib/time'

export const adminStatsRouter = Router()

/** Orders that count as sales: confirmed or further along, not cancelled. */
const SOLD = { status: { $in: ['confirmed', 'shipped', 'delivered'] } }
const LOW_STOCK = 2

async function salesSince(since: Date) {
  const [row] = await Order.aggregate<{ revenue: number; orders: number }>([
    { $match: { ...SOLD, createdAt: { $gte: since } } },
    { $group: { _id: null, revenue: { $sum: '$subtotal' }, orders: { $sum: 1 } } },
  ])
  return { revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 }
}

adminStatsRouter.get('/', async (_req, res) => {
  const { y, m, d } = cairoToday()
  const [today, week, month, byStatus, topProducts, lowStock, latest] = await Promise.all([
    salesSince(cairoDayStart(y, m, d)),
    salesSince(cairoDayStart(y, m, d - 6)),
    salesSince(cairoDayStart(y, m, 1)),
    Order.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: SOLD },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          photo: { $first: '$items.photo' },
          qty: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, productId: '$_id', name: 1, photo: 1, qty: 1, revenue: 1 } },
    ]),
    Product.aggregate([
      { $unwind: '$stock' },
      { $match: { 'stock.qty': { $lte: LOW_STOCK } } },
      { $sort: { 'stock.qty': 1 } },
      { $limit: 20 },
      { $project: { _id: 0, productId: '$id', name: 1, color: 1, size: '$stock.size', qty: '$stock.qty' } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).select('number customer.name subtotal status createdAt'),
  ])

  res.json({
    data: {
      sales: { today, week, month },
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
      topProducts,
      lowStock,
      latest,
    },
  })
})
