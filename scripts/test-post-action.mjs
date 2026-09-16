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

const html = await (await fetch(`${BASE}/vorudealireza/posts/new`, { headers: { cookie } })).text();
const all = [...html.matchAll(/name="(\$ACTION[^"]*)"(?:\s+value="([^"]*)")?/g)];
// find the group whose fields live inside the post form (the one right before name="title")
const titleIdx = html.indexOf('name="title"');
const groups = [...html.slice(0, titleIdx).matchAll(/\$ACTION_(\d+):0/g)].map((m) => m[1]);
const num = groups[groups.length - 1];

const fd = new FormData();
for (const [, name, rawVal] of all) {
  if (name.startsWith(`$ACTION_REF_${num}`) || name.startsWith(`$ACTION_${num}:`)) {
    fd.append(name, (rawVal ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  }
}
const idx = all.findIndex((m) => m[1] === `$ACTION_${num}:1`);
const keyAfter = all.slice(idx).find((m) => m[1] === '$ACTION_KEY');
if (keyAfter) fd.append('$ACTION_KEY', keyAfter[2] ?? '');

for (const [k, v] of Object.entries({
  title: 'Hello CMS',
  slug: '',
  excerpt: 'First post on the new engine.',
  content: '<p>Body with a <script>alert(1)</script> injection test.</p>',
  categoryNames: 'Engineering',
  tagNames: 'nextjs, prisma',
  intent: 'publish',
  robotsIndex: 'on',
  robotsFollow: 'on',
})) fd.append(k, v);

const res = await fetch(`${BASE}/vorudealireza/posts/new`, {
  method: 'POST', headers: { cookie, Origin: BASE }, body: fd, redirect: 'manual',
});
console.log('create:', res.status, res.headers.get('location') ?? '');

const post = await prisma.post.findFirst({
  where: { slug: 'hello-cms' },
  include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
});
console.log('post:', post?.slug, post?.status);
console.log('sanitized content:', post?.content);
console.log('cats:', post?.categories.map((c) => c.category.name), '| tags:', post?.tags.map((t) => t.tag.name));
await prisma.$disconnect();
