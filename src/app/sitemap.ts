import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? 'https://www.alirezakiaee.com').replace(/\/$/, '');

  const [pages, posts, projects] = await Promise.all([
    prisma.page.findMany({
      where: { status: 'PUBLISHED', robotsIndex: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED', robotsIndex: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: { status: 'PUBLISHED', robotsIndex: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/blog`, lastModified: posts[0]?.updatedAt, changeFrequency: 'weekly', priority: 0.8 },
    ...pages.map((p) => ({
      url: `${base}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...projects.map((p) => ({
      url: `${base}/projects/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
