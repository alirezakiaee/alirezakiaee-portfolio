import { sql } from './_lib/db.js';
import {
  hashPassword,
  comparePassword,
  generateTotpSecret,
  otpauthUri,
  verifyTotp,
  signPending,
  verifyPending,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
  hasCsrfHeader,
  safeEqual,
  tooManyAttempts,
  recordAttempt,
} from './_lib/security.js';

// Single consolidated auth endpoint (keeps us under the serverless function
// count limit). GET -> status. POST -> { action, ...payload }.
export default async function handler(req, res) {
  if (req.method === 'GET') return status(req, res);
  if (req.method !== 'POST') return res.status(405).end();
  if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });

  const action = req.body?.action;
  switch (action) {
    case 'setup':
      return setup(req, res);
    case 'confirm-totp':
      return confirmTotp(req, res);
    case 'login':
      return login(req, res);
    case 'verify-totp':
      return verifyTotpStep(req, res);
    case 'logout':
      return logout(req, res);
    default:
      return res.status(400).json({ error: 'Unknown action.' });
  }
}

async function status(req, res) {
  const rows = await sql`
    SELECT count(*)::int AS n, bool_or(totp_enabled) AS enrolled FROM admin_users`;
  const exists = rows[0].n > 0;
  const enrolled = exists && !!rows[0].enrolled;
  const user = await getSessionUser(req);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    initialized: enrolled,
    pendingEnrollment: exists && !enrolled,
    authenticated: !!user,
  });
}

async function setup(req, res) {
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

async function confirmTotp(req, res) {
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

async function login(req, res) {
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

async function verifyTotpStep(req, res) {
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

async function logout(req, res) {
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
