import { sql } from '../_lib/db.js';
import { getSessionUser } from '../_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const rows = await sql`
    SELECT count(*)::int AS n, bool_or(totp_enabled) AS enrolled FROM admin_users`;
  const exists = rows[0].n > 0;
  const enrolled = exists && !!rows[0].enrolled;
  const user = await getSessionUser(req);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    initialized: enrolled,
    pendingEnrollment: exists && !enrolled,
    authenticated: !!user,
  });
}
