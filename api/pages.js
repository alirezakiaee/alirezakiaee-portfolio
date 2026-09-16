import { sql } from './_lib/db.js';

// Public: list published pages (lightweight fields only).
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const rows = await sql`
    SELECT slug, title, excerpt, meta, sort_order
    FROM pages WHERE status = 'published'
    ORDER BY sort_order, title`;

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).json({ pages: rows });
}
