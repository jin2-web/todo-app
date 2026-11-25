import { connectToDatabase } from '@/lib/db';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { TodoModel } from '@/models/Todo';
import { UserModel, type UserRecord } from '@/models/User';

export interface TodoOwnerMigrationResult {
  ownerId: string;
  ownerUsername: string;
  unownedBefore: number;
  assigned: number;
  dryRun: boolean;
}

/** Todos created before login existed have no userId. */
export const UNOWNED_TODO_FILTER = { $or: [{ userId: { $exists: false } }, { userId: null }] };

/**
 * Migration: adds the `userId` field to existing todos.
 * 1. Builds the `userId` index on the todos collection.
 * 2. Assigns every todo without an owner to the given GitHub user (who must have logged in once).
 * Idempotent: a second run finds nothing left to assign. Todos that already have an owner are never touched.
 */
export async function assignUnownedTodos(
  ownerUsername: string,
  options: { dryRun: boolean },
): Promise<TodoOwnerMigrationResult> {
  await connectToDatabase();
  // username is not unique (GitHub logins can be renamed and reused), so refuse to guess.
  const candidates = await UserModel.find({ username: ownerUsername }).limit(2).lean<UserRecord[]>();
  if (candidates.length === 0) {
    throw new NotFoundError(
      `GitHub 사용자 '${ownerUsername}'를 찾을 수 없습니다. 앱에 한 번 로그인한 뒤 다시 실행하세요.`,
    );
  }
  if (candidates.length > 1) {
    throw new ConflictError(`username '${ownerUsername}'인 사용자가 여러 명입니다. 마이그레이션을 중단합니다.`);
  }
  const owner = candidates[0];

  const unownedBefore = await TodoModel.countDocuments(UNOWNED_TODO_FILTER);
  let assigned = 0;
  if (!options.dryRun) {
    await TodoModel.createIndexes();
    const result = await TodoModel.updateMany(UNOWNED_TODO_FILTER, { $set: { userId: owner._id } });
    assigned = result.modifiedCount;
  }
  return {
    ownerId: owner._id.toString(),
    ownerUsername: owner.username,
    unownedBefore,
    assigned,
    dryRun: options.dryRun,
  };
}
