import { sql } from '../_lib/db.js';
import { getSessionUser, hasCsrfHeader } from '../_lib/security.js';
import { isValidSlug, slugify, RESERVED_SLUGS, isPostgresUniqueViolation } from '../_lib/slug.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const { id } = req.query;

  if (req.method === 'GET' && !id) {
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

  if (req.method === 'PUT' || req.method === 'DELETE') {
    if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });
    if (!UUID_RE.test(String(id))) return res.status(400).json({ error: 'Invalid id.' });

    if (req.method === 'DELETE') {
      const rows = await sql`DELETE FROM posts WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });
      return res.status(200).json({ ok: true });
    }

    const { title, excerpt = '', content = '', status, meta = {}, cover_image = '' } = req.body || {};
    const err = validate({ title, excerpt, content, status, meta, cover_image });
    if (err) return res.status(400).json({ error: err });

    const tags = sanitizeTags(req.body.tags);
    let slug = slugify(req.body.slug || title);
    if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug.' });
    if (RESERVED_SLUGS.has(slug)) return res.status(400).json({ error: `"${slug}" is a reserved slug.` });

    try {
      const existing = await sql`SELECT status, published_at FROM posts WHERE id = ${id}`;
      if (existing.length === 0) return res.status(404).json({ error: 'Not found.' });
      const publishedAt =
        status === 'published' ? existing[0].published_at || new Date() : existing[0].published_at;

      const rows = await sql`
        UPDATE posts SET slug = ${slug}, title = ${title}, excerpt = ${excerpt}, content = ${content},
          cover_image = ${cover_image}, tags = ${tags}, status = ${status},
          published_at = ${publishedAt}, meta = ${JSON.stringify(meta)}, updated_at = now()
        WHERE id = ${id}
        RETURNING id, slug, title, excerpt, cover_image, tags, status, published_at, meta`;
      return res.status(200).json({ post: rows[0] });
    } catch (e) {
      if (isPostgresUniqueViolation(e)) return res.status(409).json({ error: `Slug "${slug}" is already in use.` });
      throw e;
    }
  }

  return res.status(405).end();
}
