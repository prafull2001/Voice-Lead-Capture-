import { google } from 'googleapis';
import config from '../config/index.js';
import logger from './logger.js';
import { updateTokens, getAccountByEmail } from '../db/repositories/account.repository.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Creates a new OAuth2 client
 * @returns {google.auth.OAuth2} OAuth2 client
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
}

/**
 * Generates the OAuth authorization URL
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} Authorization URL
 */
export function generateAuthUrl(state) {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

/**
 * Exchanges authorization code for tokens
 * @param {string} code - Authorization code
 * @returns {Promise<object>} Token response
 */
export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  logger.info('Tokens exchanged successfully');

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiry: Math.floor(tokens.expiry_date / 1000),
  };
}

/**
 * Gets the user's email from Google
 * @param {string} accessToken - Access token
 * @returns {Promise<string>} User email
 */
export async function getUserEmail(accessToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return data.email;
}

/**
 * Creates an authenticated OAuth2 client for an account
 * @param {object} account - Account with tokens
 * @returns {Promise<google.auth.OAuth2>} Authenticated OAuth2 client
 */
export async function getAuthenticatedClient(account) {
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.tokenExpiry * 1000,
  });

  // Check if token needs refresh
  const now = Math.floor(Date.now() / 1000);
  if (account.tokenExpiry < now + 300) {
    logger.info('Token expired or expiring soon, refreshing', { email: account.email });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update tokens in database
      await updateTokens(account.email, {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
        tokenExpiry: Math.floor(credentials.expiry_date / 1000),
      });

      oauth2Client.setCredentials(credentials);
      logger.info('Token refreshed successfully', { email: account.email });
    } catch (error) {
      logger.error('Failed to refresh token', error);
      throw new Error('Failed to refresh Google token. Please reconnect your account.');
    }
  }

  return oauth2Client;
}

/**
 * Gets a Calendar API client for an account
 * @param {object} account - Account with tokens
 * @returns {Promise<object>} Calendar API client
 */
export async function getCalendarClient(account) {
  const auth = await getAuthenticatedClient(account);
  return google.calendar({ version: 'v3', auth });
}

/**
 * Revokes OAuth tokens for an account
 * @param {string} accessToken - Access token to revoke
 */
export async function revokeToken(accessToken) {
  const oauth2Client = createOAuth2Client();

  try {
    await oauth2Client.revokeToken(accessToken);
    logger.info('Token revoked successfully');
  } catch (error) {
    logger.warn('Failed to revoke token', { error: error.message });
  }
}

export default {
  createOAuth2Client,
  generateAuthUrl,
  exchangeCodeForTokens,
  getUserEmail,
  getAuthenticatedClient,
  getCalendarClient,
  revokeToken,
};
