import { describe, expect, it } from 'vitest';
import { BLOCK_TYPES, defaultBlockData, validateBlock } from './schemas';

describe('validateBlock', () => {
  it('rejects unknown types', () => {
    const r = validateBlock('nosuchtype', {});
    expect(r.ok).toBe(false);
  });

  it('accepts a valid hero', () => {
    const r = validateBlock('hero', { heading: 'Hi', ctaUrl: '/x' });
    expect(r.ok).toBe(true);
  });

  it('rejects a hero without heading', () => {
    expect(validateBlock('hero', {}).ok).toBe(false);
  });

  it('rejects bad block URLs', () => {
    expect(validateBlock('hero', { heading: 'x', ctaUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(validateBlock('cta', { heading: 'x', buttonLabel: 'go', buttonUrl: 'javascript:alert(1)' }).ok).toBe(false);
  });

  it('accepts home section shapes', () => {
    expect(validateBlock('homeHero', { line1: 'A', line2: 'K' }).ok).toBe(true);
    expect(validateBlock('homeHero', { line1: 'A' }).ok).toBe(false); // line2 required
    expect(validateBlock('marquee', { items: ['a', 'b'] }).ok).toBe(true);
    expect(validateBlock('marquee', { items: [] }).ok).toBe(false);
    expect(validateBlock('skills', { items: ['TypeScript'] }).ok).toBe(true);
    expect(
      validateBlock('experience', {
        items: [{ title: 'Engineer', period: '2025 —', current: true }],
      }).ok
    ).toBe(true);
    expect(
      validateBlock('contactSection', {
        heading: 'Contact',
        items: [{ label: 'github', link: 'https://github.com/x' }],
      }).ok
    ).toBe(true);
    expect(
      validateBlock('sideProjects', { items: [{ title: 'x', link: 'javascript:alert(1)' }] }).ok
    ).toBe(false);
  });

  it('every registered type has a default-data factory returning an object', () => {
    for (const t of BLOCK_TYPES) {
      const d = defaultBlockData(t);
      expect(typeof d).toBe('object');
      expect(d).not.toBeNull();
    }
  });

  it('types with no required fields validate their defaults', () => {
    for (const t of ['spacer', 'gallery', 'projectList', 'contactSection'] as const) {
      expect(validateBlock(t, defaultBlockData(t)).ok).toBe(true);
    }
  });
});
