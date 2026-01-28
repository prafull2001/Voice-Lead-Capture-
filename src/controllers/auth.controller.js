import crypto from 'crypto';
import logger from '../utils/logger.js';
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  getUserEmail,
  revokeToken,
} from '../utils/google-auth.js';
import { upsertAccount, getAccountByEmail } from '../db/repositories/account.repository.js';

// Store state tokens temporarily (in production, use Redis or database)
const stateTokens = new Map();

/**
 * Initiates Google OAuth flow
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleAuthorize(req, res) {
  try {
    // Generate a random state token
    const state = crypto.randomBytes(32).toString('hex');

    // Store state token (expires in 10 minutes)
    stateTokens.set(state, {
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Clean up expired tokens
    for (const [key, value] of stateTokens.entries()) {
      if (value.expiresAt < Date.now()) {
        stateTokens.delete(key);
      }
    }

    const authUrl = generateAuthUrl(state);

    logger.info('OAuth flow initiated');

    res.redirect(authUrl);
  } catch (error) {
    logger.error('Error initiating OAuth', error);
    res.redirect('/admin?error=oauth_init_failed');
  }
}

/**
 * Handles Google OAuth callback
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      logger.warn('OAuth error from Google', { error });
      return res.redirect(`/admin?error=${error}`);
    }

    // Validate state token
    if (!state || !stateTokens.has(state)) {
      logger.warn('Invalid or missing state token');
      return res.redirect('/admin?error=invalid_state');
    }

    const stateData = stateTokens.get(state);
    stateTokens.delete(state);

    if (stateData.expiresAt < Date.now()) {
      logger.warn('Expired state token');
      return res.redirect('/admin?error=expired_state');
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user email
    const email = await getUserEmail(tokens.accessToken);

    // Check if account already exists
    const existingAccount = getAccountByEmail(email);

    // Save or update account
    const account = upsertAccount({
      email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.tokenExpiry,
      isActive: !existingAccount, // Make active if first account
    });

    logger.info('Google account connected', { email: account.email });

    res.redirect('/admin?success=connected');
  } catch (error) {
    logger.error('Error handling OAuth callback', error);
    res.redirect('/admin?error=callback_failed');
  }
}

/**
 * Disconnects a Google account
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleDisconnect(req, res) {
  try {
    const { id } = req.params;
    const account = getAccountByEmail(id);

    if (account) {
      // Revoke the token
      await revokeToken(account.accessToken);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error disconnecting account', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
}

export default {
  handleAuthorize,
  handleCallback,
  handleDisconnect,
};
