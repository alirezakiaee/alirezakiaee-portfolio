import { sql } from '../_lib/db.js';
import {
  verifyPending,
  verifyTotp,
  signSession,
  setSessionCookie,
  hasCsrfHeader,
  tooManyAttempts,
  recordAttempt,
} from '../_lib/security.js';

// Step 2 of login: pending 'totp' token + 6-digit code -> admin session.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });

  const { pendingToken, code } = req.body || {};
  const userId = await verifyPending(pendingToken, 'totp');
  if (!userId) return res.status(401).json({ error: 'Session expired. Log in again.' });

  if (await tooManyAttempts(userId, 'totp')) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const rows = await sql`
    SELECT totp_secret, totp_enabled FROM admin_users WHERE id = ${userId}`;
  if (rows.length === 0 || !rows[0].totp_enabled) {
    return res.status(403).json({ error: 'TOTP not enrolled.' });
  }

  if (!verifyTotp(rows[0].totp_secret, code)) {
    await recordAttempt(userId, 'totp', false);
    return res.status(401).json({ error: 'Invalid code.' });
  }

  await recordAttempt(userId, 'totp', true);
  setSessionCookie(res, await signSession(userId));
  return res.status(200).json({ ok: true });
}
