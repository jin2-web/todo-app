import { NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_SECONDS,
  buildAuthorizeUrl,
  getGithubConfig,
} from '@/lib/auth/github';
import { generateToken, sessionCookieOptions } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** Starts the GitHub OAuth flow: stores a random `state` in a cookie and redirects to GitHub. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const config = getGithubConfig(request.url);
    const state = generateToken();
    const response = NextResponse.redirect(buildAuthorizeUrl(config, state));
    response.cookies.set(OAUTH_STATE_COOKIE, state, sessionCookieOptions(OAUTH_STATE_MAX_AGE_SECONDS));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
