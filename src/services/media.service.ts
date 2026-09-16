import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type MediaListFilter = { q?: string; type?: 'image' | 'file' };

export async function listMedia(filter: MediaListFilter = {}, limit = 60) {
  const where: Prisma.MediaWhereInput = { deletedAt: null };
  if (filter.type === 'image') where.mimeType = { startsWith: 'image/' };
  if (filter.type === 'file') where.mimeType = { not: { startsWith: 'image/' } };
  if (filter.q) {
    where.OR = [
      { originalName: { contains: filter.q, mode: 'insensitive' } },
      { altText: { contains: filter.q, mode: 'insensitive' } },
      { title: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  return prisma.media.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { uploadedBy: { select: { username: true } } },
  });
}

export async function getMedia(id: string) {
  return prisma.media.findFirst({
    where: { id, deletedAt: null },
    include: {
      uploadedBy: { select: { username: true } },
      projectCovers: { select: { id: true, title: true } },
      projectImages: { select: { project: { select: { id: true, title: true } } } },
      pages: { select: { id: true, title: true } },
      posts: { select: { id: true, title: true } },
    },
  });
}
