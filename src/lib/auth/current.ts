import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UnauthorizedError } from '@/lib/errors';
import { SESSION_COOKIE, getUserBySessionToken, readCookie, type SessionUser } from './session';

/** For Route Handlers: the logged-in user, or UnauthorizedError (401). */
export async function requireApiUser(request: Request): Promise<SessionUser> {
  const user = await getUserBySessionToken(readCookie(request, SESSION_COOKIE));
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/** For Server Components: the logged-in user or null. */
export async function getPageUser(): Promise<SessionUser | null> {
  return getUserBySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

/** For Server Components: the logged-in user, or a redirect to /login. */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await getPageUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
