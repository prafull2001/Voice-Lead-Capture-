import logger from '../utils/logger.js';
import { revokeToken } from '../utils/google-auth.js';
import {
  getAllAccounts,
  getAccountById,
  setActiveAccount,
  deleteAccount,
} from '../db/repositories/account.repository.js';
import { getAppointments } from '../db/repositories/appointment.repository.js';

/**
 * Gets all connected Google accounts
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function listAccounts(req, res) {
  try {
    const accounts = getAllAccounts();

    // Remove sensitive tokens from response
    const safeAccounts = accounts.map(account => ({
      id: account.id,
      email: account.email,
      calendarId: account.calendarId,
      isActive: account.isActive,
      createdAt: account.createdAt,
    }));

    res.json(safeAccounts);
  } catch (error) {
    logger.error('Error listing accounts', error);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
}

/**
 * Sets an account as active
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function activateAccount(req, res) {
  try {
    const { id } = req.params;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const account = setActiveAccount(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    logger.info('Account activated', { id: accountId, email: account.email });

    res.json({
      success: true,
      activeAccount: {
        id: account.id,
        email: account.email,
      },
    });
  } catch (error) {
    logger.error('Error activating account', error);
    res.status(500).json({ error: 'Failed to activate account' });
  }
}

/**
 * Disconnects and deletes a Google account
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function removeAccount(req, res) {
  try {
    const { id } = req.params;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const account = getAccountById(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Revoke the OAuth token
    try {
      await revokeToken(account.accessToken);
    } catch (e) {
      logger.warn('Failed to revoke token during account removal', { email: account.email });
    }

    // Delete from database
    const deleted = deleteAccount(accountId);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    logger.info('Account removed', { id: accountId, email: account.email });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing account', error);
    res.status(500).json({ error: 'Failed to remove account' });
  }
}

/**
 * Gets recent appointments
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function listAppointments(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const appointments = getAppointments({ limit, offset });

    res.json(appointments);
  } catch (error) {
    logger.error('Error listing appointments', error);
    res.status(500).json({ error: 'Failed to list appointments' });
  }
}

export default {
  listAccounts,
  activateAccount,
  removeAccount,
  listAppointments,
};
