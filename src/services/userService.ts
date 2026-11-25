import { connectToDatabase } from '@/lib/db';
import type { GithubProfile } from '@/lib/auth/github';
import { UserModel, type UserRecord } from '@/models/User';

/** Creates the user on first login; refreshes username / avatar on later logins. */
export async function upsertGithubUser(profile: GithubProfile): Promise<UserRecord> {
  await connectToDatabase();
  const user = await UserModel.findOneAndUpdate(
    { githubId: profile.id },
    { $set: { username: profile.login, avatarUrl: profile.avatar_url } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean<UserRecord>();
  if (!user) {
    throw new Error('사용자 저장에 실패했습니다.');
  }
  return user;
}
