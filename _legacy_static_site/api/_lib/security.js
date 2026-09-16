import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { sql } from './db.js';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
export const SESSION_COOKIE = 'ak_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours
const PENDING_TTL_SECONDS = 60 * 10; // 10 minutes for pending auth steps

// ---------- sessions ----------
export async function signSession(userId) {
  return new SignJWT({ sub: userId, scope: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

// Short-lived token for multi-step auth (enroll / totp verify). Never grants access.
export async function signPending(userId, scope) {
  return new SignJWT({ sub: userId, scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_TTL_SECONDS}s`)
    .sign(secret);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export async function getSessionUser(req) {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.scope !== 'admin' || !payload.sub) return null;
  return payload.sub;
}

export async function verifyPending(token, scope) {
  const payload = await verifyToken(token);
  if (!payload || payload.scope !== scope || !payload.sub) return null;
  return payload.sub;
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

// ---------- CSRF ----------
// Cookie is SameSite=Strict; additionally require a custom header on mutations.
export function hasCsrfHeader(req) {
  return req.headers['x-csrf'] === '1';
}

// ---------- rate limiting ----------
const WINDOW = '15 minutes';
const MAX_FAILURES = 5;

export async function tooManyAttempts(identifier, kind) {
  const rows = await sql`
    SELECT count(*)::int AS n FROM auth_attempts
    WHERE identifier = ${identifier} AND kind = ${kind} AND success = false
      AND created_at > now() - interval '15 minutes'`;
  return rows[0].n >= MAX_FAILURES;
}

export async function recordAttempt(identifier, kind, success) {
  await sql`
    INSERT INTO auth_attempts (identifier, kind, success)
    VALUES (${identifier}, ${kind}, ${success})`;
}

// ---------- passwords ----------
export const hashPassword = (pw) => bcrypt.hash(pw, 12);
export const comparePassword = (pw, hash) => bcrypt.compare(pw, hash);

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ---------- TOTP (RFC 6238) ----------
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of str.toUpperCase().replace(/=+$/, '')) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(keyBytes, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', keyBytes).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[off] & 0x7f) << 24) |
      ((hmac[off + 1] & 0xff) << 16) |
      ((hmac[off + 2] & 0xff) << 8) |
      (hmac[off + 3] & 0xff)) %
    1000000;
  return String(code).padStart(6, '0');
}

export function verifyTotp(secretB32, code) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const key = base32Decode(secretB32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (const offset of [-1, 0, 1]) {
    const expected = hotp(key, counter + offset);
    if (crypto.timingSafeEqual(Buffer.from(c), Buffer.from(expected))) return true;
  }
  return false;
}

export function otpauthUri(secretB32, username) {
  const issuer = 'AK Portfolio';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    username
  )}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
