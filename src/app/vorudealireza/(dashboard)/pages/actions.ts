'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma, type ContentStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import DOMPurify from 'isomorphic-dompurify';
import { isPostgresUniqueViolation, isValidSlug, RESERVED_SLUGS, slugify } from '@/lib/slug';
import { validateBlock } from '@/lib/blocks/schemas';

const SANITIZE_OPTS = { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'img', 'figure', 'figcaption', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span'], ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'width', 'height'] };

export type PageFormState = { error: string | null };

const optionalText = z.string().trim().max(20000).optional();
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Must be an http(s) URL')
  .optional();

const PageFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(500).optional(),
  template: z.string().trim().max(60).optional(),
  parentId: z.string().trim().optional(),
  sortOrder: z.string().trim().optional(),
  blocksJson: z.string().max(400000).optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(300).optional(),
  canonicalUrl: optionalUrl,
  ogTitle: z.string().trim().max(200).optional(),
  ogDescription: z.string().trim().max(300).optional(),
  scheduledAt: z.string().trim().optional(),
  intent: z.enum(['save', 'publish', 'schedule', 'unpublish', 'archive']).default('save'),
});

const IncomingBlock = z.object({
  type: z.string().min(1).max(40),
  data: z.unknown(),
  enabled: z.boolean().default(true),
});

function formRecord(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

const orNull = (v: string | undefined) => (v ? v : null);

function resolveStatus(
  intent: z.infer<typeof PageFormSchema>['intent'],
  current: ContentStatus | undefined,
  scheduledAt: Date | null
): { status: ContentStatus; error?: string } {
  switch (intent) {
    case 'publish':
      return { status: 'PUBLISHED' };
    case 'schedule':
      if (!scheduledAt || scheduledAt.getTime() <= Date.now())
        return { status: current ?? 'DRAFT', error: 'Choose a future date/time to schedule.' };
      return { status: 'SCHEDULED' };
    case 'unpublish':
      return { status: 'DRAFT' };
    case 'archive':
      return { status: 'ARCHIVED' };
    default:
      return { status: current ?? 'DRAFT' };
  }
}

function parseBlocks(
  raw: string | undefined
): { ok: true; blocks: { type: string; data: Record<string, unknown>; enabled: boolean }[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, blocks: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Block data was corrupted in transit — reload and try again.' };
  }
  const arr = z.array(IncomingBlock).max(100).safeParse(parsed);
  if (!arr.success) return { ok: false, error: 'Invalid block list.' };
  const blocks: { type: string; data: Record<string, unknown>; enabled: boolean }[] = [];
  for (const b of arr.data) {
    const v = validateBlock(b.type, b.data);
    if (!v.ok) return { ok: false, error: `${b.type} block: ${v.error}` };
    // richText blocks render via dangerouslySetInnerHTML — sanitize before storing.
    if (b.type === 'richText' && typeof v.data.html === 'string') {
      v.data.html = DOMPurify.sanitize(v.data.html, SANITIZE_OPTS);
    }
    blocks.push({ type: b.type, data: v.data, enabled: b.enabled });
  }
  return { ok: true, blocks };
}

export async function savePage(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { error: 'You do not have permission to edit pages.' };
  }

  const parsed = PageFormSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const d = parsed.data;

  const slug = d.slug ? slugify(d.slug) : slugify(d.title);
  if (!isValidSlug(slug)) return { error: 'Slug must be lowercase letters, numbers and dashes.' };
  if (RESERVED_SLUGS.has(slug)) return { error: `"${slug}" is reserved — pick another slug.` };

  const blocksResult = parseBlocks(d.blocksJson);
  if (!blocksResult.ok) return { error: blocksResult.error };
  const blocks = blocksResult.blocks;

  const robotsIndex = formData.get('robotsIndex') === 'on';
  const robotsFollow = formData.get('robotsFollow') === 'on';
  const sortOrder = /^-?\d{1,6}$/.test(d.sortOrder ?? '') ? parseInt(d.sortOrder!, 10) : 0;
  const scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;

  const existing = d.id
    ? await prisma.page.findFirst({ where: { id: d.id, deletedAt: null } })
    : null;
  if (d.id && !existing) return { error: 'Page not found.' };

  if (d.parentId && d.parentId === d.id) return { error: 'A page cannot be its own parent.' };
  if (d.parentId) {
    const parent = await prisma.page.findFirst({ where: { id: d.parentId, deletedAt: null } });
    if (!parent) return { error: 'Parent page not found.' };
  }

  const { status, error } = resolveStatus(d.intent, existing?.status, scheduledAt);
  if (error) return { error };

  const data: Prisma.PageUncheckedUpdateInput = {
    title: d.title,
    slug,
    excerpt: orNull(d.excerpt),
    template: orNull(d.template) ?? 'default',
    parentId: orNull(d.parentId),
    sortOrder,
    status,
    seoTitle: orNull(d.seoTitle),
    seoDescription: orNull(d.seoDescription),
    canonicalUrl: orNull(d.canonicalUrl),
    robotsIndex,
    robotsFollow,
    ogTitle: orNull(d.ogTitle),
    ogDescription: orNull(d.ogDescription),
    scheduledAt: status === 'SCHEDULED' ? scheduledAt : null,
    publishedAt: status === 'PUBLISHED' ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
    authorId: user.id,
  };

  try {
    if (existing) {
      const snapshot = await prisma.page.findUniqueOrThrow({
        where: { id: existing.id },
        include: { blocks: { orderBy: { sortOrder: 'asc' } } },
      });
      await prisma.$transaction([
        prisma.pageRevision.create({
          data: { pageId: existing.id, authorId: user.id, snapshot: snapshot as unknown as Prisma.InputJsonValue },
        }),
        prisma.pageBlock.deleteMany({ where: { pageId: existing.id } }),
        prisma.pageBlock.createMany({
          data: blocks.map((b, i) => ({ pageId: existing.id, type: b.type, data: b.data as Prisma.InputJsonValue, sortOrder: i, enabled: b.enabled })),
        }),
        prisma.page.update({ where: { id: existing.id }, data }),
      ]);
      await logAudit({
        userId: user.id,
        action: `page.${d.intent === 'save' ? 'update' : d.intent}`,
        resource: 'page',
        resourceId: existing.id,
        metadata: { title: d.title, slug, status, blocks: blocks.length },
      });
      revalidatePath('/vorudealireza/pages');
      redirect(`/vorudealireza/pages/${existing.id}?saved=1`);
    }

    const created = await prisma.$transaction(async (tx) => {
      const page = await tx.page.create({ data: data as Prisma.PageUncheckedCreateInput });
      await tx.pageBlock.createMany({
        data: blocks.map((b, i) => ({ pageId: page.id, type: b.type, data: b.data as Prisma.InputJsonValue, sortOrder: i, enabled: b.enabled })),
      });
      return page;
    });
    await logAudit({
      userId: user.id,
      action: 'page.create',
      resource: 'page',
      resourceId: created.id,
      metadata: { title: d.title, slug, status, blocks: blocks.length },
    });
    revalidatePath('/vorudealireza/pages');
    redirect(`/vorudealireza/pages/${created.id}?saved=1`);
  } catch (e) {
    if (isPostgresUniqueViolation(e)) return { error: 'Another page already uses that slug.' };
    throw e;
  }
  return { error: null };
}

