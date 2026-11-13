import { Schema, model } from 'mongoose'
import { cleanJSON } from './shared'

/**
 * Single document holding the whole home page (slides, perks, intro, look, lookbook).
 * The shape is validated with zod in the admin route, so it is stored as-is here.
 */
const HomeContentSchema = new Schema(
  {
    key: { type: String, default: 'home', unique: true },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, toJSON: cleanJSON },
)

export const HomeContent = model('HomeContent', HomeContentSchema)
