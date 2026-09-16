import { sql } from '../_lib/db.js';
import {
  hashPassword,
  generateTotpSecret,
  otpauthUri,
  signPending,
  hasCsrfHeader,
  safeEqual,
  tooManyAttempts,
  recordAttempt,
} from '../_lib/security.js';

// One-time admin bootstrap. Requires the ADMIN_SETUP_KEY env secret.
// Creates the admin user and returns a TOTP enrollment (otpauth) URI.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });

  const { setupKey, username, password } = req.body || {};

  if (await tooManyAttempts('setup', 'setup')) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const expectedKey = process.env.ADMIN_SETUP_KEY || '';
  if (!expectedKey || !safeEqual(setupKey || '', expectedKey)) {
    await recordAttempt('setup', 'setup', false);
    return res.status(401).json({ error: 'Invalid setup key.' });
  }

  const existing = await sql`SELECT id, totp_enabled, totp_secret, username FROM admin_users LIMIT 1`;
  if (existing.length > 0 && existing[0].totp_enabled) {
    return res.status(403).json({ error: 'Admin already initialized.' });
  }

  // Resume an incomplete enrollment: return the existing secret.
  if (existing.length > 0 && !existing[0].totp_enabled) {
    const user = existing[0];
    const pendingToken = await signPending(user.id, 'enroll');
    await recordAttempt('setup', 'setup', true);
    return res.status(200).json({
      pendingToken,
      secret: user.totp_secret,
      otpauth: otpauthUri(user.totp_secret, user.username),
    });
  }

  const name = String(username || '').trim();
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(name)) {
    return res.status(400).json({ error: 'Username must be 3-32 chars: letters, numbers, _ . -' });
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 10-128 characters.' });
  }

  const totpSecret = generateTotpSecret();
  const pwHash = await hashPassword(password);

  const rows = await sql`
    INSERT INTO admin_users (username, password_hash, totp_secret)
    VALUES (${name}, ${pwHash}, ${totpSecret})
    RETURNING id`;
  const userId = rows[0].id;

  const pendingToken = await signPending(userId, 'enroll');
  await recordAttempt('setup', 'setup', true);
  return res.status(200).json({
    pendingToken,
    secret: totpSecret,
    otpauth: otpauthUri(totpSecret, name),
  });
}
