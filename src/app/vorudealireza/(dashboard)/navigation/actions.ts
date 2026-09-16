'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { NavLocation } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';

export type NavFormState = { error: string | null };

const NavItemSchema = z.object({
  id: z.string().optional(),
  location: z.nativeEnum(NavLocation),
  label: z.string().trim().min(1, 'Label is required').max(80),
  url: z.string().trim().min(1, 'URL is required').max(500),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  openInNewTab: z.boolean(),
  enabled: z.boolean(),
});

function isValidUrl(url: string): boolean {
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

async function guard(user: Awaited<ReturnType<typeof getSessionUser>>): Promise<NavFormState | null> {
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
    return null;
  } catch {
    return { error: 'You do not have permission.' };
  }
}

export async function saveNavItem(_prev: NavFormState, formData: FormData): Promise<NavFormState> {
  const user = await getSessionUser();
  const denied = await guard(user);
  if (denied) return denied;

  const parsed = NavItemSchema.safeParse({
    id: formData.get('id') || undefined,
    location: formData.get('location'),
    label: formData.get('label'),
    url: formData.get('url'),
    parentId: formData.get('parentId') || undefined,
    sortOrder: formData.get('sortOrder'),
    openInNewTab: formData.get('openInNewTab') === 'on',
    enabled: formData.get('enabled') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  if (!isValidUrl(parsed.data.url)) return { error: 'URL must be a path (/…), anchor (#…), mailto:, tel:, or http(s) URL.' };

  const nav = await prisma.navigation.upsert({
    where: { location: parsed.data.location },
    create: { location: parsed.data.location },
    update: {},
  });

  if (parsed.data.parentId) {
    const parent = await prisma.navigationItem.findFirst({
      where: { id: parsed.data.parentId, navigationId: nav.id, parentId: null },
      select: { id: true },
    });
    if (!parent) return { error: 'Invalid parent item (must be a top-level item in this menu).' };
  }
  if (parsed.data.id && parsed.data.id === parsed.data.parentId) {
    return { error: 'An item cannot be its own parent.' };
  }

  const data = {
    label: parsed.data.label,
    url: parsed.data.url,
    parentId: parsed.data.parentId || null,
    sortOrder: parsed.data.sortOrder,
    openInNewTab: parsed.data.openInNewTab,
    enabled: parsed.data.enabled,
  };

  if (parsed.data.id) {
    const existing = await prisma.navigationItem.findFirst({ where: { id: parsed.data.id, navigationId: nav.id } });
    if (!existing) return { error: 'Item not found.' };
    await prisma.navigationItem.update({ where: { id: parsed.data.id }, data });
    await logAudit({ userId: user!.id, action: 'nav.item.update', resource: 'navigation', resourceId: parsed.data.id, metadata: { label: data.label, location: parsed.data.location } });
  } else {
    const item = await prisma.navigationItem.create({ data: { ...data, navigationId: nav.id } });
    await logAudit({ userId: user!.id, action: 'nav.item.create', resource: 'navigation', resourceId: item.id, metadata: { label: data.label, location: parsed.data.location } });
  }
  revalidatePath('/vorudealireza/navigation');
  return { error: null };
}

export async function deleteNavItem(_prev: NavFormState, formData: FormData): Promise<NavFormState> {
  const user = await getSessionUser();
  const denied = await guard(user);
  if (denied) return denied;

  const id = String(formData.get('id') ?? '');
  const item = await prisma.navigationItem.findUnique({ where: { id }, include: { children: { select: { id: true } } } });
  if (!item) return { error: 'Item not found.' };
  // children are cascade-deleted by the FK — that's intentional for menu trees
  await prisma.navigationItem.delete({ where: { id } });
  await logAudit({
    userId: user!.id,
    action: 'nav.item.delete',
    resource: 'navigation',
    resourceId: id,
    metadata: { label: item.label, deletedChildren: item.children.length },
  });
  revalidatePath('/vorudealireza/navigation');
  return { error: null };
}
