import { Router } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  listAccounts,
  activateAccount,
  removeAccount,
  listAppointments,
} from '../controllers/admin.controller.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

/**
 * GET /admin
 * Serves the admin page
 */
router.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../../public/admin.html'));
});

/**
 * GET /api/admin/accounts
 * Lists all connected Google accounts
 */
router.get('/api/accounts', listAccounts);

/**
 * POST /api/admin/accounts/:id/activate
 * Sets an account as active
 */
router.post('/api/accounts/:id/activate', activateAccount);

/**
 * DELETE /api/admin/accounts/:id
 * Removes a Google account
 */
router.delete('/api/accounts/:id', removeAccount);

/**
 * GET /api/admin/appointments
 * Lists recent appointments
 */
router.get('/api/appointments', listAppointments);

export default router;
