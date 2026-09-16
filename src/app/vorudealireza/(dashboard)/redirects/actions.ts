'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { RedirectType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { isPostgresUniqueViolation } from '@/lib/slug';

export type RedirectFormState = { error: string | null };

const PATH_RE = /^\/[a-zA-Z0-9\-._~%!$&'()*+,;=:@/?#]*$/;

const RedirectSchema = z.object({
  id: z.string().optional(),
  fromPath: z.string().trim().min(1, 'From path is required').max(500).regex(PATH_RE, 'Must be a path starting with /'),
  toPath: z.string().trim().min(1, 'To path is required').max(500),
  type: z.nativeEnum(RedirectType).default('PERMANENT'),
  enabled: z.boolean(),
});

function isValidTarget(url: string): boolean {
  if (url.startsWith('/')) return PATH_RE.test(url);
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function saveRedirect(_prev: RedirectFormState, formData: FormData): Promise<RedirectFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'settings.write');
  } catch {
    return { error: 'You do not have permission.' };
  }

  const parsed = RedirectSchema.safeParse({
    id: formData.get('id') || undefined,
    fromPath: formData.get('fromPath'),
    toPath: formData.get('toPath'),
    type: formData.get('type') || 'PERMANENT',
    enabled: formData.get('enabled') === 'on' || formData.get('enabled') === 'true',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  if (!isValidTarget(parsed.data.toPath)) return { error: 'Target must be a path (/…) or http(s) URL.' };
  if (parsed.data.fromPath === parsed.data.toPath) return { error: 'From and to paths are identical.' };

  const data = {
    fromPath: parsed.data.fromPath,
    toPath: parsed.data.toPath,
    type: parsed.data.type,
    enabled: parsed.data.enabled,
  };

  try {
    if (parsed.data.id) {
      await prisma.redirect.update({ where: { id: parsed.data.id }, data });
      await logAudit({ userId: user.id, action: 'redirect.update', resource: 'redirect', resourceId: parsed.data.id, metadata: data });
    } else {
      const r = await prisma.redirect.create({ data });
      await logAudit({ userId: user.id, action: 'redirect.create', resource: 'redirect', resourceId: r.id, metadata: data });
    }
  } catch (e) {
    if (isPostgresUniqueViolation(e)) return { error: 'A redirect from that path already exists.' };
    throw e;
  }
  revalidatePath('/vorudealireza/redirects');
  return { error: null };
}

export async function deleteRedirect(_prev: RedirectFormState, formData: FormData): Promise<RedirectFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'settings.write');
  } catch {
    return { error: 'You do not have permission.' };
  }
  const id = String(formData.get('id') ?? '');
  const r = await prisma.redirect.findUnique({ where: { id } });
  if (!r) return { error: 'Redirect not found.' };
  await prisma.redirect.delete({ where: { id } });
  await logAudit({ userId: user.id, action: 'redirect.delete', resource: 'redirect', resourceId: id, metadata: { fromPath: r.fromPath } });
  revalidatePath('/vorudealireza/redirects');
  return { error: null };
}
