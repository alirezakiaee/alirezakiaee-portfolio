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

const html = await (await fetch(`${BASE}/vorudealireza/media`, { headers: { cookie } })).text();
// find the action group whose fields sit inside the upload form (before name="file")
const fileIdx = html.indexOf('name="file"');
const before = html.slice(0, fileIdx);
const groups = [...before.matchAll(/\$ACTION_(\d+):0/g)].map((m) => m[1]);
const num = groups[groups.length - 1];
console.log('upload form action group:', num);

const all = [...html.matchAll(/name="(\$ACTION[^"]*)"(?:\s+value="([^"]*)")?/g)];
const fd = new FormData();
for (const [, name, rawVal] of all) {
  if (name.startsWith(`$ACTION_REF_${num}`) || name.startsWith(`$ACTION_${num}:`)) {
    fd.append(name, (rawVal ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  }
}
const idx = all.findIndex((m) => m[1] === `$ACTION_${num}:1`);
const keyAfter = all.slice(idx).find((m) => m[1] === '$ACTION_KEY');
if (keyAfter) fd.append('$ACTION_KEY', keyAfter[2] ?? '');

// 1x1 transparent PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
fd.append('file', new File([png], 'pixel.png', { type: 'image/png' }));
fd.append('altText', 'test pixel');

const res = await fetch(`${BASE}/vorudealireza/media`, {
  method: 'POST', headers: { cookie, Origin: BASE }, body: fd, redirect: 'manual',
});
console.log('upload:', res.status, res.headers.get('location') ?? '');

const media = await prisma.media.findFirst({ orderBy: { createdAt: 'desc' } });
console.log('media row:', media?.originalName, media?.mimeType, media?.sizeBytes, media?.storagePath);

// also verify the file landed on disk (local driver)
if (media?.storagePath?.startsWith('/uploads/')) {
  const { existsSync } = await import('node:fs');
  console.log('file on disk:', existsSync(`public${media.storagePath}`));
}
await prisma.$disconnect();
