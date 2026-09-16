import { z } from 'zod';

// Per-type validation for PageBlock.data. Shared between the admin editor
// (client) and the save action (server) — no 'server-only' here.
export const BLOCK_TYPES = ['hero', 'richText', 'cta', 'gallery', 'spacer'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Hero',
  richText: 'Rich text',
  cta: 'Call to action',
  gallery: 'Gallery',
  spacer: 'Spacer',
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
