import { DateTime } from 'luxon';
import { getCalendarClient } from '../utils/google-auth.js';
import { getActiveAccount } from '../db/repositories/account.repository.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Gets the busy periods from Google Calendar for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<object[]>} Array of busy periods
 */
export async function getBusyPeriods(startDate, endDate) {
  const account = getActiveAccount();

  if (!account) {
    logger.warn('No active Google account for calendar check');
    return [];
  }

  try {
    const calendar = await getCalendarClient(account);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: account.calendarId || 'primary' }],
      },
    });

    const calendarId = account.calendarId || 'primary';
    const busyPeriods = response.data.calendars[calendarId]?.busy || [];

    logger.info('Fetched busy periods', {
      account: account.email,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      busyCount: busyPeriods.length,
    });

    return busyPeriods;
  } catch (error) {
    logger.error('Failed to fetch busy periods', error);
    throw new Error('Failed to check calendar availability');
  }
}

/**
 * Creates a calendar event
 * @param {object} eventDetails - Event details
 * @returns {Promise<object>} Created event
 */
export async function createCalendarEvent(eventDetails) {
  const account = getActiveAccount();

  if (!account) {
    throw new Error('No active Google Calendar account. Please connect one in the admin panel.');
  }

  const {
    summary,
    description,
    startTime,
    endTime,
    attendeeEmail,
    attendeeName,
    location,
  } = eventDetails;

  try {
    const calendar = await getCalendarClient(account);
    const { timezone } = config.calendar;

    const event = {
      summary: summary || `Appointment with ${attendeeName}`,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startTime,
        timeZone: timezone,
      },
      end: {
        dateTime: endTime,
        timeZone: timezone,
      },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: account.calendarId || 'primary',
      requestBody: event,
      sendUpdates: attendeeEmail ? 'all' : 'none',
    });

    logger.info('Calendar event created', {
      eventId: response.data.id,
      account: account.email,
      startTime,
    });

    return {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      startTime: response.data.start.dateTime,
      endTime: response.data.end.dateTime,
    };
  } catch (error) {
    logger.error('Failed to create calendar event', error);
    throw new Error('Failed to create calendar event');
  }
}

/**
 * Updates a calendar event
 * @param {string} eventId - Google Calendar event ID
 * @param {object} updates - Event updates
 * @returns {Promise<object>} Updated event
 */
export async function updateCalendarEvent(eventId, updates) {
  const account = getActiveAccount();

  if (!account) {
    throw new Error('No active Google Calendar account');
  }

  try {
    const calendar = await getCalendarClient(account);

    const response = await calendar.events.patch({
      calendarId: account.calendarId || 'primary',
      eventId,
      requestBody: updates,
    });

    logger.info('Calendar event updated', { eventId });

    return response.data;
  } catch (error) {
    logger.error('Failed to update calendar event', error);
    throw new Error('Failed to update calendar event');
  }
}

/**
 * Deletes a calendar event
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCalendarEvent(eventId) {
  const account = getActiveAccount();

  if (!account) {
    throw new Error('No active Google Calendar account');
  }

  try {
    const calendar = await getCalendarClient(account);

    await calendar.events.delete({
      calendarId: account.calendarId || 'primary',
      eventId,
    });

    logger.info('Calendar event deleted', { eventId });

    return true;
  } catch (error) {
    logger.error('Failed to delete calendar event', error);
    throw new Error('Failed to delete calendar event');
  }
}

/**
 * Gets upcoming events from the calendar
 * @param {number} maxResults - Maximum number of events to return
 * @returns {Promise<object[]>} Array of events
 */
export async function getUpcomingEvents(maxResults = 10) {
  const account = getActiveAccount();

  if (!account) {
    return [];
  }

  try {
    const calendar = await getCalendarClient(account);

    const response = await calendar.events.list({
      calendarId: account.calendarId || 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    logger.error('Failed to fetch upcoming events', error);
    return [];
  }
}

export default {
  getBusyPeriods,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getUpcomingEvents,
};
