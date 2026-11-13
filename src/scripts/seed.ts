/**
 * Copies the storefront's dummy data (src/mocks/data in timber-glow-react) into MongoDB.
 * Run once after creating the database:  npm run seed
 * Pass --force to wipe and re-import categories, products and home content.
 */
import 'dotenv/config'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import mongoose from 'mongoose'
import { connectDB } from '../db'
import { Category } from '../models/Category'
import { HomeContent } from '../models/HomeContent'
import { Product } from '../models/Product'
import { getSettings } from '../models/Settings'

/** Starting quantity for every size, so nothing shows as sold out right after seeding. */
const DEFAULT_QTY = 10

async function main() {
  const dir = path.resolve(process.env.FRONT_MOCKS_DIR ?? '../timber-glow-react/src/mocks/data')
  const force = process.argv.includes('--force')

  // file:// URLs so the dynamic import also works with Windows drive paths
  const load = (file: string) => import(pathToFileURL(path.join(dir, file)).href)
  const { categories } = await load('categories.ts')
  const { products } = await load('products.ts')
  const { homeContent } = await load('home.ts')

  await connectDB()

  if (force) {
    await Promise.all([Category.deleteMany({}), Product.deleteMany({}), HomeContent.deleteMany({})])
  } else if (await Product.exists({})) {
    console.log('Database already has products. Use `npm run seed -- --force` to replace them.')
    return
  }

  await Category.insertMany(categories.map((c: object, i: number) => ({ ...c, order: i })))
  await Product.insertMany(
    products.map(({ sizes, ...p }: { sizes: string[] }, i: number) => ({
      ...p,
      order: i,
      stock: sizes.map((size) => ({ size, qty: DEFAULT_QTY })),
    })),
  )
  await HomeContent.create({ key: 'home', content: homeContent })
  await getSettings()

  console.log(`Seeded ${categories.length} categories, ${products.length} products and the home page.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
