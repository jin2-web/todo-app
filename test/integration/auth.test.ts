import { NextRequest } from 'next/server';
import { GET as startLogin } from '@/app/auth/github/route';
import { GET as callback } from '@/app/auth/github/callback/route';
import { POST as logout } from '@/app/auth/logout/route';
import { SESSION_COOKIE, hashToken } from '@/lib/auth/session';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { middleware } from '@/middleware';
import { assignUnownedTodos } from '@/migrations/assignTodoOwner';
import { SessionModel } from '@/models/Session';
import { TodoModel } from '@/models/Todo';
import { UserModel } from '@/models/User';
import type { TodoDto } from '@/types/domain';
import { api, setSessionToken } from '../helpers/api';
import { loginAs } from '../helpers/auth';
import { clearTestDatabase, startTestDatabase, stopTestDatabase } from '../helpers/db';

const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = 'test-secret-from-env';
const CALLBACK = 'http://localhost/auth/github/callback';

beforeAll(async () => {
  await startTestDatabase();
  process.env.GITHUB_CLIENT_ID = CLIENT_ID;
  process.env.GITHUB_CLIENT_SECRET = CLIENT_SECRET;
  process.env.GITHUB_CALLBACK_URL = CALLBACK;
});
afterAll(stopTestDatabase);
afterEach(async () => {
  jest.restoreAllMocks();
  setSessionToken(null);
  await clearTestDatabase();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

interface GithubMock {
  profile?: { id: number; login: string; avatar_url: string };
  tokenError?: boolean;
}

function mockGithub({ profile, tokenError = false }: GithubMock): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === 'https://github.com/login/oauth/access_token') {
      return tokenError
        ? jsonResponse({ error: 'bad_verification_code', error_description: 'The code passed is incorrect' })
        : jsonResponse({ access_token: 'gho_test', token_type: 'bearer' });
    }
    if (url === 'https://api.github.com/user') {
      return jsonResponse(profile);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

function callbackRequest(query: string, stateCookie?: string): Request {
  return new Request(`http://localhost/auth/github/callback?${query}`, {
    headers: stateCookie ? { cookie: `oauth_state=${stateCookie}` } : {},
  });
}

/** Runs the full redirect → callback flow and returns the issued session token. */
async function loginThroughGithub(profile: { id: number; login: string; avatar_url: string }): Promise<string> {
  const start = await startLogin(new Request('http://localhost/auth/github'));
  const state = start.cookies.get('oauth_state')?.value ?? '';
  mockGithub({ profile });
  const response = await callback(callbackRequest(`code=abc&state=${state}`, state));
  jest.restoreAllMocks();
  const token = response.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    throw new Error('no session cookie issued');
  }
  return token;
}

describe('GET /auth/github', () => {
  it('redirects to GitHub with client_id, callback URL, scope and a state stored in a cookie', async () => {
    const response = await startLogin(new Request('http://localhost/auth/github'));
    expect(response.status).toBe(307);

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(location.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(location.searchParams.get('redirect_uri')).toBe(CALLBACK);
    expect(location.searchParams.get('scope')).toBe('read:user');

    const state = response.cookies.get('oauth_state');
    expect(state?.value).toBe(location.searchParams.get('state'));
    expect(state?.httpOnly).toBe(true);
    // The secret never leaves the server.
    expect(response.headers.get('location')).not.toContain(CLIENT_SECRET);
  });

  it('returns 500 CONFIGURATION_ERROR when credentials are missing from the environment', async () => {
    const saved = process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_SECRET;
    try {
      const response = await startLogin(new Request('http://localhost/auth/github'));
      expect(response.status).toBe(500);
      expect((await response.json()).error.code).toBe('CONFIGURATION_ERROR');
    } finally {
      process.env.GITHUB_CLIENT_SECRET = saved;
    }
  });
});

describe('GET /auth/github/callback', () => {
  it('stores username and avatar_url, issues a session cookie and redirects home', async () => {
    const fetchSpy = mockGithub({ profile: { id: 42, login: 'octocat', avatar_url: 'https://avatars/octocat.png' } });
    const response = await callback(callbackRequest('code=abc&state=s1', 's1'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
    const sessionCookie = response.cookies.get(SESSION_COOKIE);
    expect(sessionCookie?.value).toBeTruthy();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('lax');

    const users = await UserModel.find().lean();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ githubId: 42, username: 'octocat', avatarUrl: 'https://avatars/octocat.png' });

    // The token exchange used the secret from the environment.
    const tokenCall = fetchSpy.mock.calls.find((call) => String(call[0]).includes('access_token'));
    expect(JSON.parse(String(tokenCall?.[1]?.body))).toMatchObject({ client_secret: CLIENT_SECRET, code: 'abc' });

    // The cookie works against the API.
    setSessionToken(sessionCookie?.value ?? null);
    expect((await api('GET', 'todos')).status).toBe(200);
  });

  it('updates username / avatar on a later login without creating a second user', async () => {
    await loginThroughGithub({ id: 7, login: 'old-name', avatar_url: 'https://a/1.png' });
    await loginThroughGithub({ id: 7, login: 'new-name', avatar_url: 'https://a/2.png' });
    const users = await UserModel.find().lean();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ username: 'new-name', avatarUrl: 'https://a/2.png' });
  });

  it('rejects a state mismatch without calling GitHub', async () => {
    const fetchSpy = mockGithub({ profile: { id: 1, login: 'x', avatar_url: '' } });
    const response = await callback(callbackRequest('code=abc&state=attacker', 'expected'));
    expect(response.headers.get('location')).toBe('http://localhost/login?error=invalid_state');
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('rejects a callback with no state cookie', async () => {
    const response = await callback(callbackRequest('code=abc&state=s1'));
    expect(response.headers.get('location')).toBe('http://localhost/login?error=invalid_state');
  });

  it('handles the user cancelling on GitHub', async () => {
    const response = await callback(callbackRequest('error=access_denied&state=s1', 's1'));
    expect(response.headers.get('location')).toBe('http://localhost/login?error=access_denied');
  });

  it('handles a failed code exchange', async () => {
    mockGithub({ tokenError: true });
    const response = await callback(callbackRequest('code=bad&state=s1', 's1'));
    expect(response.headers.get('location')).toBe('http://localhost/login?error=oauth_token_failed');
    expect(await SessionModel.countDocuments()).toBe(0);
  });
});

describe('unauthenticated access', () => {
  it.each([
    ['GET', 'todos'],
    ['POST', 'todos'],
    ['GET', 'todos/0123456789abcdef01234567'],
    ['PATCH', 'todos/0123456789abcdef01234567'],
    ['DELETE', 'todos/0123456789abcdef01234567'],
    ['GET', 'weekly-plans'],
    ['GET', 'goals'],
    ['GET', 'dashboard'],
  ] as const)('%s /api/%s returns 401 without a session', async (method, path) => {
    const res = await api<{ error: { code: string } }>(method, path, method === 'GET' || method === 'DELETE' ? undefined : { title: 'x' }, {
      token: null,
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for an unknown session token', async () => {
    expect((await api('GET', 'todos', undefined, { token: 'forged-token' })).status).toBe(401);
  });

  it('returns 401 (not 500) for a malformed cookie encoding', async () => {
    expect((await api('GET', 'todos', undefined, { token: '%zz' })).status).toBe(401);
    const response = await callback(callbackRequest('code=abc&state=s1', '%zz'));
    expect(response.headers.get('location')).toBe('http://localhost/login?error=invalid_state');
  });

  it('middleware redirects pages to /login without a session cookie and lets them through with one', () => {
    const anonymous = middleware(new NextRequest('http://localhost/board'));
    expect(anonymous.headers.get('location')).toBe('http://localhost/login');

    const withCookie = middleware(new NextRequest('http://localhost/board', { headers: { cookie: `${SESSION_COOKIE}=t` } }));
    expect(withCookie.headers.get('location')).toBeNull();
  });
});

describe('todo ownership', () => {
  it('lets a user see and change only their own todos', async () => {
    const alice = await loginAs('alice');
    const aliceTodo = (await api<TodoDto>('POST', 'todos', { title: '앨리스 할 일' })).body;

    const bob = await loginAs('bob');
    const bobTodo = (await api<TodoDto>('POST', 'todos', { title: '밥 할 일' })).body;

    const bobList = await api<TodoDto[]>('GET', 'todos');
    expect(bobList.body.map((todo) => todo.title)).toEqual(['밥 할 일']);

    expect((await api('GET', `todos/${aliceTodo.id}`)).status).toBe(404);
    expect((await api('PATCH', `todos/${aliceTodo.id}`, { status: 'done' })).status).toBe(404);
    expect((await api('DELETE', `todos/${aliceTodo.id}`)).status).toBe(404);
    expect((await api('PATCH', `todos/${bobTodo.id}`, { status: 'done' })).status).toBe(200);

    setSessionToken(alice.token);
    const aliceView = await api<TodoDto>('GET', `todos/${aliceTodo.id}`);
    expect(aliceView.status).toBe(200);
    expect(aliceView.body.status).toBe('todo');
    expect((await api<TodoDto[]>('GET', 'todos')).body.map((todo) => todo.title)).toEqual(['앨리스 할 일']);

    const stored = await TodoModel.findById(bobTodo.id).lean();
    expect(stored?.userId?.toString()).toBe(bob.userId);
  });
});

describe('POST /auth/logout', () => {
  it('deletes the session document, expires the cookie and invalidates the token', async () => {
    const token = await loginThroughGithub({ id: 99, login: 'leaver', avatar_url: '' });
    expect(await SessionModel.countDocuments({ tokenHash: hashToken(token) })).toBe(1);

    const response = await logout(
      new Request('http://localhost/auth/logout', { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost/login');
    expect(response.headers.get('set-cookie')).toMatch(new RegExp(`${SESSION_COOKIE}=;.*Max-Age=0`));

    expect(await SessionModel.countDocuments({ tokenHash: hashToken(token) })).toBe(0);
    expect((await api('GET', 'todos', undefined, { token })).status).toBe(401);
  });
});

describe('migration: assign existing todos to an owner', () => {
  it('adds userId to legacy todos only, supports dry run and is idempotent', async () => {
    // Legacy documents written before the userId field existed.
    await TodoModel.collection.insertMany([
      { title: 'legacy 1', description: '', status: 'todo', createdAt: new Date(), updatedAt: new Date() },
      { title: 'legacy 2', description: '', status: 'done', createdAt: new Date(), updatedAt: new Date() },
    ]);
    const other = await loginAs('someone-else');
    await api('POST', 'todos', { title: 'already owned' });
    const owner = await loginAs('owner');

    await expect(assignUnownedTodos('nobody', { dryRun: true })).rejects.toBeInstanceOf(NotFoundError);

    const dry = await assignUnownedTodos('owner', { dryRun: true });
    expect(dry).toMatchObject({ unownedBefore: 2, assigned: 0, dryRun: true });
    expect((await api<TodoDto[]>('GET', 'todos')).body).toHaveLength(0);

    const applied = await assignUnownedTodos('owner', { dryRun: false });
    expect(applied).toMatchObject({ unownedBefore: 2, assigned: 2, ownerId: owner.userId });
    const titles = (await api<TodoDto[]>('GET', 'todos')).body.map((todo) => todo.title).sort();
    expect(titles).toEqual(['legacy 1', 'legacy 2']);

    const again = await assignUnownedTodos('owner', { dryRun: false });
    expect(again).toMatchObject({ unownedBefore: 0, assigned: 0 });

    const owned = await TodoModel.findOne({ title: 'already owned' }).lean();
    expect(owned?.userId?.toString()).toBe(other.userId);

    const indexes = await TodoModel.collection.indexes();
    expect(indexes.some((index) => index.key.userId === 1)).toBe(true);
  });

  it('refuses to guess when two users share a username', async () => {
    await UserModel.create([
      { githubId: 1, username: 'renamed', avatarUrl: '' },
      { githubId: 2, username: 'renamed', avatarUrl: '' },
    ]);
    await TodoModel.collection.insertOne({ title: 'legacy', description: '', status: 'todo' });

    await expect(assignUnownedTodos('renamed', { dryRun: false })).rejects.toBeInstanceOf(ConflictError);
    expect(await TodoModel.countDocuments({ userId: { $exists: true } })).toBe(0);
  });
});
