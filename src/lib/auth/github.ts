import { AppError, ConfigurationError } from '@/lib/errors';

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_STATE_MAX_AGE_SECONDS = 600;

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const GITHUB_TIMEOUT_MS = 10_000;

export class OAuthError extends AppError {
  constructor(message: string, code = 'OAUTH_ERROR') {
    super(message, 400, code);
  }
}

export interface GithubConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface GithubProfile {
  id: number;
  login: string;
  avatar_url: string;
}

/** Reads credentials from the environment; never hard-coded. */
export function getGithubConfig(requestUrl: string): GithubConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ConfigurationError('GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 환경 변수가 설정되지 않았습니다.');
  }
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${new URL(requestUrl).origin}/auth/github/callback`;
  return { clientId, clientSecret, callbackUrl };
}

export function buildAuthorizeUrl(config: GithubConfig, state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.callbackUrl);
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'true');
  return url.toString();
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeCodeForToken(config: GithubConfig, code: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    }),
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new OAuthError(data.error_description ?? data.error ?? 'GitHub 토큰 발급에 실패했습니다.', 'OAUTH_TOKEN_FAILED');
  }
  return data.access_token;
}

function isGithubProfile(value: unknown): value is GithubProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'number' && typeof candidate.login === 'string';
}

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile> {
  const response = await fetch(USER_URL, {
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${accessToken}`,
      'user-agent': 'todo-app',
    },
  });
  const data: unknown = await response.json();
  if (!response.ok || !isGithubProfile(data)) {
    throw new OAuthError('GitHub 사용자 정보를 가져오지 못했습니다.', 'OAUTH_PROFILE_FAILED');
  }
  return { id: data.id, login: data.login, avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : '' };
}
