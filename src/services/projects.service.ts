import 'server-only';
import type { ContentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type ProjectListFilter = { status?: ContentStatus; q?: string };

export async function listProjects(filter: ProjectListFilter = {}) {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { slug: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  return prisma.project.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: { technologies: { include: { technology: true } } },
  });
}

export async function getProject(id: string) {
  return prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      technologies: { include: { technology: true }, orderBy: { technology: { name: 'asc' } } },
      gallery: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
      coverImage: true,
    },
  });
}

export async function getProjectRevisions(projectId: string, limit = 50) {
  return prisma.projectRevision.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { author: { select: { username: true } } },
  });
}
