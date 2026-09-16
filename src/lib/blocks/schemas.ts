import { z } from 'zod';

// Per-type validation for PageBlock.data. Shared between the admin editor
// (client) and the save action (server) — no 'server-only' here.
export const BLOCK_TYPES = [
  'hero', 'richText', 'cta', 'gallery', 'spacer',
  // Home sections migrated from the legacy content_blocks model.
  'homeHero', 'about', 'marquee', 'pillars', 'skills', 'experience',
  'projectList', 'sideProjects', 'contactSection',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Hero',
  richText: 'Rich text',
  cta: 'Call to action',
  gallery: 'Gallery',
  spacer: 'Spacer',
  homeHero: 'Home hero',
  about: 'About statement',
  marquee: 'Marquee strip',
  pillars: 'Pillars',
  skills: 'Skills list',
  experience: 'Experience timeline',
  projectList: 'Featured projects',
  sideProjects: 'Side projects',
  contactSection: 'Contact section',
};

const url = z.string().trim().max(2048).refine((v) => !v || /^https?:\/\//i.test(v) || v.startsWith('/'), {
  message: 'Must be an http(s) URL or site-relative path',
});

export const BLOCK_SCHEMAS: Record<BlockType, z.ZodTypeAny> = {
  hero: z.object({
    heading: z.string().trim().min(1, 'Hero heading is required').max(200),
    subheading: z.string().trim().max(500).optional(),
    ctaLabel: z.string().trim().max(80).optional(),
    ctaUrl: url.optional(),
    align: z.enum(['left', 'center']).default('left'),
  }),
  richText: z.object({
    html: z.string().trim().min(1, 'Rich text content is required').max(100000),
  }),
  cta: z.object({
    heading: z.string().trim().min(1, 'CTA heading is required').max(200),
    text: z.string().trim().max(1000).optional(),
    buttonLabel: z.string().trim().min(1, 'Button label is required').max(80),
    buttonUrl: url.refine((v) => !!v, 'Button URL is required'),
  }),
  gallery: z.object({
    // Media picker lands in Phase 6; ids stay stable either way.
    mediaIds: z.array(z.string().min(1)).max(50),
    captions: z.array(z.string().max(300)).optional(),
  }),
  spacer: z.object({
    size: z.enum(['sm', 'md', 'lg']).default('md'),
  }),

  // ---- Home sections (structured content migrated from legacy blocks) ----
  homeHero: z.object({
    eyebrow: z.string().trim().max(300).optional(),
    line1: z.string().trim().min(1, 'First name line is required').max(80),
    line2: z.string().trim().min(1, 'Second name line is required').max(80),
    tagline: z.string().trim().max(500).optional(),
    accent: z.string().trim().max(200).optional(),
  }),
  about: z.object({
    body: z.string().trim().min(1, 'About text is required').max(2000),
    accent: z.string().trim().max(200).optional(),
  }),
  marquee: z.object({
    items: z.array(z.string().trim().min(1).max(80)).min(1, 'Add at least one item').max(30),
  }),
  pillars: z.object({
    items: z.array(z.object({
      title: z.string().trim().min(1).max(120),
      body: z.string().trim().max(1000).optional(),
      icon: z.string().trim().max(60).optional(),
    })).min(1).max(12),
  }),
  skills: z.object({
    items: z.array(z.string().trim().min(1).max(80)).min(1, 'Add at least one skill').max(60),
  }),
  experience: z.object({
    items: z.array(z.object({
      title: z.string().trim().min(1).max(160),
      body: z.string().trim().max(2000).optional(),
      period: z.string().trim().max(80).optional(),
      company: z.string().trim().max(120).optional(),
      location: z.string().trim().max(120).optional(),
      current: z.boolean().default(false),
    })).min(1).max(20),
  }),
  projectList: z.object({
    heading: z.string().trim().max(120).optional(),
    maxItems: z.coerce.number().int().min(1).max(12).default(4),
  }),
  sideProjects: z.object({
    items: z.array(z.object({
      title: z.string().trim().min(1).max(120),
      link: url,
    })).min(1).max(20),
  }),
  contactSection: z.object({
    heading: z.string().trim().max(120).optional(),
    ctaText: z.string().trim().max(200).optional(),
    ctaAccent: z.string().trim().max(120).optional(),
    items: z.array(z.object({
      label: z.string().trim().min(1).max(80),
      value: z.string().trim().max(200).optional(),
      link: url.optional(),
      visible: z.boolean().default(true),
    })).max(20).default([]),
  }),
};

export function defaultBlockData(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return { heading: '', subheading: '', ctaLabel: '', ctaUrl: '', align: 'left' };
    case 'richText':
      return { html: '' };
    case 'cta':
      return { heading: '', text: '', buttonLabel: '', buttonUrl: '' };
    case 'gallery':
      return { mediaIds: [], captions: [] };
    case 'spacer':
      return { size: 'md' };
    case 'homeHero':
      return { eyebrow: '', line1: '', line2: '', tagline: '', accent: '' };
    case 'about':
      return { body: '', accent: '' };
    case 'marquee':
      return { items: [] };
    case 'pillars':
      return { items: [] };
    case 'skills':
      return { items: [] };
    case 'experience':
      return { items: [] };
    case 'projectList':
      return { heading: 'Selected work', maxItems: 4 };
    case 'sideProjects':
      return { items: [] };
    case 'contactSection':
      return { heading: '', ctaText: '', ctaAccent: '', items: [] };
  }
}

export function validateBlock(
  type: string,
  data: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const schema = BLOCK_SCHEMAS[type as BlockType];
  if (!schema) return { ok: false, error: `Unknown block type "${type}".` };
  const parsed = schema.safeParse(data ?? {});
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid block.' };
  return { ok: true, data: parsed.data as Record<string, unknown> };
}
