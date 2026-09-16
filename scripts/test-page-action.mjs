import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { signSession } = await import('../src/lib/auth/session.ts');
const { prisma } = await import('../src/lib/db.ts');

let user = await prisma.user.findUnique({ where: { username: 'testadmin' } });
if (!user) {
  const { hashPassword } = await import('../src/lib/auth/crypto.ts');
  user = await prisma.user.create({
    data: { username: 'testadmin', passwordHash: await hashPassword('x'.repeat(12)), totpSecret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', totpEnabled: true, role: 'ADMIN' },
  });
}
const token = await signSession(user.id);
const BASE = 'http://localhost:3010';
const cookie = `ak_admin=${token}`;

// actionNum picks which useActionState form's hidden fields to replay
async function postForm(url, extraFields, actionNum = 1) {
  const html = await (await fetch(url, { headers: { cookie } })).text();
  const all = [...html.matchAll(/name="(\$ACTION[^"]*)"(?:\s+value="([^"]*)")?/g)];
  const fd = new FormData();
  for (const [, name, rawVal] of all) {
    const isGroup = name.startsWith(`$ACTION_REF_${actionNum}`) || name.startsWith(`$ACTION_${actionNum}:`);
    if (isGroup) fd.append(name, (rawVal ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  }
  // pair the $ACTION_KEY that follows this group's last field
  const idx = all.findIndex((m) => m[1] === `$ACTION_${actionNum}:1`);
  const keyAfter = all.slice(idx).find((m) => m[1] === '$ACTION_KEY');
  if (keyAfter) fd.append('$ACTION_KEY', keyAfter[2] ?? '');
  for (const [k, v] of Object.entries(extraFields)) fd.append(k, v);
  return fetch(url, { method: 'POST', headers: { cookie, Origin: BASE }, body: fd, redirect: 'manual' });
}

const blocks = JSON.stringify([
  { type: 'hero', enabled: true, data: { heading: 'About Alireza', subheading: 'Senior Software Engineer', ctaLabel: 'Contact', ctaUrl: '/contact', align: 'left' } },
  { type: 'richText', enabled: true, data: { html: '<p>6+ years building full-stack apps and ERP integrations.</p>' } },
  { type: 'spacer', enabled: true, data: { size: 'md' } },
]);

// 1. create + publish (skip if page already exists from a previous run)
let page = await prisma.page.findFirst({ where: { slug: 'about' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } });
if (!page) {
  const res = await postForm(`${BASE}/vorudealireza/pages/new`, {
    title: 'About', slug: '', blocksJson: blocks, intent: 'publish', robotsIndex: 'on', robotsFollow: 'on',
  });
  console.log('create:', res.status, res.headers.get('location') ?? '');
  page = await prisma.page.findFirst({ where: { slug: 'about' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } });
}
console.log('page:', page?.slug, page?.status, '| blocks:', page?.blocks.map((b) => b.type).join(','));
await prisma.page.update({ where: { id: page.id }, data: { deletedAt: null } });

// 2. update via the save form (action group 3 on the edit page)
const res = await postForm(`${BASE}/vorudealireza/pages/${page.id}`, {
  id: page.id, title: 'About Me', slug: 'about', blocksJson: blocks, intent: 'save', robotsIndex: 'on', robotsFollow: 'on',
}, 3);
console.log('update:', res.status, res.headers.get('location') ?? '');
const after = await prisma.page.findUnique({ where: { id: page.id } });
console.log('after update:', after.title, '| deletedAt:', after.deletedAt);
const revs = await prisma.pageRevision.count({ where: { pageId: page.id } });
console.log('revisions:', revs);

// 3. reserved slug rejected — should NOT redirect (returns error state instead)
const res2 = await postForm(`${BASE}/vorudealireza/pages/new`, {
  title: 'X', slug: 'vorudealireza', blocksJson: '[]', intent: 'save',
});
console.log('reserved slug post:', res2.status, res2.headers.get('location') ?? '(no redirect — expected)');

await prisma.$disconnect();
