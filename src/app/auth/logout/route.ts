import { NextResponse } from 'next/server';
import { SESSION_COOKIE, deleteSession, readCookie, sessionCookieOptions } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** Deletes the session document and expires the cookie, then goes to /login. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await deleteSession(readCookie(request, SESSION_COOKIE));
    // 303 so the browser follows the redirect with GET.
    const response = NextResponse.redirect(new URL('/login', request.url), 303);
    response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
