import { sql } from './_lib/db.js';
import { isValidSlug } from './_lib/slug.js';

// Public: list published pages, or a single one via ?slug=.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { slug } = req.query;
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');

  if (slug) {
    if (!isValidSlug(slug)) return res.status(404).json({ error: 'Not found.' });
    const rows = await sql`
      SELECT slug, title, excerpt, content, meta, updated_at
      FROM pages WHERE slug = ${slug} AND status = 'published' LIMIT 1`;
    if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    return res.status(200).json({ page: rows[0] });
  }

  const rows = await sql`
    SELECT slug, title, excerpt, meta, sort_order
    FROM pages WHERE status = 'published'
    ORDER BY sort_order, title`;
  return res.status(200).json({ pages: rows });
}
