import { describe, expect, it } from 'vitest';
import { isPostgresUniqueViolation, isValidSlug, RESERVED_SLUGS, slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('  AX 2012 → D365 F&O Migration  ')).toBe('ax-2012-d365-f-o-migration');
  });
  it('strips non-alphanumerics and edge dashes', () => {
    expect(slugify('---weird___title!!!---')).toBe('weird-title');
    expect(slugify('C++ / .NET')).toBe('c-net');
  });
  it('caps at 80 chars', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('!!!')).toBe('');
  });
});

describe('isValidSlug', () => {
  it('accepts clean slugs', () => {
    expect(isValidSlug('my-work')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('post-2026')).toBe(true);
  });
  it('rejects malformed slugs', () => {
    for (const s of ['', 'Hello', '-lead', 'trail-', 'a--b', 'a b', 'a_b', 'a/b', '../x', 'a'.repeat(81)]) {
      expect(isValidSlug(s)).toBe(false);
    }
  });
});

describe('RESERVED_SLUGS', () => {
  it('protects admin and system routes', () => {
    for (const s of ['vorudealireza', 'api', 'blog', 'projects', 'admin', 'sitemap']) {
      expect(RESERVED_SLUGS.has(s)).toBe(true);
    }
  });
});

describe('isPostgresUniqueViolation', () => {
  it('detects P2002', () => {
    expect(isPostgresUniqueViolation({ code: 'P2002' })).toBe(true);
    expect(isPostgresUniqueViolation({ code: 'P2025' })).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
    expect(isPostgresUniqueViolation('P2002')).toBe(false);
  });
});
