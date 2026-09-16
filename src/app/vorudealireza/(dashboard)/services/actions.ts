'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { isPostgresUniqueViolation, isValidSlug, slugify } from '@/lib/slug';

export type ServiceFormState = { error: string | null };

const ServiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z.string().trim().max(80).optional(),
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(20000).optional(),
  icon: z.string().trim().max(300).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaUrl: z.string().trim().max(500).optional(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  technologyNames: z.string().max(2000).optional(),
});

function parseFeatures(raw: FormDataEntryValue | null): string[] | null {
  if (raw == null || String(raw).trim() === '') return [];
  const lines = String(raw).split('\n').map((s) => s.trim()).filter(Boolean);
  return lines.length <= 50 && lines.every((l) => l.length <= 200) ? lines : null;
}

export async function saveService(_prev: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { error: 'You do not have permission.' };
  }

  const features = parseFeatures(formData.get('features'));
  if (!features) return { error: 'Features must be ≤50 lines of ≤200 chars.' };

  const parsed = ServiceSchema.safeParse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    summary: formData.get('summary') || undefined,
    description: formData.get('description') || undefined,
    icon: formData.get('icon') || undefined,
    ctaLabel: formData.get('ctaLabel') || undefined,
    ctaUrl: formData.get('ctaUrl') || undefined,
    active: formData.get('active') === 'on',
    sortOrder: formData.get('sortOrder'),
    technologyNames: formData.get('technologyNames') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name);
  if (!isValidSlug(slug)) return { error: 'Invalid slug.' };

  const techNames = (parsed.data.technologyNames ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  const techRows: { id: string }[] = [];
  for (const name of techNames) {
    const tslug = slugify(name);
    if (!tslug) continue;
    const t = await prisma.technology.upsert({
      where: { slug: tslug },
      create: { name, slug: tslug },
      update: {},
      select: { id: true },
    });
    techRows.push(t);
  }

  const data = {
    name: parsed.data.name,
    slug,
    summary: parsed.data.summary || null,
    description: parsed.data.description || null,
    icon: parsed.data.icon || null,
    ctaLabel: parsed.data.ctaLabel || null,
    ctaUrl: parsed.data.ctaUrl || null,
    active: parsed.data.active,
    sortOrder: parsed.data.sortOrder,
    features,
    technologies: {
      deleteMany: {},
      create: techRows.map((t) => ({ technologyId: t.id })),
    },
  };

  let id = parsed.data.id;
  try {
    if (id) {
      await prisma.service.update({ where: { id }, data });
      await logAudit({ userId: user.id, action: 'service.update', resource: 'service', resourceId: id, metadata: { name: parsed.data.name } });
    } else {
      const created = await prisma.service.create({ data: { ...data, technologies: { create: techRows.map((t) => ({ technologyId: t.id })) } } });
      id = created.id;
      await logAudit({ userId: user.id, action: 'service.create', resource: 'service', resourceId: id, metadata: { name: parsed.data.name } });
    }
  } catch (e) {
    if (isPostgresUniqueViolation(e)) return { error: 'A service with that slug already exists.' };
    throw e;
  }
  revalidatePath('/vorudealireza/services');
  redirect(`/vorudealireza/services/${id}?saved=1`);
}

export async function deleteService(_prev: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.delete');
  } catch {
    return { error: 'You do not have permission.' };
  }
  const id = String(formData.get('id') ?? '');
  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) return { error: 'Service not found.' };
  await prisma.service.delete({ where: { id } });
  await logAudit({ userId: user.id, action: 'service.delete', resource: 'service', resourceId: id, metadata: { name: svc.name } });
  revalidatePath('/vorudealireza/services');
  redirect('/vorudealireza/services');
}
