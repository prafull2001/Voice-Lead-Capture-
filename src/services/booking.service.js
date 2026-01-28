import { DateTime } from 'luxon';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { getBusyPeriods, createCalendarEvent } from './calendar.service.js';
import {
  generateTimeSlots,
  filterByTimeOfDay,
  filterByDate,
  parseNaturalDate,
} from '../utils/time-slots.js';
import { getActiveAccount } from '../db/repositories/account.repository.js';
import { createAppointment as saveAppointment } from '../db/repositories/appointment.repository.js';

/**
 * Gets available appointment slots
 * @param {object} options - Query options
 * @returns {Promise<object>} Available slots and metadata
 */
export async function getAvailableSlots(options = {}) {
  const { preferredDate, timeOfDay = 'any', daysAhead = 7 } = options;
  const { timezone } = config.calendar;

  // Check if we have an active account
  const activeAccount = getActiveAccount();
  if (!activeAccount) {
    return {
      success: false,
      error: 'No calendar connected. Please ask the business to set up their calendar.',
      slots: [],
    };
  }

  try {
    // Define date range
    const now = DateTime.now().setZone(timezone);
    const startDate = now.toJSDate();
    const endDate = now.plus({ days: daysAhead }).endOf('day').toJSDate();

    // Get busy periods from Google Calendar
    const busyPeriods = await getBusyPeriods(startDate, endDate);

    // Generate available slots
    let slots = generateTimeSlots(startDate, endDate, busyPeriods);

    // Filter by preferred date if provided
    if (preferredDate) {
      const parsedDate = parseNaturalDate(preferredDate);
      if (parsedDate) {
        const dateSlots = filterByDate(slots, parsedDate);
        if (dateSlots.length > 0) {
          slots = dateSlots;
        }
        // If no slots on preferred date, keep all slots but note it
      }
    }

    // Filter by time of day preference
    if (timeOfDay && timeOfDay !== 'any') {
      const filteredSlots = filterByTimeOfDay(slots, timeOfDay);
      if (filteredSlots.length > 0) {
        slots = filteredSlots;
      }
    }

    // Limit to reasonable number for voice response
    const limitedSlots = slots.slice(0, 5);

    logger.info('Generated available slots', {
      totalSlots: slots.length,
      returnedSlots: limitedSlots.length,
      preferredDate,
      timeOfDay,
    });

    // Format for voice response
    const slotsForVoice = limitedSlots.map((slot, index) => ({
      ...slot,
      voiceOption: `Option ${index + 1}: ${slot.displayFull}`,
    }));

    return {
      success: true,
      slots: slotsForVoice,
      totalAvailable: slots.length,
      message: slots.length > 0
        ? `I have ${limitedSlots.length} available time slots. ${slotsForVoice.map(s => s.voiceOption).join('. ')}`
        : 'I apologize, but I don\'t see any available appointments in the next week. Would you like me to have someone call you back to schedule?',
    };
  } catch (error) {
    logger.error('Failed to get available slots', error);
    return {
      success: false,
      error: 'I had trouble checking the calendar. Let me take your information and someone will call you back to schedule.',
      slots: [],
    };
  }
}

/**
 * Books an appointment
 * @param {object} details - Booking details
 * @returns {Promise<object>} Booking result
 */
export async function bookAppointment(details) {
  const {
    startTime,
    customerName,
    phoneNumber,
    email,
    address,
    issue,
    callId,
  } = details;

  const { timezone, appointmentDuration } = config.calendar;
  const { companyName } = config.business;

  // Validate required fields
  if (!startTime || !customerName || !phoneNumber || !address || !issue) {
    return {
      success: false,
      error: 'Missing required information for booking. Please provide name, phone, address, and describe the issue.',
    };
  }

  // Check if we have an active account
  const activeAccount = getActiveAccount();
  if (!activeAccount) {
    return {
      success: false,
      error: 'No calendar connected. Please have someone call you back to schedule.',
    };
  }

  try {
    // Parse and validate the start time
    const start = DateTime.fromISO(startTime, { zone: timezone });
    if (!start.isValid) {
      return {
        success: false,
        error: 'Invalid appointment time. Please try again.',
      };
    }

    const end = start.plus({ minutes: appointmentDuration });

    // Verify the slot is still available (prevent double-booking)
    const busyPeriods = await getBusyPeriods(
      start.minus({ minutes: 1 }).toJSDate(),
      end.plus({ minutes: 1 }).toJSDate()
    );

    const hasConflict = busyPeriods.some(period => {
      const busyStart = DateTime.fromISO(period.start);
      const busyEnd = DateTime.fromISO(period.end);
      return start < busyEnd && end > busyStart;
    });

    if (hasConflict) {
      return {
        success: false,
        error: 'Sorry, that time slot was just taken. Let me check for other available times.',
        shouldRetry: true,
      };
    }

    // Create the calendar event
    const eventDescription = `
Service Call for ${customerName}

Phone: ${phoneNumber}
${email ? `Email: ${email}` : ''}
Address: ${address}

Issue: ${issue}

Booked via AI Assistant
    `.trim();

    const event = await createCalendarEvent({
      summary: `Service Call - ${customerName}`,
      description: eventDescription,
      startTime: start.toISO(),
      endTime: end.toISO(),
      attendeeEmail: email,
      attendeeName: customerName,
      location: address,
    });

    // Save to local database
    const appointment = saveAppointment({
      googleEventId: event.eventId,
      callerName: customerName,
      phoneNumber,
      email,
      serviceAddress: address,
      issueDescription: issue,
      startTime: start.toSeconds(),
      endTime: end.toSeconds(),
      accountEmail: activeAccount.email,
      callId,
    });

    logger.info('Appointment booked successfully', {
      appointmentId: appointment.id,
      eventId: event.eventId,
      customerName,
      startTime: start.toISO(),
    });

    return {
      success: true,
      appointment: {
        id: appointment.id,
        eventId: event.eventId,
        startTime: start.toISO(),
        endTime: end.toISO(),
        displayTime: start.toFormat('cccc, LLLL d \'at\' h:mm a'),
      },
      message: `Your appointment is confirmed for ${start.toFormat('cccc, LLLL d \'at\' h:mm a')}. You'll receive a confirmation and reminder before your appointment.`,
    };
  } catch (error) {
    logger.error('Failed to book appointment', error);
    return {
      success: false,
      error: 'I had trouble booking that appointment. Let me take your information and someone will call you back to schedule.',
    };
  }
}

/**
 * Cancels an appointment
 * @param {number} appointmentId - Local appointment ID
 * @returns {Promise<object>} Cancellation result
 */
export async function cancelAppointment(appointmentId) {
  // TODO: Implement cancellation logic
  // 1. Get appointment from database
  // 2. Delete Google Calendar event
  // 3. Update/delete local record
  // 4. Send cancellation notification

  return {
    success: false,
    error: 'Cancellation not implemented yet',
  };
}

export default {
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
};
