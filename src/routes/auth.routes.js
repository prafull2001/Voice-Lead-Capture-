import { Router } from 'express';
import {
  handleAuthorize,
  handleCallback,
} from '../controllers/auth.controller.js';

const router = Router();

/**
 * GET /auth/google/authorize
 * Initiates Google OAuth flow
 */
router.get('/authorize', handleAuthorize);

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 */
router.get('/callback', handleCallback);

export default router;
