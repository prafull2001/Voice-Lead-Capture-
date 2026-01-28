import twilio from 'twilio';
import { Resend } from 'resend';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { formatSMS, formatEmail } from './summary.service.js';

// Lazy-initialized clients (initialized on first use)
let twilioClient = null;
let resend = null;

/**
 * Gets or creates Twilio client
 * @returns {object} Twilio client
 */
function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

/**
 * Gets or creates Resend client
 * @returns {Resend} Resend client
 */
function getResendClient() {
  if (!resend) {
    resend = new Resend(config.resend.apiKey);
  }
  return resend;
}

/**
 * Sends an SMS notification
 * @param {object} leadData - The lead data to send
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendSMS(leadData) {
  try {
    const message = formatSMS(leadData);

    const result = await getTwilioClient().messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to: config.notifications.ownerPhone,
    });

    logger.info('SMS sent successfully', {
      messageId: result.sid,
      to: config.notifications.ownerPhone,
      isEmergency: leadData.isEmergency,
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    logger.error('Failed to send SMS', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends an email notification
 * @param {object} leadData - The lead data to send
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendEmail(leadData) {
  try {
    const { subject, text, html } = formatEmail(leadData);

    const result = await getResendClient().emails.send({
      from: `${config.business.companyName} <leads@${config.business.companyName.toLowerCase().replace(/\s+/g, '')}.com>`,
      to: config.notifications.ownerEmail,
      subject,
      text,
      html,
    });

    logger.info('Email sent successfully', {
      messageId: result.id,
      to: config.notifications.ownerEmail,
      isEmergency: leadData.isEmergency,
    });

    return { success: true, messageId: result.id };
  } catch (error) {
    logger.error('Failed to send email', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends all notifications (SMS and Email)
 * @param {object} leadData - The lead data to send
 * @returns {Promise<{ sms: object, email: object }>}
 */
export async function sendAllNotifications(leadData) {
  logger.info('Sending notifications', {
    callId: leadData.callId,
    isEmergency: leadData.isEmergency,
  });

  // Send both notifications in parallel
  const [smsResult, emailResult] = await Promise.all([
    sendSMS(leadData),
    sendEmail(leadData),
  ]);

  const results = {
    sms: smsResult,
    email: emailResult,
  };

  // Log overall result
  if (smsResult.success && emailResult.success) {
    logger.info('All notifications sent successfully', { callId: leadData.callId });
  } else {
    logger.warn('Some notifications failed', {
      callId: leadData.callId,
      smsSuccess: smsResult.success,
      emailSuccess: emailResult.success,
    });
  }

  return results;
}

export default {
  sendSMS,
  sendEmail,
  sendAllNotifications,
};
