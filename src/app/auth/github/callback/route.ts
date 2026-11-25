import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  OAuthError,
  exchangeCodeForToken,
  fetchGithubProfile,
  getGithubConfig,
} from '@/lib/auth/github';
import { SESSION_COOKIE, createSession, readCookie, sessionCookieOptions } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { upsertGithubUser } from '@/services/userService';

export const dynamic = 'force-dynamic';

function sameValue(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function redirectToLogin(request: Request, errorCode: string): NextResponse {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', errorCode);
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE, '', sessionCookieOptions(0));
  return response;
}

/** GitHub redirects here with `code` and `state`; on success a session cookie is issued. */
export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const expectedState = readCookie(request, OAUTH_STATE_COOKIE);

  if (params.get('error')) {
    return redirectToLogin(request, 'access_denied');
  }
  if (!code || !state || !expectedState || !sameValue(state, expectedState)) {
    return redirectToLogin(request, 'invalid_state');
  }

  try {
    const config = getGithubConfig(request.url);
    const accessToken = await exchangeCodeForToken(config, code);
    const profile = await fetchGithubProfile(accessToken);
    const user = await upsertGithubUser(profile);
    const token = await createSession(user._id.toString());

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    response.cookies.set(OAUTH_STATE_COOKIE, '', sessionCookieOptions(0));
    logger.info('User logged in', { userId: user._id.toString(), username: user.username });
    return response;
  } catch (error) {
    logger.error('GitHub OAuth callback failed', { error });
    const errorCode = error instanceof OAuthError || error instanceof AppError ? error.code.toLowerCase() : 'oauth_failed';
    return redirectToLogin(request, errorCode);
  }
}
