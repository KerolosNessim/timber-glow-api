import { Schema, model, type InferSchemaType } from 'mongoose'
import { BADGES, LocalizedSchema, PhotoSchema, SIZES, cleanJSON } from './shared'

const StockSchema = new Schema(
  {
    size: { type: String, enum: SIZES, required: true },
    qty: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

const ProductSchema = new Schema(
  {
    /** Human-readable id used in storefront URLs, e.g. "ridge-black" */
    id: { type: String, required: true, unique: true },
    categorySlug: { type: String, required: true, index: true },
    name: { type: LocalizedSchema, required: true },
    color: { type: String, required: true },
    swatch: { type: String, required: true },
    family: { type: String, index: true },
    gsm: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    photo: { type: PhotoSchema, required: true },
    gallery: { type: [PhotoSchema], default: [] },
    /** One row per offered size. A size with qty 0 is shown as sold out. */
    stock: { type: [StockSchema], default: [] },
    badge: { type: String, enum: BADGES },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: cleanJSON },
)

export type ProductDoc = InferSchemaType<typeof ProductSchema>
export const Product = model('Product', ProductSchema)

/** Storefront shape: `sizes` lists every offered size, `soldOut` the ones with no stock. */
export function toPublicProduct(doc: InstanceType<typeof Product>) {
  const { stock, isActive, order, createdAt, updatedAt, ...rest } = doc.toJSON() as ProductDoc & Record<string, unknown>
  return {
    ...rest,
    sizes: stock.map((s) => s.size),
    soldOut: stock.filter((s) => s.qty <= 0).map((s) => s.size),
  }
}
