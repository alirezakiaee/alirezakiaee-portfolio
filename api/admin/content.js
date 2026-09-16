import { sql } from '../_lib/db.js';
import { getSessionUser, hasCsrfHeader } from '../_lib/security.js';

const TYPE_RE = /^[a-z_]{2,32}$/;

function validate(body) {
  const { type, title, body: content, meta, sort_order, visible } = body || {};
  if (!TYPE_RE.test(String(type || ''))) return 'Invalid type (lowercase a-z/_, 2-32 chars).';
  if (typeof title !== 'string' || title.length > 200) return 'Invalid title.';
  if (typeof content !== 'string' || content.length > 8000) return 'Invalid body.';
  if (meta !== undefined && (typeof meta !== 'object' || meta === null || Array.isArray(meta)))
    return 'Invalid meta (must be a JSON object).';
  if (meta !== undefined && JSON.stringify(meta).length > 8000) return 'Meta too large.';
  if (sort_order !== undefined && !Number.isInteger(sort_order)) return 'Invalid sort_order.';
  if (visible !== undefined && typeof visible !== 'boolean') return 'Invalid visible.';
  return null;
}

export default async function handler(req, res) {
  const userId = await getSessionUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, type, title, body, meta, sort_order, visible, updated_at
      FROM content_blocks ORDER BY type, sort_order, created_at`;
    return res.status(200).json({ blocks: rows });
  }

  if (req.method === 'POST') {
    if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });
    const err = validate(req.body);
    if (err) return res.status(400).json({ error: err });

    const { type, title, body: content, meta = {}, sort_order = 0, visible = true } = req.body;
    const rows = await sql`
      INSERT INTO content_blocks (type, title, body, meta, sort_order, visible)
      VALUES (${type}, ${title}, ${content}, ${JSON.stringify(meta)}, ${sort_order}, ${visible})
      RETURNING id, type, title, body, meta, sort_order, visible`;
    return res.status(201).json({ block: rows[0] });
  }

  return res.status(405).end();
}
