import { NextResponse, type NextRequest } from 'next/server';

// Must match SESSION_COOKIE in src/lib/auth/session.ts (that module uses Node crypto, which
// the Edge middleware runtime cannot import).
const SESSION_COOKIE = 'todo_session';

/**
 * Fast path: pages without a session cookie go straight to /login.
 * The cookie is validated against the DB in each page (requirePageUser) and API route (requireApiUser).
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/', '/board/:path*', '/plans/:path*', '/goals/:path*'],
};
