import 'server-only';
import type { ContentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type PageListFilter = { status?: ContentStatus; q?: string };

export async function listPages(filter: PageListFilter = {}) {
  const where: Prisma.PageWhereInput = { deletedAt: null };
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { slug: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  return prisma.page.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { blocks: true } }, parent: { select: { title: true, slug: true } } },
  });
}

export async function getPage(id: string) {
  return prisma.page.findFirst({
    where: { id, deletedAt: null },
    include: { blocks: { orderBy: { sortOrder: 'asc' } }, parent: { select: { id: true, title: true } } },
  });
}

export async function listParentOptions(excludeId?: string) {
  return prisma.page.findMany({
    where: { deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, slug: true },
  });
}

export async function getPageRevisions(pageId: string, limit = 50) {
  return prisma.pageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { author: { select: { username: true } } },
  });
}
