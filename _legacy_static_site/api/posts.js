import { sql } from './_lib/db.js';
import { isValidSlug } from './_lib/slug.js';

// Public: a single published post via ?slug=, otherwise a paginated list
// (newest first, optional ?tag= filter).
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');

  const { slug } = req.query;
  if (slug) {
    if (!isValidSlug(slug)) return res.status(404).json({ error: 'Not found.' });
    const rows = await sql`
      SELECT slug, title, excerpt, content, cover_image, tags, published_at, meta
      FROM posts WHERE slug = ${slug} AND status = 'published' LIMIT 1`;
    if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    return res.status(200).json({ post: rows[0] });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 9));
  const offset = (page - 1) * limit;
  const tag = typeof req.query.tag === 'string' && req.query.tag.trim() ? req.query.tag.trim() : null;

  const rows = tag
    ? await sql`
        SELECT slug, title, excerpt, cover_image, tags, published_at
        FROM posts WHERE status = 'published' AND ${tag} = ANY(tags)
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT ${limit} OFFSET ${offset}`
    : await sql`
        SELECT slug, title, excerpt, cover_image, tags, published_at
        FROM posts WHERE status = 'published'
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT ${limit} OFFSET ${offset}`;

  const countRows = tag
    ? await sql`SELECT count(*)::int AS n FROM posts WHERE status = 'published' AND ${tag} = ANY(tags)`
    : await sql`SELECT count(*)::int AS n FROM posts WHERE status = 'published'`;

  return res.status(200).json({
    posts: rows,
    page,
    limit,
    total: countRows[0].n,
    hasMore: offset + rows.length < countRows[0].n,
  });
}
