import { getDatabase } from '../database.js';
import logger from '../../utils/logger.js';

/**
 * Creates or updates a Google account
 * @param {object} account - Account data
 * @returns {object} Created/updated account
 */
export function upsertAccount(account) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO google_accounts (email, access_token, refresh_token, token_expiry, calendar_id, is_active, updated_at)
    VALUES (@email, @accessToken, @refreshToken, @tokenExpiry, @calendarId, @isActive, strftime('%s', 'now'))
    ON CONFLICT(email) DO UPDATE SET
      access_token = @accessToken,
      refresh_token = COALESCE(@refreshToken, refresh_token),
      token_expiry = @tokenExpiry,
      calendar_id = COALESCE(@calendarId, calendar_id),
      updated_at = strftime('%s', 'now')
    RETURNING *
  `);

  const result = stmt.get({
    email: account.email,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken || null,
    tokenExpiry: account.tokenExpiry,
    calendarId: account.calendarId || 'primary',
    isActive: account.isActive ? 1 : 0,
  });

  logger.info('Account upserted', { email: account.email });
  return formatAccount(result);
}

/**
 * Gets all accounts
 * @returns {object[]} List of accounts
 */
export function getAllAccounts() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM google_accounts ORDER BY is_active DESC, created_at DESC');
  return stmt.all().map(formatAccount);
}

/**
 * Gets the active account
 * @returns {object|null} Active account or null
 */
export function getActiveAccount() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM google_accounts WHERE is_active = 1 LIMIT 1');
  const result = stmt.get();
  return result ? formatAccount(result) : null;
}

/**
 * Gets an account by ID
 * @param {number} id - Account ID
 * @returns {object|null} Account or null
 */
export function getAccountById(id) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM google_accounts WHERE id = ?');
  const result = stmt.get(id);
  return result ? formatAccount(result) : null;
}

/**
 * Gets an account by email
 * @param {string} email - Account email
 * @returns {object|null} Account or null
 */
export function getAccountByEmail(email) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM google_accounts WHERE email = ?');
  const result = stmt.get(email);
  return result ? formatAccount(result) : null;
}

/**
 * Sets an account as active (deactivates all others)
 * @param {number} id - Account ID to activate
 * @returns {object|null} Activated account or null
 */
export function setActiveAccount(id) {
  const db = getDatabase();

  const transaction = db.transaction(() => {
    // Deactivate all accounts
    db.prepare('UPDATE google_accounts SET is_active = 0, updated_at = strftime(\'%s\', \'now\')').run();

    // Activate the specified account
    db.prepare('UPDATE google_accounts SET is_active = 1, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(id);

    // Return the activated account
    return db.prepare('SELECT * FROM google_accounts WHERE id = ?').get(id);
  });

  const result = transaction();

  if (result) {
    logger.info('Account activated', { id, email: result.email });
    return formatAccount(result);
  }

  return null;
}

/**
 * Updates an account's tokens
 * @param {string} email - Account email
 * @param {object} tokens - New tokens
 * @returns {object|null} Updated account or null
 */
export function updateTokens(email, tokens) {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE google_accounts
    SET access_token = @accessToken,
        refresh_token = COALESCE(@refreshToken, refresh_token),
        token_expiry = @tokenExpiry,
        updated_at = strftime('%s', 'now')
    WHERE email = @email
    RETURNING *
  `);

  const result = stmt.get({
    email,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken || null,
    tokenExpiry: tokens.tokenExpiry,
  });

  return result ? formatAccount(result) : null;
}

/**
 * Deletes an account
 * @param {number} id - Account ID
 * @returns {boolean} Whether account was deleted
 */
export function deleteAccount(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM google_accounts WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes > 0) {
    logger.info('Account deleted', { id });
    return true;
  }

  return false;
}

/**
 * Formats a database row into a clean account object
 * @param {object} row - Database row
 * @returns {object} Formatted account
 */
function formatAccount(row) {
  return {
    id: row.id,
    email: row.email,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiry: row.token_expiry,
    calendarId: row.calendar_id,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    updatedAt: new Date(row.updated_at * 1000).toISOString(),
  };
}

export default {
  upsertAccount,
  getAllAccounts,
  getActiveAccount,
  getAccountById,
  getAccountByEmail,
  setActiveAccount,
  updateTokens,
  deleteAccount,
};
