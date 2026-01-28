import { Router } from 'express';
import {
  handleCallStarted,
  handleCallEnded,
  handleFunctionCall,
} from '../controllers/vapi.controller.js';

const router = Router();

/**
 * POST /webhooks/vapi/call-started
 * Called when Vapi begins a call
 */
router.post('/call-started', handleCallStarted);

/**
 * POST /webhooks/vapi/call-ended
 * Called when a call ends, receives transcript and extracted data
 */
router.post('/call-ended', handleCallEnded);

/**
 * POST /webhooks/vapi/function-call
 * Called when Vapi needs to execute a server-side function
 */
router.post('/function-call', handleFunctionCall);

export default router;
