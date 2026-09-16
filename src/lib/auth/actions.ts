'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  hashPassword,
  comparePassword,
  generateTotpSecret,
  otpauthUri,
  verifyTotp,
  safeEqual,
} from './crypto';
import { signPending, verifyPending, signSession, setSessionCookie, clearSessionCookie, getSessionUser } from './session';
import { tooManyAttempts, recordAttempt } from './rate-limit';

type ActionResult<T = Record<string, never>> = { ok: true; data: T } | { ok: false; error: string };

const SetupSchema = z.object({
  setupKey: z.string().min(1),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.-]{3,32}$/, 'Username must be 3-32 chars: letters, numbers, _ . -'),
  password: z.string().min(10).max(128),
});

export async function setupAdmin(input: unknown): Promise<ActionResult<{ pendingToken: string; secret: string; otpauth: string }>> {
  const parsed = SetupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const { setupKey, username, password } = parsed.data;

  if (await tooManyAttempts('setup', 'setup')) {
    return { ok: false, error: 'Too many attempts. Try again later.' };
  }

  const expectedKey = process.env.ADMIN_SETUP_KEY || '';
  if (!expectedKey || !safeEqual(setupKey, expectedKey)) {
    await recordAttempt('setup', 'setup', false);
    return { ok: false, error: 'Invalid setup key.' };
  }

  const existing = await prisma.user.findFirst();
  if (existing?.totpEnabled) {
    return { ok: false, error: 'Admin already initialized.' };
  }

  if (existing && !existing.totpEnabled) {
    const pendingToken = await signPending(existing.id, 'enroll');
    await recordAttempt('setup', 'setup', true);
    return {
      ok: true,
      data: {
        pendingToken,
        secret: existing.totpSecret!,
        otpauth: otpauthUri(existing.totpSecret!, existing.username),
      },
    };
  }

  const totpSecret = generateTotpSecret();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash, totpSecret, role: 'ADMIN' },
  });

  const pendingToken = await signPending(user.id, 'enroll');
  await recordAttempt('setup', 'setup', true);
  return { ok: true, data: { pendingToken, secret: totpSecret, otpauth: otpauthUri(totpSecret, username) } };
}

const TotpConfirmSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(1),
});

export async function confirmTotpEnrollment(input: unknown): Promise<ActionResult> {
  const parsed = TotpConfirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const { pendingToken, code } = parsed.data;

  const userId = await verifyPending(pendingToken, 'enroll');
  if (!userId) return { ok: false, error: 'Enrollment expired. Start setup again.' };

  if (await tooManyAttempts(userId, 'totp')) {
    return { ok: false, error: 'Too many attempts. Try again later.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: 'User not found.' };
  if (user.totpEnabled) return { ok: false, error: 'Already enrolled.' };

  if (!verifyTotp(user.totpSecret!, code)) {
    await recordAttempt(userId, 'totp', false);
    return { ok: false, error: 'Invalid code. Check your authenticator and try again.' };
  }

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
  await recordAttempt(userId, 'totp', true);
  await setSessionCookie(await signSession(userId));
  return { ok: true, data: {} };
}

const LoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function login(input: unknown): Promise<ActionResult<{ pendingToken: string }>> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const name = parsed.data.username.toLowerCase();

  if (await tooManyAttempts(name, 'login')) {
    return { ok: false, error: 'Too many failed attempts. Try again in 15 minutes.' };
  }

  const user = await prisma.user.findFirst({ where: { username: { equals: name, mode: 'insensitive' } } });
  const ok = !!user && (await comparePassword(parsed.data.password, user.passwordHash));

  if (!ok || !user) {
    await recordAttempt(name, 'login', false);
    return { ok: false, error: 'Invalid username or password.' };
  }

  await recordAttempt(name, 'login', true);
  const pendingToken = await signPending(user.id, 'totp');
  return { ok: true, data: { pendingToken } };
}

export async function verifyLoginTotp(input: unknown): Promise<ActionResult> {
  const parsed = TotpConfirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const { pendingToken, code } = parsed.data;

  const userId = await verifyPending(pendingToken, 'totp');
  if (!userId) return { ok: false, error: 'Session expired. Log in again.' };

  if (await tooManyAttempts(userId, 'totp')) {
    return { ok: false, error: 'Too many attempts. Try again later.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpEnabled) return { ok: false, error: 'TOTP not enrolled.' };

  if (!verifyTotp(user.totpSecret!, code)) {
    await recordAttempt(userId, 'totp', false);
    return { ok: false, error: 'Invalid code.' };
  }

  await recordAttempt(userId, 'totp', true);
  await setSessionCookie(await signSession(userId));
  return { ok: true, data: {} };
}

export async function logout(): Promise<ActionResult> {
  await clearSessionCookie();
  return { ok: true, data: {} };
}

export async function getAuthStatus() {
  const count = await prisma.user.count();
  const enrolledCount = await prisma.user.count({ where: { totpEnabled: true } });
  const user = await getSessionUser();
  return {
    initialized: enrolledCount > 0,
    pendingEnrollment: count > 0 && enrolledCount === 0,
    authenticated: !!user,
  };
}
