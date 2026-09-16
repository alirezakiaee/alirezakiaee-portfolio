import { sql } from '../_lib/db.js';
import { getSessionUser, hasCsrfHeader } from '../_lib/security.js';
import { isValidSlug, slugify, RESERVED_SLUGS, isPostgresUniqueViolation } from '../_lib/slug.js';

function validate({ title, excerpt, content, status, meta }) {
  if (typeof title !== 'string' || !title.trim() || title.length > 200) return 'Invalid title.';
  if (typeof excerpt !== 'string' || excerpt.length > 500) return 'Invalid excerpt.';
  if (typeof content !== 'string' || content.length > 200000) return 'Invalid content.';
  if (status !== 'draft' && status !== 'published') return 'Status must be draft or published.';
  if (meta !== undefined && (typeof meta !== 'object' || meta === null || Array.isArray(meta)))
    return 'Invalid meta (must be a JSON object).';
  return null;
}

export default async function handler(req, res) {
  const userId = await getSessionUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, slug, title, excerpt, status, meta, sort_order, updated_at
      FROM pages ORDER BY sort_order, title`;
    return res.status(200).json({ pages: rows });
  }

  if (req.method === 'POST') {
    if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });
    const err = validate(req.body || {});
    if (err) return res.status(400).json({ error: err });

    const { title, excerpt = '', content = '', status, meta = {}, sort_order = 0 } = req.body;
    let slug = slugify(req.body.slug || title);
    if (!isValidSlug(slug)) return res.status(400).json({ error: 'Could not derive a valid slug. Provide one manually.' });
    if (RESERVED_SLUGS.has(slug)) return res.status(400).json({ error: `"${slug}" is a reserved slug.` });

    try {
      const rows = await sql`
        INSERT INTO pages (slug, title, excerpt, content, status, meta, sort_order)
        VALUES (${slug}, ${title}, ${excerpt}, ${content}, ${status}, ${JSON.stringify(meta)}, ${sort_order})
        RETURNING id, slug, title, excerpt, status, meta, sort_order`;
      return res.status(201).json({ page: rows[0] });
    } catch (e) {
      if (isPostgresUniqueViolation(e)) return res.status(409).json({ error: `Slug "${slug}" is already in use.` });
      throw e;
    }
  }

  return res.status(405).end();
}
