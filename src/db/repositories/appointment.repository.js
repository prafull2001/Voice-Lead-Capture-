import { getDatabase } from '../database.js';
import logger from '../../utils/logger.js';

/**
 * Creates a new appointment
 * @param {object} appointment - Appointment data
 * @returns {object} Created appointment
 */
export function createAppointment(appointment) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO appointments (
      google_event_id, caller_name, phone_number, email,
      service_address, issue_description, start_time, end_time,
      account_email, call_id
    )
    VALUES (
      @googleEventId, @callerName, @phoneNumber, @email,
      @serviceAddress, @issueDescription, @startTime, @endTime,
      @accountEmail, @callId
    )
    RETURNING *
  `);

  const result = stmt.get({
    googleEventId: appointment.googleEventId,
    callerName: appointment.callerName,
    phoneNumber: appointment.phoneNumber,
    email: appointment.email || null,
    serviceAddress: appointment.serviceAddress || null,
    issueDescription: appointment.issueDescription || null,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    accountEmail: appointment.accountEmail,
    callId: appointment.callId || null,
  });

  logger.info('Appointment created', {
    id: result.id,
    callerName: appointment.callerName,
    startTime: new Date(appointment.startTime * 1000).toISOString(),
  });

  return formatAppointment(result);
}

/**
 * Gets appointments with pagination
 * @param {object} options - Query options
 * @returns {object[]} List of appointments
 */
export function getAppointments(options = {}) {
  const db = getDatabase();
  const { limit = 10, offset = 0, upcoming = false } = options;

  let query = 'SELECT * FROM appointments';
  const params = [];

  if (upcoming) {
    query += ' WHERE start_time > ?';
    params.push(Math.floor(Date.now() / 1000));
  }

  query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  return stmt.all(...params).map(formatAppointment);
}

/**
 * Gets an appointment by ID
 * @param {number} id - Appointment ID
 * @returns {object|null} Appointment or null
 */
export function getAppointmentById(id) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
  const result = stmt.get(id);
  return result ? formatAppointment(result) : null;
}

/**
 * Gets an appointment by Google Event ID
 * @param {string} googleEventId - Google Calendar event ID
 * @returns {object|null} Appointment or null
 */
export function getAppointmentByEventId(googleEventId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM appointments WHERE google_event_id = ?');
  const result = stmt.get(googleEventId);
  return result ? formatAppointment(result) : null;
}

/**
 * Gets appointments for a specific time range
 * @param {number} startTime - Start timestamp (seconds)
 * @param {number} endTime - End timestamp (seconds)
 * @returns {object[]} List of appointments
 */
export function getAppointmentsInRange(startTime, endTime) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM appointments
    WHERE start_time >= ? AND start_time < ?
    ORDER BY start_time ASC
  `);
  return stmt.all(startTime, endTime).map(formatAppointment);
}

/**
 * Updates an appointment's Google Event ID
 * @param {number} id - Appointment ID
 * @param {string} googleEventId - Google Calendar event ID
 * @returns {object|null} Updated appointment or null
 */
export function updateGoogleEventId(id, googleEventId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE appointments SET google_event_id = ? WHERE id = ?
    RETURNING *
  `);
  const result = stmt.get(googleEventId, id);
  return result ? formatAppointment(result) : null;
}

/**
 * Deletes an appointment
 * @param {number} id - Appointment ID
 * @returns {boolean} Whether appointment was deleted
 */
export function deleteAppointment(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    logger.info('Appointment deleted', { id });
    return true;
  }

  return false;
}

/**
 * Formats a database row into a clean appointment object
 * @param {object} row - Database row
 * @returns {object} Formatted appointment
 */
function formatAppointment(row) {
  return {
    id: row.id,
    googleEventId: row.google_event_id,
    callerName: row.caller_name,
    phoneNumber: row.phone_number,
    email: row.email,
    serviceAddress: row.service_address,
    issueDescription: row.issue_description,
    startTime: row.start_time,
    endTime: row.end_time,
    startTimeISO: new Date(row.start_time * 1000).toISOString(),
    endTimeISO: new Date(row.end_time * 1000).toISOString(),
    accountEmail: row.account_email,
    callId: row.call_id,
    createdAt: new Date(row.created_at * 1000).toISOString(),
  };
}

export default {
  createAppointment,
  getAppointments,
  getAppointmentById,
  getAppointmentByEventId,
  getAppointmentsInRange,
  updateGoogleEventId,
  deleteAppointment,
};
