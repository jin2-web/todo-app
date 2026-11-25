import { createHash, randomBytes } from 'crypto';
import { connectToDatabase } from '@/lib/db';
import { SessionModel } from '@/models/Session';
import { UserModel, type UserRecord } from '@/models/User';

export const SESSION_COOKIE = 'todo_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  username: string;
  avatarUrl: string;
}

export interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function toSessionUser(user: UserRecord): SessionUser {
  return { id: user._id.toString(), username: user.username, avatarUrl: user.avatarUrl };
}

/** Creates a session and returns the raw token for the cookie. */
export async function createSession(userId: string): Promise<string> {
  await connectToDatabase();
  const token = generateToken();
  await SessionModel.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  });
  return token;
}

export async function getUserBySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }
  await connectToDatabase();
  const session = await SessionModel.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) {
    return null;
  }
  const user = await UserModel.findById(session.userId).lean<UserRecord>();
  return user ? toSessionUser(user) : null;
}

/** Removes the session document so the token can never be used again. */
export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }
  await connectToDatabase();
  await SessionModel.deleteOne({ tokenHash: hashToken(token) });
}

/** Reads one cookie from a raw `Cookie` header (works for Request and NextRequest). */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) {
    return undefined;
  }
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        // Malformed encoding (e.g. `%zz`) is treated as no cookie → 401, not 500.
        return undefined;
      }
    }
  }
  return undefined;
}
