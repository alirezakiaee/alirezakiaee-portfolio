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

// Completes TOTP enrollment: pending 'enroll' token + valid code -> session.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });

  const { pendingToken, code } = req.body || {};
  const userId = await verifyPending(pendingToken, 'enroll');
  if (!userId) return res.status(401).json({ error: 'Enrollment expired. Start setup again.' });

  if (await tooManyAttempts(userId, 'totp')) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const rows = await sql`SELECT totp_secret, totp_enabled FROM admin_users WHERE id = ${userId}`;
  if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
  if (rows[0].totp_enabled) return res.status(403).json({ error: 'Already enrolled.' });

  if (!verifyTotp(rows[0].totp_secret, code)) {
    await recordAttempt(userId, 'totp', false);
    return res.status(401).json({ error: 'Invalid code. Check your authenticator and try again.' });
  }

  await sql`UPDATE admin_users SET totp_enabled = true WHERE id = ${userId}`;
  await recordAttempt(userId, 'totp', true);

  setSessionCookie(res, await signSession(userId));
  return res.status(200).json({ ok: true });
}
