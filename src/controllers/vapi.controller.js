import logger from '../utils/logger.js';
import { validateWebhook } from '../utils/validators.js';
import { detectEmergency } from '../services/emergency.service.js';
import { createSummary } from '../services/summary.service.js';
import { sendAllNotifications } from '../services/notification.service.js';
import { getAvailableSlots, bookAppointment } from '../services/booking.service.js';

/**
 * Handles the call-started webhook from Vapi
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleCallStarted(req, res) {
  try {
    const payload = req.body;

    // Validate the webhook payload
    const validation = validateWebhook('call-started', payload);
    if (!validation.success) {
      logger.warn('Invalid call-started payload', { error: validation.error });
      return res.status(400).json({ error: validation.error });
    }

    const { call } = validation.data;

    logger.info('Call started', {
      callId: call.id,
      customerNumber: call.customer?.number,
      timestamp: call.startedAt || new Date().toISOString(),
    });

    // Acknowledge the webhook
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error handling call-started webhook', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handles the call-ended webhook from Vapi
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleCallEnded(req, res) {
  try {
    const payload = req.body;

    // Validate the webhook payload
    const validation = validateWebhook('call-ended', payload);
    if (!validation.success) {
      logger.warn('Invalid call-ended payload', { error: validation.error });
      return res.status(400).json({ error: validation.error });
    }

    const { call } = validation.data;

    logger.info('Call ended', {
      callId: call.id,
      endedReason: call.endedReason,
      duration: calculateDuration(call.startedAt, call.endedAt),
    });

    // Extract lead data from the call
    const extractedData = call.analysis?.structuredData || {};
    const transcript = call.transcript || '';

    // Detect emergency
    const emergencyResult = detectEmergency(transcript);

    // Create lead summary
    const leadData = createSummary({
      callerName: extractedData.caller_name,
      phoneNumber: extractedData.phone_number || call.customer?.number,
      email: extractedData.email,
      serviceAddress: extractedData.service_address,
      issueDescription: extractedData.issue_description || call.analysis?.summary,
      isEmergency: emergencyResult.isEmergency,
      emergencyKeywords: emergencyResult.keywords,
      callId: call.id,
      timestamp: call.endedAt || new Date().toISOString(),
      duration: calculateDuration(call.startedAt, call.endedAt),
    });

    logger.info('Lead data extracted', {
      callId: call.id,
      callerName: leadData.callerName,
      isEmergency: leadData.isEmergency,
    });

    // Send notifications (don't await - respond quickly to webhook)
    sendAllNotifications(leadData).catch(error => {
      logger.error('Failed to send notifications', error);
    });

    // Acknowledge the webhook immediately
    res.status(200).json({
      received: true,
      leadId: call.id,
      isEmergency: leadData.isEmergency,
    });
  } catch (error) {
    logger.error('Error handling call-ended webhook', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handles function-call webhooks from Vapi
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleFunctionCall(req, res) {
  try {
    const payload = req.body;

    // Validate the webhook payload
    const validation = validateWebhook('function-call', payload);
    if (!validation.success) {
      logger.warn('Invalid function-call payload', { error: validation.error });
      return res.status(400).json({ error: validation.error });
    }

    const { functionCall, call } = validation.data;

    logger.info('Function call received', {
      callId: call.id,
      functionName: functionCall.name,
      parameters: functionCall.parameters,
    });

    // Handle different function calls
    switch (functionCall.name) {
      case 'checkEmergency':
        const emergencyResult = detectEmergency(functionCall.parameters?.transcript || '');
        return res.status(200).json({
          result: emergencyResult,
        });

      case 'getAvailableSlots':
        try {
          const slotsResult = await getAvailableSlots({
            preferredDate: functionCall.parameters?.preferredDate,
            timeOfDay: functionCall.parameters?.timeOfDay || 'any',
            daysAhead: functionCall.parameters?.daysAhead || 7,
          });

          logger.info('Available slots retrieved', {
            callId: call.id,
            slotsCount: slotsResult.slots?.length || 0,
            success: slotsResult.success,
          });

          return res.status(200).json({
            result: slotsResult,
          });
        } catch (error) {
          logger.error('Error getting available slots', error);
          return res.status(200).json({
            result: {
              success: false,
              error: 'Failed to check calendar availability. Let me take your information and someone will call you back to schedule.',
              slots: [],
            },
          });
        }

      case 'bookAppointment':
        try {
          const bookingResult = await bookAppointment({
            startTime: functionCall.parameters?.startTime,
            customerName: functionCall.parameters?.customerName,
            phoneNumber: functionCall.parameters?.phoneNumber,
            email: functionCall.parameters?.email,
            address: functionCall.parameters?.address,
            issue: functionCall.parameters?.issue,
            callId: call.id,
          });

          logger.info('Booking attempt', {
            callId: call.id,
            success: bookingResult.success,
            appointmentId: bookingResult.appointment?.id,
          });

          return res.status(200).json({
            result: bookingResult,
          });
        } catch (error) {
          logger.error('Error booking appointment', error);
          return res.status(200).json({
            result: {
              success: false,
              error: 'Failed to book appointment. Let me take your information and someone will call you back to schedule.',
            },
          });
        }

      default:
        logger.warn('Unknown function call', { functionName: functionCall.name });
        return res.status(200).json({
          result: { error: 'Unknown function' },
        });
    }
  } catch (error) {
    logger.error('Error handling function-call webhook', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Calculates duration between two timestamps in seconds
 * @param {string} startedAt - Start timestamp
 * @param {string} endedAt - End timestamp
 * @returns {number|null} Duration in seconds or null if can't calculate
 */
function calculateDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;

  try {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    return Math.round((end - start) / 1000);
  } catch {
    return null;
  }
}

export default {
  handleCallStarted,
  handleCallEnded,
  handleFunctionCall,
};
