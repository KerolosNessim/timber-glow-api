import { Schema, model } from 'mongoose'
import { cleanJSON } from './shared'

const SocialSchema = new Schema(
  {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    tiktok: { type: String, default: '' },
  },
  { _id: false },
)

const SettingsSchema = new Schema(
  {
    key: { type: String, default: 'store', unique: true },
    /** International format without + or spaces, e.g. 201001234567 */
    whatsappNumber: { type: String, default: '' },
    social: { type: SocialSchema, default: () => ({}) },
  },
  { timestamps: true, toJSON: cleanJSON },
)

export const Settings = model('Settings', SettingsSchema)

export async function getSettings() {
  return (await Settings.findOne({ key: 'store' })) ?? (await Settings.create({ key: 'store' }))
}
