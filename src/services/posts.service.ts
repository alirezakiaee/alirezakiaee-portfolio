import 'server-only';
import type { ContentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type PostListFilter = { status?: ContentStatus; q?: string };

export async function listPosts(filter: PostListFilter = {}) {
  const where: Prisma.PostWhereInput = { deletedAt: null };
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { slug: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  return prisma.post.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      author: { select: { username: true } },
    },
  });
}

export async function getPost(id: string) {
  return prisma.post.findFirst({
    where: { id, deletedAt: null },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      featuredImage: true,
    },
  });
}

export async function getPostRevisions(postId: string, limit = 50) {
  return prisma.postRevision.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { author: { select: { username: true } } },
  });
}

export async function listTaxonomies() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return { categories, tags };
}

export async function listImageMedia() {
  return prisma.media.findMany({
    where: { deletedAt: null, mimeType: { startsWith: 'image/' } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, originalName: true, title: true },
  });
}
