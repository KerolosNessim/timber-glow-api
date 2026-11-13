import { Schema, model, type InferSchemaType } from 'mongoose'
import { LocalizedSchema, SIZES, cleanJSON } from './shared'

export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

const OrderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: LocalizedSchema, required: true },
    color: String,
    photo: String,
    size: { type: String, enum: SIZES, required: true },
    qty: { type: Number, required: true, min: 1 },
    /** Unit price at the time of the order */
    price: { type: Number, required: true },
  },
  { _id: false },
)

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    governorate: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    notes: { type: String, default: '' },
  },
  { _id: false },
)

const OrderSchema = new Schema(
  {
    /** e.g. "TG-1001" */
    number: { type: String, required: true, unique: true },
    customer: { type: CustomerSchema, required: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    /** Agreed with the customer on WhatsApp, entered by the admin */
    shippingFee: { type: Number, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'new' },
    statusHistory: {
      type: [{ _id: false, status: { type: String, enum: ORDER_STATUSES }, at: { type: Date, default: Date.now } }],
      default: () => [{ status: 'new' }],
    },
    /** True once stock was deducted (on confirm), so cancelling knows to restore it */
    stockDeducted: { type: Boolean, default: false },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true, toJSON: { ...cleanJSON, virtuals: true } },
)

OrderSchema.virtual('total').get(function (this: { subtotal: number; shippingFee?: number | null }) {
  return this.subtotal + (this.shippingFee ?? 0)
})

OrderSchema.index({ status: 1, createdAt: -1 })
OrderSchema.index({ createdAt: -1 })
OrderSchema.index({ 'customer.phone': 1 })

export type OrderDoc = InferSchemaType<typeof OrderSchema>
export const Order = model('Order', OrderSchema)
