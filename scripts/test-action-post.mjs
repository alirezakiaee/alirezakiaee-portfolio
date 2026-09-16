import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { signSession } = await import('../src/lib/auth/session.ts');
const { prisma } = await import('../src/lib/db.ts');

const user = await prisma.user.findUnique({ where: { username: 'testadmin' } });
const token = await signSession(user.id);
await prisma.$disconnect();

const BASE = 'http://localhost:3010';
const cookie = `ak_admin=${token}`;

// fetch the form page and extract hidden $ACTION fields verbatim
const html = await (await fetch(`${BASE}/vorudealireza/projects/new`, { headers: { cookie } })).text();
const fields = [...html.matchAll(/name="(\$ACTION[^"]*)"(?:\s+value="([^"]*)")?/g)];
console.log('action fields:', fields.map((f) => f[1]).join(', '));

const fd = new FormData();
let actionId = '';
for (const [, name, rawVal] of fields) {
  const val = (rawVal ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const m = val.match(/"id":"([0-9a-f]{32,})"/);
  if (m) actionId = m[1];
  fd.append(name, val);
}
console.log('actionId:', actionId);

for (const [k, v] of Object.entries({
  title: 'Test Integration Platform',
  shortDescription: 'Shopify Plus to D365 smoke test.',
  technologyNames: 'TypeScript, Node.js, PostgreSQL',
  metricsJson: '[{"label":"Daily orders","value":"1,500+"}]',
  featured: 'on',
  robotsIndex: 'on',
  robotsFollow: 'on',
  intent: 'publish',
})) fd.append(k, v);

const res = await fetch(`${BASE}/vorudealireza/projects/new`, {
  method: 'POST',
  headers: { cookie, Origin: BASE },
  body: fd,
  redirect: 'manual',
});
const text = await res.text();
console.log('status:', res.status);
console.log(text.slice(0, 800));
