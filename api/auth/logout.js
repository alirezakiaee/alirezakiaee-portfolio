import { clearSessionCookie, hasCsrfHeader } from '../_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!hasCsrfHeader(req)) return res.status(403).json({ error: 'Forbidden' });
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
