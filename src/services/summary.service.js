import config from '../config/index.js';

/**
 * Formats lead data for SMS notification
 * @param {object} leadData - The lead data
 * @returns {string} Formatted SMS message
 */
export function formatSMS(leadData) {
  const {
    callerName = 'Unknown',
    phoneNumber = 'Not provided',
    serviceAddress = 'Not provided',
    issueDescription = 'Not provided',
    isEmergency = false,
    timestamp,
    appointment = null,
  } = leadData;

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });

  let message = `📞 NEW LEAD - ${config.business.companyName}\n\n`;
  message += `Name: ${callerName}\n`;
  message += `Phone: ${phoneNumber}\n`;
  message += `Address: ${serviceAddress}\n`;
  message += `Issue: ${issueDescription}\n\n`;

  if (appointment) {
    message += `📅 APPOINTMENT BOOKED\n`;
    message += `${appointment.displayTime}\n\n`;
  }

  if (isEmergency) {
    message += `🚨 EMERGENCY - CALL BACK ASAP\n`;
  } else if (!appointment) {
    message += `Priority: Normal\n`;
  }

  message += `\nReceived: ${formattedTime}`;

  return message;
}

/**
 * Formats lead data for email notification
 * @param {object} leadData - The lead data
 * @returns {{ subject: string, text: string, html: string }}
 */
export function formatEmail(leadData) {
  const {
    callerName = 'Unknown',
    phoneNumber = 'Not provided',
    email = 'Not provided',
    serviceAddress = 'Not provided',
    issueDescription = 'Not provided',
    isEmergency = false,
    emergencyKeywords = [],
    timestamp,
    duration,
    appointment = null,
  } = leadData;

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      });

  // Subject line
  const subject = isEmergency
    ? `🚨 EMERGENCY - New Lead from ${callerName}`
    : `New Lead from ${callerName}`;

  // Plain text version
  let text = `New lead received via voice AI:\n\n`;
  text += `CONTACT INFO\n`;
  text += `------------\n`;
  text += `Name: ${callerName}\n`;
  text += `Phone: ${phoneNumber}\n`;
  text += `Email: ${email}\n`;
  text += `Address: ${serviceAddress}\n\n`;
  text += `ISSUE\n`;
  text += `-----\n`;
  text += `${issueDescription}\n\n`;

  if (isEmergency) {
    text += `⚠️ This has been flagged as a potential EMERGENCY.\n`;
    if (emergencyKeywords.length > 0) {
      text += `Keywords detected: ${emergencyKeywords.join(', ')}\n`;
    }
    text += `Please call back immediately.\n\n`;
  }

  if (appointment) {
    text += `APPOINTMENT SCHEDULED\n`;
    text += `---------------------\n`;
    text += `Date/Time: ${appointment.displayTime}\n`;
    text += `Address: ${serviceAddress}\n\n`;
  }

  text += `---\n`;
  text += `Call received: ${formattedTime}\n`;
  if (duration) {
    text += `Call duration: ${duration} seconds\n`;
  }

  // HTML version
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Lead Received</h2>

      ${isEmergency ? `
        <div style="background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="color: #dc2626; margin: 0 0 8px 0;">⚠️ EMERGENCY</h3>
          <p style="margin: 0; color: #991b1b;">This call has been flagged as a potential emergency. Please call back immediately.</p>
          ${emergencyKeywords.length > 0 ? `<p style="margin: 8px 0 0 0; color: #991b1b;"><strong>Keywords detected:</strong> ${emergencyKeywords.join(', ')}</p>` : ''}
        </div>
      ` : ''}

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #374151; margin: 0 0 12px 0;">Contact Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 100px;">Name:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500;">${callerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
            <td style="padding: 8px 0; color: #111827;"><a href="tel:${phoneNumber}" style="color: #2563eb;">${phoneNumber}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Email:</td>
            <td style="padding: 8px 0; color: #111827;">${email !== 'Not provided' ? `<a href="mailto:${email}" style="color: #2563eb;">${email}</a>` : email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Address:</td>
            <td style="padding: 8px 0; color: #111827;">${serviceAddress}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #374151; margin: 0 0 12px 0;">Issue Description</h3>
        <p style="margin: 0; color: #111827; line-height: 1.5;">${issueDescription}</p>
      </div>

      ${appointment ? `
        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="color: #047857; margin: 0 0 12px 0;">📅 Appointment Scheduled</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #065f46; width: 100px;">Date/Time:</td>
              <td style="padding: 8px 0; color: #065f46; font-weight: 600;">${appointment.displayTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #065f46;">Address:</td>
              <td style="padding: 8px 0; color: #065f46;">${serviceAddress}</td>
            </tr>
          </table>
        </div>
      ` : ''}

      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;">Call received: ${formattedTime}</p>
        ${duration ? `<p style="margin: 4px 0 0 0;">Call duration: ${duration} seconds</p>` : ''}
      </div>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Creates a simple summary object from lead data
 * @param {object} leadData - The lead data
 * @returns {object} Summary object
 */
export function createSummary(leadData) {
  return {
    callerName: leadData.callerName || 'Unknown',
    phoneNumber: leadData.phoneNumber || 'Not provided',
    email: leadData.email || null,
    serviceAddress: leadData.serviceAddress || 'Not provided',
    issueDescription: leadData.issueDescription || 'Not provided',
    isEmergency: leadData.isEmergency || false,
    emergencyKeywords: leadData.emergencyKeywords || [],
    callId: leadData.callId,
    timestamp: leadData.timestamp || new Date().toISOString(),
    duration: leadData.duration || null,
    appointment: leadData.appointment || null,
  };
}

export default {
  formatSMS,
  formatEmail,
  createSummary,
};
