// Phase 11: migrate legacy_* tables (renamed during the Phase 2 schema
// migration) into the new CMS schema. Idempotent — safe to re-run; it
// upserts by stable keys (username, page/post/project slugs, block types).
//
//   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/migrate-legacy.mjs
//
// Requires DATABASE_URL (loads .env.local). Reads legacy_* via the Neon HTTP
// driver, writes new rows via Prisma.

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = neon(process.env.DATABASE_URL);
const { prisma } = await import('../src/lib/db.ts');
const { slugify } = await import('../src/lib/slug.ts');

const report = {};

// ---------- 1. Admin user ----------
const admins = await sql`SELECT * FROM legacy_admin_users`;
for (const a of admins) {
  await prisma.user.upsert({
    where: { username: a.username },
    create: {
      username: a.username,
      passwordHash: a.password_hash,
      totpSecret: a.totp_secret,
      totpEnabled: !!a.totp_enabled,
      role: 'ADMIN',
      createdAt: a.created_at,
    },
    update: { totpSecret: a.totp_secret, totpEnabled: !!a.totp_enabled },
  });
}
report.users = admins.length;

// ---------- 2. Legacy content blocks → home Page + Projects ----------
const blocks = await sql`SELECT * FROM legacy_content_blocks ORDER BY sort_order`;
const byType = {};
for (const b of blocks) (byType[b.type] ??= []).push(b);

const get = (type, title) => (byType[type] ?? []).find((b) => b.title === title);

// projects: real rows in the projects table, technologies upserted
let projectCount = 0;
for (const b of byType.project ?? []) {
  const slug = slugify(b.title);
  if (!slug) continue;
  const meta = b.meta ?? {};
  const project = await prisma.project.upsert({
    where: { slug },
    create: {
      title: b.title,
      slug,
      status: 'PUBLISHED',
      publishedAt: b.created_at,
      shortDescription: b.body ?? '',
      liveUrl: meta.link ?? null,
      cardStyle: meta.gradient ? { gradient: meta.gradient } : null,
      featured: true,
      sortOrder: b.sort_order,
      overview: b.body ?? null,
    },
    update: {
      shortDescription: b.body ?? '',
      liveUrl: meta.link ?? null,
      cardStyle: meta.gradient ? { gradient: meta.gradient } : null,
    },
  });
  const names = Array.isArray(meta.tags) ? meta.tags : [];
  for (const name of names) {
    const tslug = slugify(name);
    if (!tslug) continue;
    const tech = await prisma.technology.upsert({
      where: { slug: tslug },
      create: { name, slug: tslug },
      update: {},
    });
    await prisma.projectTechnology.upsert({
      where: { projectId_technologyId: { projectId: project.id, technologyId: tech.id } },
      create: { projectId: project.id, technologyId: tech.id },
      update: {},
    });
  }
  projectCount++;
}
report.projects = projectCount;

// skills → technologies taxonomy as well as the skills section block
for (const b of byType.skill ?? []) {
  const slug = slugify(b.title);
  if (!slug) continue;
  await prisma.technology.upsert({ where: { slug }, create: { name: b.title, slug }, update: {} });
}

// build the home page blocks
const homeBlocks = [];
const hero = {
  eyebrow: get('hero', 'eyebrow')?.body ?? '',
  line1: get('hero', 'line1')?.body ?? '',
  line2: get('hero', 'line2')?.body ?? '',
  tagline: get('hero', 'tagline')?.body ?? '',
  accent: get('hero', 'tagline')?.meta?.accent ?? '',
};
if (hero.line1 || hero.line2) homeBlocks.push({ type: 'homeHero', data: hero });

const marqueeItems = (byType.marquee ?? []).filter((b) => b.visible).map((b) => b.title);
if (marqueeItems.length) homeBlocks.push({ type: 'marquee', data: { items: marqueeItems } });

const about = byType.about?.[0];
if (about) homeBlocks.push({ type: 'about', data: { body: about.body ?? '', accent: about.meta?.accent ?? '' } });

const pillars = (byType.pillar ?? []).filter((b) => b.visible).map((b) => ({
  title: b.title, body: b.body ?? '', icon: b.meta?.icon ?? '',
}));
if (pillars.length) homeBlocks.push({ type: 'pillars', data: { items: pillars } });

const skills = (byType.skill ?? []).filter((b) => b.visible).map((b) => b.title);
if (skills.length) homeBlocks.push({ type: 'skills', data: { items: skills } });

