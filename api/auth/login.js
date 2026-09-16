import { sql } from '../_lib/db.js';
import {
  comparePassword,
  signPending,
  hasCsrfHeader,
  tooManyAttempts,
  recordAttempt,
} from '../_lib/security.js';

// Step 1 of login: username + password -> pending token (TOTP step follows).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });

  const { username, password } = req.body || {};
  const name = String(username || '').trim().toLowerCase();

  if (await tooManyAttempts(name, 'login')) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
  }

  const rows = await sql`
    SELECT id, password_hash, totp_enabled FROM admin_users
    WHERE lower(username) = ${name} LIMIT 1`;

  const ok =
    rows.length > 0 && (await comparePassword(String(password || ''), rows[0].password_hash));

  if (!ok) {
    await recordAttempt(name, 'login', false);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  await recordAttempt(name, 'login', true);
  const pendingToken = await signPending(rows[0].id, 'totp');
  return res.status(200).json({ totpRequired: true, pendingToken });
}
