const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Root-level page slugs are served by app/[slug]/page.tsx — keep these
// reserved so a Page can never shadow a real route.
export const RESERVED_SLUGS = new Set([
  'vorudealireza', 'api', 'blog', 'projects', 'services', 'admin',
  'assets', 'static', 'favicon', 'robots', 'sitemap',
]);

export function isValidSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 80 && SLUG_RE.test(slug);
}

export function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isPostgresUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === 'P2002';
}
