import 'server-only';
import { cache } from 'react';
import type { NavLocation } from '@prisma/client';
import { prisma } from '@/lib/db';
import { SETTING_KEYS, type SettingKey } from '@/lib/settings-keys';

// All loaders are React-cache deduped per request.

export const getSettings = cache(async () => {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const out = {} as Record<SettingKey, string>;
  for (const k of SETTING_KEYS) out[k] = '';
  for (const r of rows) out[r.key as SettingKey] = typeof r.value === 'string' ? r.value : String(r.value ?? '');
  return out;
});

export const getNavItems = cache(async (location: NavLocation) => {
  const nav = await prisma.navigation.findUnique({
    where: { location },
    include: {
      items: {
        where: { enabled: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        include: {
          children: {
            where: { enabled: true },
            orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
          },
        },
      },
    },
  });
  return (nav?.items ?? []).filter((i) => !i.parentId);
});

export const getHomePage = cache(async () =>
  prisma.page.findUnique({
    where: { slug: 'home' },
    include: { blocks: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
  })
);

export const getPageBySlug = cache(async (slug: string) =>
  prisma.page.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { blocks: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
  })
);

export const getPublishedPosts = cache(async () =>
  prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      featuredImage: { select: { storagePath: true, altText: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  })
);

export const getPostBySlug = cache(async (slug: string) =>
  prisma.post.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      featuredImage: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  })
);

export const getFeaturedProjects = cache(async (limit = 4) =>
  prisma.project.findMany({
    where: { status: 'PUBLISHED', featured: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: { technologies: { include: { technology: { select: { name: true } } } } },
  })
);

export const getProjectBySlug = cache(async (slug: string) =>
  prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      technologies: { include: { technology: { select: { name: true } } } },
      gallery: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
      coverImage: true,
    },
  })
);
