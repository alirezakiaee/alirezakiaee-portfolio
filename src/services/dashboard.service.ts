import 'server-only';
import { prisma } from '@/lib/db';

export async function getDashboardStats() {
  const now = new Date();
  const [
    pagesPublished,
    pagesDraft,
    postsPublished,
    postsDraft,
    postsScheduled,
    projectsPublished,
    projectsDraft,
    mediaCount,
    pagesScheduled,
    projectsScheduled,
  ] = await Promise.all([
    prisma.page.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.page.count({ where: { status: 'DRAFT', deletedAt: null } }),
    prisma.post.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.post.count({ where: { status: 'DRAFT', deletedAt: null } }),
    prisma.post.count({ where: { status: 'SCHEDULED', deletedAt: null } }),
    prisma.project.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.project.count({ where: { status: 'DRAFT', deletedAt: null } }),
    prisma.media.count({ where: { deletedAt: null } }),
    prisma.page.count({ where: { status: 'SCHEDULED', scheduledAt: { gt: now } } }),
    prisma.project.count({ where: { status: 'SCHEDULED', scheduledAt: { gt: now } } }),
  ]);

  const scheduledCount = postsScheduled + pagesScheduled + projectsScheduled;

  return {
    pagesPublished,
    pagesDraft,
    postsPublished,
    postsDraft,
    postsScheduled,
    projectsPublished,
    projectsDraft,
    mediaCount,
    scheduledCount,
  };
}

export async function getRecentActivity(limit = 10) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { username: true } } },
  });
}
