import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { neon } from '@neondatabase/serverless';

// Runs on the Edge runtime, so it can only do a lightweight JWT signature/
// expiry check (jose is edge-compatible; Prisma is not). The authoritative
// check — does this user still exist, is TOTP still enrolled, what's their
// role — happens in the admin layout Server Component (Node.js runtime),
// which is the actual security boundary. This middleware only exists to
// bounce obviously-unauthenticated requests before they render anything.
//
// For public paths it also applies the DB-backed Redirect rules. Neon is
// queried over HTTP (fetch-based driver, edge-safe) with a short in-memory
// TTL cache so warm isolates don't hit the DB on every request.
const PUBLIC_ADMIN_PATHS = ['/vorudealireza/login', '/vorudealireza/setup'];
const SESSION_COOKIE = 'ak_admin';
const REDIRECT_TTL_MS = 60_000;

type RedirectRule = { from_path: string; to_path: string; type: 'PERMANENT' | 'TEMPORARY' };
let redirectCache: { rules: Map<string, RedirectRule>; at: number } | null = null;

async function lookupRedirect(pathname: string): Promise<RedirectRule | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const now = Date.now();
  if (!redirectCache || now - redirectCache.at > REDIRECT_TTL_MS) {
    try {
      const sql = neon(url);
      const rows = (await sql`SELECT from_path, to_path, type FROM redirects WHERE enabled = true`) as RedirectRule[];
      redirectCache = { rules: new Map(rows.map((r) => [r.from_path, r])), at: now };
    } catch {
      // Fail open — never take the site down because a redirect lookup failed.
      return null;
    }
  }
  return redirectCache.rules.get(pathname) ?? null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/vorudealireza')) {
    const rule = await lookupRedirect(pathname);
    if (rule) {
      const dest = rule.to_path.startsWith('/') ? new URL(rule.to_path, req.url) : new URL(rule.to_path);
      return NextResponse.redirect(dest, rule.type === 'PERMANENT' ? 301 : 302);
    }
    return NextResponse.next();
  }

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL('/vorudealireza/login', req.url));

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.scope !== 'admin' || !payload.sub) {
      return NextResponse.redirect(new URL('/vorudealireza/login', req.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/vorudealireza/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, public assets, and uploaded files.
  matcher: ['/((?!_next/|uploads/|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|webp|ico|css|js|map|txt|xml|woff2?)).*)'],
};
