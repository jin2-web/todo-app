import { connectToDatabase } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { GoalModel, type GoalRecord } from '@/models/Goal';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';
import type { CreateGoalInput, UpdateGoalInput } from '@/schemas/goal';
import type { GoalDto } from '@/types/domain';
import { toGoalDto } from './mappers';

async function findGoalOrThrow(id: string): Promise<GoalRecord> {
  const goal = await GoalModel.findById(id).lean<GoalRecord>();
  if (!goal) {
    throw new NotFoundError('1년 목표를 찾을 수 없습니다.');
  }
  return goal;
}

export async function assertGoalExists(id: string): Promise<void> {
  const exists = await GoalModel.exists({ _id: id });
  if (!exists) {
    throw new NotFoundError('연결할 1년 목표를 찾을 수 없습니다.');
  }
}

export async function listGoals(): Promise<GoalDto[]> {
  await connectToDatabase();
  const goals = await GoalModel.find().sort({ year: -1, createdAt: 1 }).lean<GoalRecord[]>();
  return goals.map(toGoalDto);
}

export async function getGoal(id: string): Promise<GoalDto> {
  await connectToDatabase();
  return toGoalDto(await findGoalOrThrow(id));
}

export async function createGoal(input: CreateGoalInput): Promise<GoalDto> {
  await connectToDatabase();
  const created = await GoalModel.create({
    title: input.title,
    description: input.description ?? '',
    year: input.year,
  });
  return toGoalDto(created.toObject<GoalRecord>());
}

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<GoalDto> {
  await connectToDatabase();
  const updated = await GoalModel.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true },
  ).lean<GoalRecord>();
  if (!updated) {
    throw new NotFoundError('1년 목표를 찾을 수 없습니다.');
  }
  return toGoalDto(updated);
}

/** Deletes the goal; linked weekly plans are kept and unlinked (unlink first, so retries are safe). */
export async function deleteGoal(id: string): Promise<void> {
  await connectToDatabase();
  await findGoalOrThrow(id);
  const unlinked = await WeeklyPlanModel.updateMany({ goalId: id }, { $unset: { goalId: 1 } });
  await GoalModel.deleteOne({ _id: id });
  logger.info('Goal deleted', { goalId: id, unlinkedPlans: unlinked.modifiedCount });
}
