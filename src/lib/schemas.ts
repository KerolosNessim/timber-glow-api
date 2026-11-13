import { z } from 'zod'
import { BADGES, SIZES } from '../models/shared'

/** Shared input schemas for the admin API. */

export const localized = z.object({ ar: z.string().trim(), en: z.string().trim() })

export const photo = z.object({
  src: z.string().trim().min(1, 'Photo is required'),
  publicId: z.string().optional(),
  alt: localized,
  focus: z.string().trim().optional(),
})

/** Lowercase letters, digits and dashes, used for product ids and category slugs */
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes only')

const badge = z.enum(BADGES).nullish()

export const productInput = z.object({
  id: slug,
  categorySlug: slug,
  name: localized.refine((n) => n.ar && n.en, 'Both names are required'),
  color: z.string().trim().min(1),
  swatch: z.string().trim().min(1),
  family: z.string().trim().optional(),
  gsm: z.coerce.number().int().positive(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().nullish(),
  photo,
  gallery: z.array(photo).default([]),
  stock: z
    .array(z.object({ size: z.enum(SIZES), qty: z.coerce.number().int().min(0) }))
    .min(1, 'Add at least one size')
    .refine((s) => new Set(s.map((r) => r.size)).size === s.length, 'Each size can appear once'),
  badge,
  isActive: z.boolean().default(true),
})

/** Arabic-Indic digits → Western, spaces and dashes removed, +20/0020 prefix → 0 */
export function normalizePhone(raw: string) {
  return raw
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d+]/g, '')
    .replace(/^(\+20|0020)/, '0')
}

export const orderInput = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine((p) => /^01[0125]\d{8}$/.test(p), 'Enter a valid Egyptian mobile number'),
    governorate: z.string().trim().min(2).max(40),
    city: z.string().trim().min(2).max(60),
    address: z.string().trim().min(5).max(300),
    notes: z.string().trim().max(500).optional().default(''),
  }),
  items: z
    .array(z.object({ productId: z.string().min(1), size: z.enum(SIZES), qty: z.coerce.number().int().min(1).max(10) }))
    .min(1)
    .max(30),
  lang: z.enum(['ar', 'en']).default('ar'),
  /** Honeypot: hidden from people, bots fill it in */
  website: z.string().optional(),
})

export const orderUpdateInput = z.object({
  status: z.enum(['new', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  shippingFee: z.coerce.number().min(0).nullish(),
  adminNotes: z.string().max(2000).optional(),
})

const cta = z.object({ label: localized, to: z.string().trim().min(1) })

export const homeContentInput = z.object({
  slides: z
    .array(
      z.object({
        id: z.string().min(1),
        photo,
        eyebrow: z.discriminatedUnion('kind', [z.object({ kind: z.literal('spec'), text: z.string() }), z.object({ kind: z.literal('new') })]),
        title: localized,
        body: localized,
        cta,
      }),
    )
    .min(1, 'Keep at least one slide'),
  perks: z.array(z.object({ id: z.string().min(1), icon: z.enum(['truck', 'swap', 'cash', 'leaf']), title: localized, text: localized })),
  intro: z.object({ spec: z.string(), title: localized, body: localized }),
  look: z.object({
    id: z.string().min(1),
    title: z.string(),
    subtitle: localized,
    photo,
    productIds: z.array(z.string()),
    setPrice: z.coerce.number().min(0),
    hotspots: z.array(z.object({ productId: z.string(), x: z.coerce.number().min(0).max(100), y: z.coerce.number().min(0).max(100) })),
  }),
  lookbook: z.object({
    handle: z.string(),
    posts: z.array(z.object({ id: z.string().min(1), photo, href: z.string() })),
  }),
})

export const settingsInput = z.object({
  whatsappNumber: z
    .string()
    .transform(normalizePhone)
    .transform((n) => (n.startsWith('0') ? `2${n}` : n.replace(/^\+/, '')))
    .refine((n) => n === '' || /^\d{10,15}$/.test(n), 'Enter the number with the country code, e.g. 201001234567'),
  social: z.object({
    instagram: z.string().trim().default(''),
    facebook: z.string().trim().default(''),
    tiktok: z.string().trim().default(''),
  }),
})

export const categoryInput = z.object({
  id: slug.optional(),
  slug,
  group: z.enum(['tops', 'bottoms']),
  name: localized.refine((n) => n.ar && n.en, 'Both names are required'),
  description: localized,
  photo,
  styles: z.coerce.number().int().min(0).default(0),
  badge,
  isActive: z.boolean().default(true),
})
