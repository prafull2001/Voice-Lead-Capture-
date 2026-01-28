import { Router } from 'express';
import healthRoutes from './health.routes.js';
import vapiRoutes from './vapi.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/webhooks/vapi', vapiRoutes);
router.use('/auth/google', authRoutes);
router.use('/admin', adminRoutes);

export default router;
