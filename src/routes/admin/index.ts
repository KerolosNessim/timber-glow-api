import { Router } from 'express'
import { requireAdmin } from '../../middleware/requireAdmin'
import { authRouter } from './auth'
import { adminCategoriesRouter } from './categories'
import { adminContentRouter } from './content'
import { adminOrdersRouter } from './orders'
import { adminProductsRouter } from './products'
import { adminStatsRouter } from './stats'
import { adminUploadsRouter } from './uploads'

/** Everything under /admin. Only login/logout/me are reachable without a session. */
export const adminRouter = Router()

adminRouter.use(authRouter)
adminRouter.use(requireAdmin)
adminRouter.use('/products', adminProductsRouter)
adminRouter.use('/categories', adminCategoriesRouter)
adminRouter.use('/orders', adminOrdersRouter)
adminRouter.use('/stats', adminStatsRouter)
adminRouter.use('/uploads', adminUploadsRouter)
adminRouter.use(adminContentRouter)
