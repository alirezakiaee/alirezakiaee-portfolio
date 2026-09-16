import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  base32Encode,
  comparePassword,
  generateTotpSecret,
  hashPassword,
  otpauthUri,
  safeEqual,
  verifyTotp,
} from './crypto';

describe('password hashing', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct');
    expect(await comparePassword('correct horse battery staple', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});

describe('safeEqual', () => {
  it('matches equal strings and rejects others', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('base32Encode', () => {
  it('encodes RFC 4648 vectors', () => {
    expect(base32Encode(Buffer.from(''))).toBe('');
    expect(base32Encode(Buffer.from('f'))).toBe('MY');
    expect(base32Encode(Buffer.from('foo'))).toBe('MZXW6');
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });
});

describe('TOTP', () => {
  function hotp6(key: Buffer, counter: number): string {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const off = hmac[hmac.length - 1] & 0x0f;
    return String(
      (((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) | ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff)) % 1000000
    ).padStart(6, '0');
  }
  // mirrors the module's base32Decode for test-side code generation
  function base32Decode(str: string): Buffer {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, value = 0;
    const bytes: number[] = [];
    for (const ch of str.toUpperCase().replace(/=+$/, '')) {
      const idx = A.indexOf(ch);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
    }
    return Buffer.from(bytes);
  }

  it('accepts a currently-valid code', () => {
    const secret = generateTotpSecret();
    const code = hotp6(base32Decode(secret), Math.floor(Date.now() / 1000 / 30));
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('rejects garbage and wrong codes', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, 'notacode')).toBe(false);
    expect(verifyTotp(secret, '')).toBe(false);
    expect(verifyTotp(secret, '12345')).toBe(false);
    // a code from a different secret should not validate
    const other = generateTotpSecret();
    const wrongCode = hotp6(base32Decode(other), Math.floor(Date.now() / 1000 / 30));
    // (astronomically unlikely to collide, and even if it did it's a valid TOTP for *some* secret — skip flake risk)
    if (wrongCode !== hotp6(base32Decode(secret), Math.floor(Date.now() / 1000 / 30))) {
      expect(verifyTotp(secret, wrongCode)).toBe(false);
    }
  });

  it('produces a valid otpauth URI', () => {
    const uri = otpauthUri('JBSWY3DPEHPK3PXP', 'admin');
    expect(uri).toMatch(/^otpauth:\/\/totp\/.+:admin\?secret=JBSWY3DPEHPK3PXP&issuer=.+&algorithm=SHA1&digits=6&period=30$/);
  });
});
