import { Schema, model, type InferSchemaType } from 'mongoose'
import { BADGES, LocalizedSchema, PhotoSchema, cleanJSON } from './shared'

const CategorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    group: { type: String, enum: ['tops', 'bottoms'], required: true },
    name: { type: LocalizedSchema, required: true },
    description: { type: LocalizedSchema, default: () => ({}) },
    photo: { type: PhotoSchema, required: true },
    styles: { type: Number, default: 0 },
    badge: { type: String, enum: BADGES },
    /** Display order in the storefront, ascending */
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: cleanJSON },
)

export type CategoryDoc = InferSchemaType<typeof CategorySchema>
export const Category = model('Category', CategorySchema)