const experience = (byType.experience ?? []).filter((b) => b.visible).map((b) => ({
  title: b.title,
  body: b.body ?? '',
  period: b.meta?.period ?? '',
  company: b.meta?.company ?? '',
  location: b.meta?.location ?? '',
  current: !!b.meta?.current,
}));
if (experience.length) homeBlocks.push({ type: 'experience', data: { items: experience } });

if (projectCount) homeBlocks.push({ type: 'projectList', data: { heading: 'Selected work', maxItems: 4 } });

const sideProjects = (byType.sideproject ?? []).filter((b) => b.visible).map((b) => ({
  title: b.title, link: b.meta?.link ?? '',
}));
if (sideProjects.length) homeBlocks.push({ type: 'sideProjects', data: { items: sideProjects } });

const contactRows = byType.contact ?? [];
if (contactRows.length) {
  const cta = contactRows.find((b) => b.title === 'cta');
  homeBlocks.push({
    type: 'contactSection',
    data: {
      heading: contactRows.find((b) => b.title === 'Call me')?.body ?? 'Contact',
      ctaText: cta?.body ?? '',
      ctaAccent: cta?.meta?.accent ?? '',
      items: contactRows
        .filter((b) => !['Call me', 'cta'].includes(b.title))
        .map((b) => ({ label: b.title, value: b.body ?? '', link: b.meta?.link ?? '', visible: !!b.visible })),
    },
  });
}

const home = await prisma.page.upsert({
  where: { slug: 'home' },
  create: {
    title: 'Home',
    slug: 'home',
    status: 'PUBLISHED',
    publishedAt: new Date(),
    template: 'home',
  },
  update: {},
});
await prisma.pageBlock.deleteMany({ where: { pageId: home.id } });
await prisma.pageBlock.createMany({
  data: homeBlocks.map((b, i) => ({ pageId: home.id, type: b.type, data: b.data, sortOrder: i, enabled: true })),
});
report.homeBlocks = homeBlocks.length;

// seed site settings from contact rows (social links, email, location)
const settingSeeds = {};
for (const b of contactRows) {
  const link = b.meta?.link;
  if (!link || !b.visible) continue;
  if (b.title === 'github') settingSeeds['social.github'] = link;
  if (b.title === 'linkedin') settingSeeds['social.linkedin'] = link;
  if (b.title === 'email') settingSeeds['site.email'] = link.replace(/^mailto:/, '');
}
for (const [key, value] of Object.entries(settingSeeds)) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
}
report.settings = Object.keys(settingSeeds);

// ---------- 3. Legacy pages ----------
const legacyPages = await sql`SELECT * FROM legacy_pages`;
for (const p of legacyPages) {
  const slug = slugify(p.slug) || 'page';
  const page = await prisma.page.upsert({
    where: { slug },
    create: {
      title: p.title ?? slug,
      slug,
      status: p.status === 'published' ? 'PUBLISHED' : 'DRAFT',
      publishedAt: p.status === 'published' ? p.created_at : null,
      excerpt: p.excerpt ?? null,
      sortOrder: p.sort_order ?? 0,
      createdAt: p.created_at,
    },
    update: {},
  });
  if (p.content?.trim()) {
    await prisma.pageBlock.deleteMany({ where: { pageId: page.id } });
    await prisma.pageBlock.create({
      data: { pageId: page.id, type: 'richText', data: { html: p.content }, sortOrder: 0, enabled: true },
    });
  }
}
report.pages = legacyPages.length;

// ---------- 4. Legacy posts ----------
const legacyPosts = await sql`SELECT * FROM legacy_posts`;
for (const p of legacyPosts) {
  const slug = slugify(p.slug) || 'post';
  const post = await prisma.post.upsert({
    where: { slug },
    create: {
      title: p.title ?? slug,
      slug,
      status: p.status === 'published' ? 'PUBLISHED' : 'DRAFT',
      publishedAt: p.published_at ?? (p.status === 'published' ? p.created_at : null),
      excerpt: p.excerpt ?? null,
      content: p.content ?? null,
      createdAt: p.created_at,
    },
    update: {},
  });
  for (const name of p.tags ?? []) {
    const tslug = slugify(name);
    if (!tslug) continue;
    const tag = await prisma.tag.upsert({ where: { slug: tslug }, create: { name, slug: tslug }, update: {} });
    await prisma.postTag.upsert({
      where: { postId_tagId: { postId: post.id, tagId: tag.id } },
      create: { postId: post.id, tagId: tag.id },
      update: {},
    });
  }
}
report.posts = legacyPosts.length;

console.log('migration report:', report);
await prisma.$disconnect();
