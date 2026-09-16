'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { Prisma, type ContentStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit';
import { isPostgresUniqueViolation, isValidSlug, slugify } from '@/lib/slug';

export type PostFormState = { error: string | null };

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Must be an http(s) URL')
  .optional();

const PostFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().max(200000).optional(),
  featuredImageId: z.string().trim().optional(),
  categoryNames: z.string().trim().max(1000).optional(),
  tagNames: z.string().trim().max(1000).optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(300).optional(),
  canonicalUrl: optionalUrl,
  ogTitle: z.string().trim().max(200).optional(),
  ogDescription: z.string().trim().max(300).optional(),
  scheduledAt: z.string().trim().optional(),
  intent: z.enum(['save', 'publish', 'schedule', 'unpublish', 'archive']).default('save'),
});

function formRecord(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

const orNull = (v: string | undefined) => (v ? v : null);

function resolveStatus(
  intent: z.infer<typeof PostFormSchema>['intent'],
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

async function syncTaxonomy(postId: string, categoryNames: string, tagNames: string) {
  const link = async (
    names: string,
    model: 'category' | 'tag',
    joinModel: 'postCategory' | 'postTag',
    joinField: 'categoryId' | 'tagId'
  ) => {
    const wanted = [...new Set(names.split(',').map((n) => n.trim()).filter(Boolean))].slice(0, 30);
    const ids: string[] = [];
    for (const name of wanted) {
      const slug = slugify(name) || name.toLowerCase().replace(/\s+/g, '-');
      const record = await (prisma[model] as any).upsert({
        where: { slug },
        update: { name },
        create: { name, slug },
      });
      ids.push(record.id);
    }
    const join = prisma[joinModel] as any;
    await prisma.$transaction([
      join.deleteMany({ where: { postId, [joinField]: { notIn: ids } } }),
      join.createMany({
        data: ids.map((id) => ({ postId, [joinField]: id })),
        skipDuplicates: true,
      }),
    ]);
  };
  await link(categoryNames, 'category', 'postCategory', 'categoryId');
  await link(tagNames, 'tag', 'postTag', 'tagId');
}

export async function savePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.write');
  } catch {
    return { error: 'You do not have permission to edit posts.' };
  }

  const parsed = PostFormSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const d = parsed.data;

  const slug = d.slug ? slugify(d.slug) : slugify(d.title);
  if (!isValidSlug(slug)) return { error: 'Slug must be lowercase letters, numbers and dashes.' };

  // Sanitize the rich-text HTML server-side — never trust client content.
  const content = DOMPurify.sanitize(d.content ?? '', {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
  });

  const robotsIndex = formData.get('robotsIndex') === 'on';
  const robotsFollow = formData.get('robotsFollow') === 'on';
  const scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;

  const existing = d.id
    ? await prisma.post.findFirst({ where: { id: d.id, deletedAt: null } })
    : null;
  if (d.id && !existing) return { error: 'Post not found.' };

  if (d.featuredImageId) {
    const media = await prisma.media.findFirst({
      where: { id: d.featuredImageId, deletedAt: null, mimeType: { startsWith: 'image/' } },
    });
    if (!media) return { error: 'Featured image must be an uploaded image.' };
  }

  const { status, error } = resolveStatus(d.intent, existing?.status, scheduledAt);
  if (error) return { error };

  const data: Prisma.PostUncheckedUpdateInput = {
    title: d.title,
    slug,
    excerpt: orNull(d.excerpt),
    content,
    featuredImageId: orNull(d.featuredImageId),
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
      const { categories, tags, ...snapshot } = await prisma.post.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          categories: { include: { category: { select: { name: true } } } },
          tags: { include: { tag: { select: { name: true } } } },
        },
      });
      await prisma.postRevision.create({
        data: {
          postId: existing.id,
          authorId: user.id,
          snapshot: {
            ...snapshot,
            categories: categories.map((c) => c.category.name),
            tags: tags.map((t) => t.tag.name),
          } as Prisma.InputJsonValue,
        },
      });
      await prisma.post.update({ where: { id: existing.id }, data });
      await syncTaxonomy(existing.id, d.categoryNames ?? '', d.tagNames ?? '');
      await logAudit({
        userId: user.id,
        action: `post.${d.intent === 'save' ? 'update' : d.intent}`,
        resource: 'post',
        resourceId: existing.id,
        metadata: { title: d.title, slug, status },
      });
      revalidatePath('/vorudealireza/posts');
      redirect(`/vorudealireza/posts/${existing.id}?saved=1`);
    }

    const created = await prisma.post.create({ data: data as Prisma.PostUncheckedCreateInput });
    await syncTaxonomy(created.id, d.categoryNames ?? '', d.tagNames ?? '');
    await logAudit({
      userId: user.id,
      action: 'post.create',
      resource: 'post',
      resourceId: created.id,
      metadata: { title: d.title, slug, status },
    });
    revalidatePath('/vorudealireza/posts');
    redirect(`/vorudealireza/posts/${created.id}?saved=1`);
  } catch (e) {
    if (isPostgresUniqueViolation(e)) return { error: 'Another post already uses that slug.' };
    throw e;
  }
  return { error: null };
}

export async function deletePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in.' };
  try {
    assertCan(user.role, 'content.delete');
  } catch {
    return { error: 'You do not have permission to delete posts.' };
  }
  const id = String(formData.get('id') ?? '');
  const post = await prisma.post.findFirst({ where: { id, deletedAt: null } });
  if (!post) return { error: 'Post not found.' };

  await prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit({
    userId: user.id,
    action: 'post.delete',
    resource: 'post',
    resourceId: id,
    metadata: { title: post.title, slug: post.slug },
  });
  revalidatePath('/vorudealireza/posts');
  redirect('/vorudealireza/posts');
}

const POST_EDITABLE_KEYS = [
  'title', 'slug', 'excerpt', 'content', 'featuredImageId', 'status',
  'seoTitle', 'seoDescription', 'canonicalUrl', 'robotsIndex', 'robotsFollow',
  'ogTitle', 'ogDescription', 'scheduledAt', 'publishedAt',
] as const;

export async function restorePostRevision(postId: string, revisionId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error('Not signed in.');
  assertCan(user.role, 'content.write');

  const revision = await prisma.postRevision.findFirst({ where: { id: revisionId, postId } });
  if (!revision) throw new Error('Revision not found.');
  const snap = revision.snapshot as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  for (const k of POST_EDITABLE_KEYS) if (k in snap) data[k] = snap[k];

  try {
    await prisma.post.update({ where: { id: postId }, data });
    if (Array.isArray(snap.categories) || Array.isArray(snap.tags)) {
      await syncTaxonomy(
        postId,
        Array.isArray(snap.categories) ? (snap.categories as string[]).join(',') : '',
        Array.isArray(snap.tags) ? (snap.tags as string[]).join(',') : ''
      );
    }
  } catch (e) {
    if (isPostgresUniqueViolation(e)) throw new Error('Restored slug conflicts with another post.');
    throw e;
  }
  await logAudit({
    userId: user.id,
    action: 'post.restore_revision',
    resource: 'post',
    resourceId: postId,
    metadata: { revisionId },
  });
  revalidatePath('/vorudealireza/posts');
  redirect(`/vorudealireza/posts/${postId}?restored=1`);
}
