import { sql } from '../../_lib/db.js';
import { getSessionUser, hasCsrfHeader } from '../../_lib/security.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  const userId = await getSessionUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.query;
  if (!UUID_RE.test(String(id))) return res.status(400).json({ error: 'Invalid id.' });

  if (req.method === 'PUT') {
    const { title, body: content, meta, sort_order, visible } = req.body || {};
    if (typeof title !== 'string' || title.length > 200) return res.status(400).json({ error: 'Invalid title.' });
    if (typeof content !== 'string' || content.length > 8000) return res.status(400).json({ error: 'Invalid body.' });
    if (typeof meta !== 'object' || meta === null || Array.isArray(meta) || JSON.stringify(meta).length > 8000)
      return res.status(400).json({ error: 'Invalid meta.' });
    if (!Number.isInteger(sort_order)) return res.status(400).json({ error: 'Invalid sort_order.' });
    if (typeof visible !== 'boolean') return res.status(400).json({ error: 'Invalid visible.' });

    const rows = await sql`
      UPDATE content_blocks
      SET title = ${title}, body = ${content}, meta = ${JSON.stringify(meta)},
          sort_order = ${sort_order}, visible = ${visible}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, type, title, body, meta, sort_order, visible`;
    if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    return res.status(200).json({ block: rows[0] });
  }

  if (req.method === 'DELETE') {
    const rows = await sql`DELETE FROM content_blocks WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
