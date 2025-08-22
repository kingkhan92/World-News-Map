import { Router } from 'express'
import authRoutes from './auth.js'
import newsRoutes from './news.js'
import userRoutes from './user.js'
import healthRoutes from './health.js'

const router = Router()

// Mount all route modules
router.use('/auth', authRoutes)
router.use('/news', newsRoutes)
router.use('/user', userRoutes)
router.use('/health', healthRoutes)

export default router