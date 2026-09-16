import { sql } from './_lib/db.js';

// Public endpoint: visible content blocks grouped by type.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const rows = await sql`
    SELECT id, type, title, body, meta, sort_order
    FROM content_blocks
    WHERE visible = true
    ORDER BY type, sort_order, created_at`;

  const blocks = {};
  for (const row of rows) {
    (blocks[row.type] ||= []).push(row);
  }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).json({ blocks });
}
