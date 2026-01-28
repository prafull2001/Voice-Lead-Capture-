import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Health check endpoint for uptime monitoring
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
