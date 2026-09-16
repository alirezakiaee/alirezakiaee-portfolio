import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

// Load .env.local into process.env (tsx doesn't auto-load it)
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { setupAdmin, confirmTotpEnrollment, login, verifyLoginTotp, getAuthStatus } =
  await import('../src/lib/auth/actions.ts');
const { verifyTotp } = await import('../src/lib/auth/crypto.ts');
const { prisma } = await import('../src/lib/db.ts');

function b32decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, '0');
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
const currentCode = (secret) => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
};
const check = (name, cond) => console.log(cond ? `PASS ${name}` : `FAIL ${name}`);

// 0. status before
const status0 = await getAuthStatus().catch((e) => ({ err: String(e) }));
console.log('status:', JSON.stringify(status0));

// 1. wrong setup key rejected
const bad = await setupAdmin({ setupKey: 'wrong', username: 'testadmin', password: 'x'.repeat(12) });
check('wrong setup key rejected', bad.ok === false);

// 2. real setup
const setup = await setupAdmin({
  setupKey: process.env.ADMIN_SETUP_KEY,
  username: 'testadmin',
  password: 'Test!Passw0rd-99',
});
check('setup returns secret+pending', setup.ok === true && !!setup.data?.secret);
if (!setup.ok) { console.log('setup error:', setup.error); process.exit(1); }

// 3. confirm enrollment (cookie set will throw outside request ctx — expected, catch it)
const code = currentCode(setup.data.secret);
try {
  const r = await confirmTotpEnrollment({ pendingToken: setup.data.pendingToken, code });
  check('enroll confirm ok', r.ok === true);
} catch (e) {
  console.log('enroll confirm threw (expected cookie ctx):', String(e).slice(0, 80));
}
const user = await prisma.user.findUnique({ where: { username: 'testadmin' } });
check('totpEnabled=true after confirm', user?.totpEnabled === true);

// 4. login wrong password
const badLogin = await login({ username: 'testadmin', password: 'nope-nope-nope' });
check('wrong password rejected', badLogin.ok === false);

// 5. login correct
const goodLogin = await login({ username: 'testadmin', password: 'Test!Passw0rd-99' });
check('login returns pendingToken', goodLogin.ok === true && !!goodLogin.data?.pendingToken);

// 6. verify TOTP bad code
if (goodLogin.ok) {
  const bad2 = await verifyLoginTotp({ pendingToken: goodLogin.data.pendingToken, code: '000000' })
    .catch((e) => ({ ok: false, error: String(e) }));
  check('bad totp rejected', bad2.ok === false || bad2.error?.includes('cookie'));
}

// 7. verify TOTP good code
if (goodLogin.ok) {
  const code2 = currentCode(setup.data.secret);
  try {
    const r = await verifyLoginTotp({ pendingToken: goodLogin.data.pendingToken, code: code2 });
    check('login totp ok', r.ok === true);
  } catch (e) {
    check('login totp ok (cookie ctx throw after verify)', String(e).includes('`cookies`') || String(e).includes('outside'));
  }
}

const status1 = await getAuthStatus().catch(() => null);
console.log('status after:', JSON.stringify(status1));

// cleanup: remove test admin + attempts so the dev DB is clean for real setup
await prisma.authAttempt.deleteMany({});
await prisma.user.deleteMany({ where: { username: 'testadmin' } });
console.log('cleanup done — users:', await prisma.user.count());
await prisma.$disconnect();
