import 'server-only';
import { prisma } from '@/lib/db';

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

export async function tooManyAttempts(identifier: string, kind: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const count = await prisma.authAttempt.count({
    where: { identifier, kind, success: false, createdAt: { gt: since } },
  });
  return count >= MAX_FAILURES;
}

export async function recordAttempt(identifier: string, kind: string, success: boolean) {
  await prisma.authAttempt.create({ data: { identifier, kind, success } });
}
