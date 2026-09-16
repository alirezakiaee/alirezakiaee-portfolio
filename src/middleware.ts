import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Runs on the Edge runtime, so it can only do a lightweight JWT signature/
// expiry check (jose is edge-compatible; Prisma is not). The authoritative
// check — does this user still exist, is TOTP still enrolled, what's their
// role — happens in the admin layout Server Component (Node.js runtime),
// which is the actual security boundary. This middleware only exists to
// bounce obviously-unauthenticated requests before they render anything.
const PUBLIC_ADMIN_PATHS = ['/vorudealireza/login', '/vorudealireza/setup'];
const SESSION_COOKIE = 'ak_admin';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/vorudealireza')) return NextResponse.next();
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
  matcher: '/vorudealireza/:path*',
};
