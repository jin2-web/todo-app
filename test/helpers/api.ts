import * as goalsRoute from '@/app/api/goals/route';
import * as goalRoute from '@/app/api/goals/[id]/route';
import * as plansRoute from '@/app/api/weekly-plans/route';
import * as planRoute from '@/app/api/weekly-plans/[id]/route';
import * as todosRoute from '@/app/api/todos/route';
import * as todoRoute from '@/app/api/todos/[id]/route';
import * as dashboardRoute from '@/app/api/dashboard/route';
import { SESSION_COOKIE } from '@/lib/auth/session';

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type CollectionHandler = (request: Request) => Promise<Response>;
type ItemHandler = (request: Request, context: { params: { id: string } }) => Promise<Response>;

const COLLECTIONS: Record<string, Partial<Record<Method, CollectionHandler>>> = {
  goals: goalsRoute,
  'weekly-plans': plansRoute,
  todos: todosRoute,
  dashboard: dashboardRoute,
};

const ITEMS: Record<string, Partial<Record<Method, ItemHandler>>> = {
  goals: goalRoute,
  'weekly-plans': planRoute,
  todos: todoRoute,
};

/** Session token sent as the `todo_session` cookie; null = anonymous. */
let sessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

function buildRequest(method: Method, path: string, body: unknown, token: string | null): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) {
    headers.cookie = `${SESSION_COOKIE}=${token}`;
  }
  return new Request(`http://localhost/api/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function toResult<T>(response: Response): Promise<ApiResult<T>> {
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
}

/**
 * Calls the real route handlers. `path` is relative to /api, e.g. `todos`,
 * `todos/<id>` or `weekly-plans?week=2026-11-23`. Uses the current session token
 * unless `options.token` overrides it (pass null for an anonymous request).
 */
export async function api<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  options: { token?: string | null } = {},
): Promise<ApiResult<T>> {
  const token = options.token === undefined ? sessionToken : options.token;
  const request = buildRequest(method, path, body, token);
  const [resource, id] = path.split('?')[0].split('/');
  if (id) {
    const handler = ITEMS[resource][method];
    if (!handler) {
      throw new Error(`No ${method} handler for ${resource}/:id`);
    }
    return toResult<T>(await handler(request, { params: { id } }));
  }
  const handler = COLLECTIONS[resource][method];
  if (!handler) {
    throw new Error(`No ${method} handler for ${resource}`);
  }
  return toResult<T>(await handler(request));
}
