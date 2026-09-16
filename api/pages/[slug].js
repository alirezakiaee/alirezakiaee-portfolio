import { sql } from '../_lib/db.js';
import { isValidSlug } from '../_lib/slug.js';

// Public: a single published page by slug.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { slug } = req.query;
  if (!isValidSlug(slug)) return res.status(404).json({ error: 'Not found.' });

  const rows = await sql`
    SELECT slug, title, excerpt, content, meta, updated_at
    FROM pages WHERE slug = ${slug} AND status = 'published' LIMIT 1`;

  if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).json({ page: rows[0] });
}
