import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/db';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
export const SESSION_COOKIE = 'ak_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours
const PENDING_TTL_SECONDS = 60 * 10; // 10 minutes for setup/login intermediate steps

export type PendingScope = 'enroll' | 'totp';

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, scope: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function signPending(userId: string, scope: PendingScope): Promise<string> {
  return new SignJWT({ sub: userId, scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_TTL_SECONDS}s`)
    .sign(secret);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { sub?: string; scope?: string };
  } catch {
    return null;
  }
}

export async function verifyPending(token: string, scope: PendingScope): Promise<string | null> {
  const payload = await verifyToken(token);
  if (!payload || payload.scope !== scope || !payload.sub) return null;
  return payload.sub;
}

/** Reads and validates the admin session cookie. Returns the authenticated user or null. */
export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || payload.scope !== 'admin' || !payload.sub) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user;
}

/** Throws if there's no authenticated admin session. Use at the top of every Server Action. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 });
}
