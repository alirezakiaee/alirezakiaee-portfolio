const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Root-level slugs are rewritten to /pages/page.html — these must stay reserved
// so pages can never shadow real routes/assets.
export const RESERVED_SLUGS = new Set([
  'api', 'blog', 'vorudealireza', 'pages', 'assets',
  'index', 'styles', 'main', 'content',
  'favicon', 'robots', 'sitemap', 'vercel',
]);

export function isValidSlug(slug) {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 80 && SLUG_RE.test(slug);
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isPostgresUniqueViolation(e) {
  return e && (e.code === '23505' || /duplicate key/i.test(String(e.message || '')));
}
