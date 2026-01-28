import { Router } from 'express';
import {
  handleCallStarted,
  handleCallEnded,
  handleFunctionCall,
} from '../controllers/vapi.controller.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /webhooks/vapi/webhook
 * Unified webhook endpoint - routes based on message type
 */
router.post('/webhook', (req, res) => {
  const { message } = req.body;
  const messageType = message?.type || req.body.type;

  logger.info('Vapi webhook received', { messageType, body: req.body });

  switch (messageType) {
    case 'assistant-request':
      // Return assistant config if needed
      return res.status(200).json({ assistant: {} });

    case 'status-update':
    case 'speech-update':
    case 'conversation-update':
    case 'transcript':
      // Acknowledge these events
      return res.status(200).json({ received: true });

    case 'function-call':
      req.body = { functionCall: message.functionCall, call: message.call || req.body.call };
      return handleFunctionCall(req, res);

    case 'end-of-call-report':
      req.body = { call: message.call || req.body };
      return handleCallEnded(req, res);

    case 'hang':
    case 'call-ended':
      req.body = { call: message?.call || req.body.call || req.body };
      return handleCallEnded(req, res);

    default:
      logger.info('Unhandled webhook type', { messageType });
      return res.status(200).json({ received: true });
  }
});

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
