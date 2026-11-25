import { createSession } from '@/lib/auth/session';
import { upsertGithubUser } from '@/services/userService';
import { setSessionToken } from './api';

export interface TestLogin {
  userId: string;
  token: string;
}

let nextGithubId = 1000;

/** Creates a user + session directly (bypassing GitHub) and makes it the default for api(). */
export async function loginAs(username: string): Promise<TestLogin> {
  nextGithubId += 1;
  const user = await upsertGithubUser({
    id: nextGithubId,
    login: username,
    avatar_url: `https://avatars.example/${username}.png`,
  });
  const token = await createSession(user._id.toString());
  setSessionToken(token);
  return { userId: user._id.toString(), token };
}
