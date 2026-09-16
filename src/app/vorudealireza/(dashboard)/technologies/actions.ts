'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { isPostgresUniqueViolation, isValidSlug, slugify } from '@/lib/slug';

export type TechFormState = { error: string | null };

const TechSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(80),
  slug: z.string().trim().max(80).optional(),
  icon: z.string().trim().max(300).optional(),
});

export async function saveTechnology(_prev: TechFormState, formData: FormData): Promise<TechFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { error: 'You do not have permission.' };
  }
  const parsed = TechSchema.safeParse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    icon: formData.get('icon') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name);
  if (!isValidSlug(slug)) return { error: 'Invalid slug.' };

  try {
    if (parsed.data.id) {
      await prisma.technology.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name, slug, icon: parsed.data.icon || null },
      });
      await logAudit({ userId: user.id, action: 'technology.update', resource: 'technology', resourceId: parsed.data.id, metadata: { name: parsed.data.name } });
    } else {
      const t = await prisma.technology.create({
        data: { name: parsed.data.name, slug, icon: parsed.data.icon || null },
      });
      await logAudit({ userId: user.id, action: 'technology.create', resource: 'technology', resourceId: t.id, metadata: { name: parsed.data.name } });
    }
  } catch (e) {
    if (isPostgresUniqueViolation(e)) return { error: 'That name or slug already exists.' };
    throw e;
  }
  revalidatePath('/vorudealireza/technologies');
  return { error: null };
}

export async function deleteTechnology(_prev: TechFormState, formData: FormData): Promise<TechFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.delete');
  } catch {
    return { error: 'You do not have permission.' };
  }
  const id = String(formData.get('id') ?? '');
  const tech = await prisma.technology.findUnique({ where: { id }, include: { _count: { select: { projects: true, services: true } } } });
  if (!tech) return { error: 'Technology not found.' };
  if (tech._count.projects + tech._count.services > 0) {
    return { error: `In use by ${tech._count.projects + tech._count.services} item(s) — unlink it first.` };
  }
  await prisma.technology.delete({ where: { id } });
  await logAudit({ userId: user.id, action: 'technology.delete', resource: 'technology', resourceId: id, metadata: { name: tech.name } });
  revalidatePath('/vorudealireza/technologies');
  return { error: null };
}
