import { sql } from '../_lib/db.js';
import { getSessionUser, hasCsrfHeader } from '../_lib/security.js';
import { isValidSlug, slugify, RESERVED_SLUGS, isPostgresUniqueViolation } from '../_lib/slug.js';

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter((t) => t && t.length <= 40))].slice(0, 20);
}

function validate({ title, excerpt, content, status, meta, cover_image }) {
  if (typeof title !== 'string' || !title.trim() || title.length > 200) return 'Invalid title.';
  if (typeof excerpt !== 'string' || excerpt.length > 500) return 'Invalid excerpt.';
  if (typeof content !== 'string' || content.length > 200000) return 'Invalid content.';
  if (status !== 'draft' && status !== 'published') return 'Status must be draft or published.';
  if (meta !== undefined && (typeof meta !== 'object' || meta === null || Array.isArray(meta)))
    return 'Invalid meta (must be a JSON object).';
  if (cover_image !== undefined && (typeof cover_image !== 'string' || cover_image.length > 2000))
    return 'Invalid cover image URL.';
  return null;
}

export default async function handler(req, res) {
  const userId = await getSessionUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, slug, title, excerpt, cover_image, tags, status, published_at, meta, updated_at
      FROM posts ORDER BY COALESCE(published_at, created_at) DESC`;
    return res.status(200).json({ posts: rows });
  }

  if (req.method === 'POST') {
    if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });
    const err = validate(req.body || {});
    if (err) return res.status(400).json({ error: err });

    const { title, excerpt = '', content = '', status, meta = {}, cover_image = '' } = req.body;
    const tags = sanitizeTags(req.body.tags);
    let slug = slugify(req.body.slug || title);
    if (!isValidSlug(slug)) return res.status(400).json({ error: 'Could not derive a valid slug. Provide one manually.' });
    if (RESERVED_SLUGS.has(slug)) return res.status(400).json({ error: `"${slug}" is a reserved slug.` });
    const publishedAt = status === 'published' ? new Date() : null;

    try {
      const rows = await sql`
        INSERT INTO posts (slug, title, excerpt, content, cover_image, tags, status, published_at, meta)
        VALUES (${slug}, ${title}, ${excerpt}, ${content}, ${cover_image}, ${tags}, ${status}, ${publishedAt}, ${JSON.stringify(meta)})
        RETURNING id, slug, title, excerpt, cover_image, tags, status, published_at, meta`;
      return res.status(201).json({ post: rows[0] });
    } catch (e) {
      if (isPostgresUniqueViolation(e)) return res.status(409).json({ error: `Slug "${slug}" is already in use.` });
      throw e;
    }
  }

  return res.status(405).end();
}
