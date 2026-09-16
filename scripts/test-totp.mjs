import { generateTotpSecret, verifyTotp, otpauthUri } from '../src/lib/auth/crypto.ts';
import { createHmac } from 'node:crypto';

function b32decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, '0');
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function hotp(key, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', key).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}

const secret = generateTotpSecret();
const code = hotp(b32decode(secret), Math.floor(Date.now() / 1000 / 30));
console.log('secret:', secret, '| len:', secret.length);
console.log('code:', code, '| verify:', verifyTotp(secret, code));
console.log('bad code verify:', verifyTotp(secret, '000000') === true || verifyTotp(secret, '999999'));
console.log(otpauthUri(secret, 'alirezakiaee91@gmail.com'));