export async function deletePage(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.delete');
  } catch {
    return { error: 'You do not have permission to delete pages.' };
  }
  const id = String(formData.get('id') ?? '');
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null } });
  if (!page) return { error: 'Page not found.' };

  await prisma.page.update({ where: { id }, data: { deletedAt: new Date() } });
  // Detach children so they become top-level pages rather than orphans.
  await prisma.page.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await logAudit({
    userId: user.id,
    action: 'page.delete',
    resource: 'page',
    resourceId: id,
    metadata: { title: page.title, slug: page.slug },
  });
  revalidatePath('/vorudealireza/pages');
  redirect('/vorudealireza/pages');
}

const PAGE_EDITABLE_KEYS = [
  'title', 'slug', 'excerpt', 'template', 'parentId', 'sortOrder', 'status',
  'seoTitle', 'seoDescription', 'canonicalUrl', 'robotsIndex', 'robotsFollow',
  'ogTitle', 'ogDescription', 'scheduledAt', 'publishedAt',
] as const;

export async function restorePageRevision(pageId: string, revisionId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Not signed in.');
  assertCan(user.role, 'content.write');

  const revision = await prisma.pageRevision.findFirst({ where: { id: revisionId, pageId } });
  if (!revision) throw new Error('Revision not found.');
  const snap = revision.snapshot as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  for (const k of PAGE_EDITABLE_KEYS) if (k in snap) data[k] = snap[k];
  const snapBlocks = Array.isArray(snap.blocks) ? snap.blocks : [];

  try {
    await prisma.$transaction([
      prisma.pageBlock.deleteMany({ where: { pageId } }),
      prisma.pageBlock.createMany({
        data: snapBlocks.map((b, i) => {
          const blk = b as { type?: string; data?: unknown; enabled?: boolean };
          return {
            pageId,
            type: String(blk.type ?? 'richText'),
            data: (blk.data ?? {}) as Prisma.InputJsonValue,
            sortOrder: i,
            enabled: blk.enabled !== false,
          };
        }),
      }),
      prisma.page.update({ where: { id: pageId }, data }),
    ]);
  } catch (e) {
    if (isPostgresUniqueViolation(e)) throw new Error('Restored slug conflicts with another page.');
    throw e;
  }
  await logAudit({
    userId: user.id,
    action: 'page.restore_revision',
    resource: 'page',
    resourceId: pageId,
    metadata: { revisionId },
  });
  revalidatePath('/vorudealireza/pages');
  redirect(`/vorudealireza/pages/${pageId}?restored=1`);
}
