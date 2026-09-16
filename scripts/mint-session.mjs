import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { signSession } = await import('../src/lib/auth/session.ts');
const { prisma } = await import('../src/lib/db.ts');
const { hashPassword } = await import('../src/lib/auth/crypto.ts');

let user = await prisma.user.findUnique({ where: { username: 'testadmin' } });
if (!user) {
  user = await prisma.user.create({
    data: {
      username: 'testadmin',
      passwordHash: await hashPassword('x'.repeat(12)),
      totpSecret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      totpEnabled: true,
      role: 'ADMIN',
    },
  });
}
console.log(await signSession(user.id));
await prisma.$disconnect();
