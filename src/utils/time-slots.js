import { DateTime } from 'luxon';
import config from '../config/index.js';

/**
 * Generates available time slots for a given date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {object[]} busyPeriods - Array of busy periods from Google Calendar
 * @returns {object[]} Available time slots
 */
export function generateTimeSlots(startDate, endDate, busyPeriods = []) {
  const slots = [];
  const {
    appointmentDuration,
    businessHoursStart,
    businessHoursEnd,
    businessDays,
    timezone,
  } = config.calendar;

  // Parse business hours
  const [startHour, startMinute] = businessHoursStart.split(':').map(Number);
  const [endHour, endMinute] = businessHoursEnd.split(':').map(Number);

  // Convert busy periods to DateTime objects for easier comparison
  const busyIntervals = busyPeriods.map(period => ({
    start: DateTime.fromISO(period.start, { zone: timezone }),
    end: DateTime.fromISO(period.end, { zone: timezone }),
  }));

  // Iterate through each day in the range
  let currentDate = DateTime.fromJSDate(startDate, { zone: timezone }).startOf('day');
  const lastDate = DateTime.fromJSDate(endDate, { zone: timezone }).endOf('day');

  while (currentDate <= lastDate) {
    // Check if this is a business day (1=Monday, 7=Sunday in Luxon)
    if (businessDays.includes(currentDate.weekday)) {
      // Generate slots for this day
      let slotStart = currentDate.set({ hour: startHour, minute: startMinute, second: 0 });
      const dayEnd = currentDate.set({ hour: endHour, minute: endMinute, second: 0 });

      while (slotStart.plus({ minutes: appointmentDuration }) <= dayEnd) {
        const slotEnd = slotStart.plus({ minutes: appointmentDuration });

        // Check if slot is in the future (at least 1 hour from now)
        const minStartTime = DateTime.now().setZone(timezone).plus({ hours: 1 });

        if (slotStart >= minStartTime) {
          // Check if slot overlaps with any busy period
          const isAvailable = !busyIntervals.some(busy =>
            (slotStart < busy.end && slotEnd > busy.start)
          );

          if (isAvailable) {
            slots.push({
              startTime: slotStart.toISO(),
              endTime: slotEnd.toISO(),
              startTimeUnix: slotStart.toSeconds(),
              endTimeUnix: slotEnd.toSeconds(),
              displayDate: slotStart.toFormat('cccc, LLLL d'),
              displayTime: slotStart.toFormat('h:mm a'),
              displayFull: slotStart.toFormat('cccc, LLLL d \'at\' h:mm a'),
            });
          }
        }

        // Move to next slot
        slotStart = slotStart.plus({ minutes: appointmentDuration });
      }
    }

    // Move to next day
    currentDate = currentDate.plus({ days: 1 });
  }

  return slots;
}

/**
 * Filters slots by time of day preference
 * @param {object[]} slots - Available slots
 * @param {string} timeOfDay - 'morning', 'afternoon', 'evening', or 'any'
 * @returns {object[]} Filtered slots
 */
export function filterByTimeOfDay(slots, timeOfDay) {
  if (timeOfDay === 'any') {
    return slots;
  }

  return slots.filter(slot => {
    const dt = DateTime.fromISO(slot.startTime);
    const hour = dt.hour;

    switch (timeOfDay) {
      case 'morning':
        return hour >= 6 && hour < 12;
      case 'afternoon':
        return hour >= 12 && hour < 17;
      case 'evening':
        return hour >= 17 && hour < 21;
      default:
        return true;
    }
  });
}

/**
 * Gets slots for a specific date
 * @param {object[]} slots - Available slots
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {object[]} Filtered slots
 */
export function filterByDate(slots, dateStr) {
  return slots.filter(slot => {
    const slotDate = DateTime.fromISO(slot.startTime).toFormat('yyyy-MM-dd');
    return slotDate === dateStr;
  });
}

/**
 * Parses natural language date references
 * @param {string} input - Natural language date (e.g., "tomorrow", "next monday")
 * @returns {string|null} Date in YYYY-MM-DD format or null
 */
export function parseNaturalDate(input) {
  if (!input) return null;

  const { timezone } = config.calendar;
  const now = DateTime.now().setZone(timezone);
  const lower = input.toLowerCase().trim();

  // Today
  if (lower === 'today') {
    return now.toFormat('yyyy-MM-dd');
  }

  // Tomorrow
  if (lower === 'tomorrow') {
    return now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
  }

  // Day after tomorrow
  if (lower === 'day after tomorrow') {
    return now.plus({ days: 2 }).toFormat('yyyy-MM-dd');
  }

  // This/next weekday
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(weekdays[i])) {
      const targetDay = i + 1; // Luxon uses 1-7 for Monday-Sunday
      let date = now;

      // Find the next occurrence of this weekday
      while (date.weekday !== targetDay || date.hasSame(now, 'day')) {
        date = date.plus({ days: 1 });
      }

      // If "next" is specified, add another week
      if (lower.includes('next')) {
        date = date.plus({ weeks: 1 });
      }

      return date.toFormat('yyyy-MM-dd');
    }
  }

  // Try to parse as a date string
  try {
    const parsed = DateTime.fromFormat(input, 'yyyy-MM-dd', { zone: timezone });
    if (parsed.isValid) {
      return input;
    }
  } catch (e) {
    // Not a valid date format
  }

  return null;
}

/**
 * Formats a slot for display in voice response
 * @param {object} slot - Time slot
 * @param {number} index - Slot index (1-based)
 * @returns {string} Formatted string for voice
 */
export function formatSlotForVoice(slot, index) {
  return `Option ${index}: ${slot.displayFull}`;
}

export default {
  generateTimeSlots,
  filterByTimeOfDay,
  filterByDate,
  parseNaturalDate,
  formatSlotForVoice,
};
