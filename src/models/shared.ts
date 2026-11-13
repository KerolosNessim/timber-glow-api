import { Schema } from 'mongoose'

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const
export const BADGES = ['new', 'bestseller'] as const

export const LocalizedSchema = new Schema({ ar: { type: String, default: '' }, en: { type: String, default: '' } }, { _id: false })

export const PhotoSchema = new Schema(
  {
    src: { type: String, required: true },
    /** Cloudinary public id, empty for photos that live in the storefront's /public */
    publicId: String,
    alt: { type: LocalizedSchema, default: () => ({}) },
    focus: String,
  },
  { _id: false },
)

/** Hide Mongo internals so responses match the storefront types exactly. */
export const cleanJSON = {
  versionKey: false,
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret._id
    return ret
  },
}
