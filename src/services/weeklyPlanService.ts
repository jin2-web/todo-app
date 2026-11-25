import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { addDays, getWeekStart } from '@/lib/week';
import { TodoModel } from '@/models/Todo';
import { WeeklyPlanModel, type WeeklyPlanRecord } from '@/models/WeeklyPlan';
import type { CreateWeeklyPlanInput, UpdateWeeklyPlanInput } from '@/schemas/weeklyPlan';
import { MAX_PLANS_PER_WEEK, type WeeklyPlanDto } from '@/types/domain';
import { assertGoalExists } from './goalService';
import { toWeeklyPlanDto, type TodoCounts } from './mappers';

interface CountRow {
  _id: Types.ObjectId;
  total: number;
  done: number;
}

const EMPTY_COUNTS: TodoCounts = { total: 0, done: 0 };

/** Progress is derived on every read, so any todo change is reflected immediately. */
async function countTodosByPlan(planIds: Types.ObjectId[]): Promise<Map<string, TodoCounts>> {
  const counts = new Map<string, TodoCounts>();
  if (planIds.length === 0) {
    return counts;
  }
  const rows = await TodoModel.aggregate<CountRow>([
    { $match: { weeklyPlanId: { $in: planIds } } },
    {
      $group: {
        _id: '$weeklyPlanId',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      },
    },
  ]);
  for (const row of rows) {
    counts.set(row._id.toString(), { total: row.total, done: row.done });
  }
  return counts;
}

async function withProgress(plans: WeeklyPlanRecord[]): Promise<WeeklyPlanDto[]> {
  const counts = await countTodosByPlan(plans.map(getPlanId));
  return plans.map(function mapPlan(plan) {
    return toWeeklyPlanDto(plan, counts.get(plan._id.toString()) ?? EMPTY_COUNTS);
  });
}

function getPlanId(plan: WeeklyPlanRecord): Types.ObjectId {
  return plan._id;
}

async function findPlanOrThrow(id: string): Promise<WeeklyPlanRecord> {
  const plan = await WeeklyPlanModel.findById(id).lean<WeeklyPlanRecord>();
  if (!plan) {
    throw new NotFoundError('주간 계획을 찾을 수 없습니다.');
  }
  return plan;
}

async function assertWeekHasRoom(weekStart: Date, excludePlanId?: string): Promise<void> {
  const filter: Record<string, unknown> = { weekStart };
  if (excludePlanId) {
    filter._id = { $ne: excludePlanId };
  }
  const count = await WeeklyPlanModel.countDocuments(filter);
  if (count >= MAX_PLANS_PER_WEEK) {
    throw new ConflictError(`주간 계획은 한 주에 최대 ${MAX_PLANS_PER_WEEK}개까지 만들 수 있습니다.`);
  }
}

async function assertTodosFitWeek(planId: string, weekStart: Date): Promise<void> {
  const outside = await TodoModel.exists({
    weeklyPlanId: planId,
    $or: [{ date: { $lt: weekStart } }, { date: { $gte: addDays(weekStart, 7) } }],
  });
  if (outside) {
    throw new ConflictError(
      '연결된 할 일 중 새 주를 벗어나는 날짜가 있습니다. 할 일의 날짜를 옮기거나 연결을 해제한 뒤 다시 시도하세요.',
    );
  }
}

export async function getPlanWeekStart(id: string): Promise<Date> {
  const plan = await WeeklyPlanModel.findById(id).select({ weekStart: 1 }).lean<Pick<WeeklyPlanRecord, 'weekStart'>>();
  if (!plan) {
    throw new NotFoundError('연결할 주간 계획을 찾을 수 없습니다.');
  }
  return plan.weekStart;
}

/** Plans of one week (when `week` is given) or all plans, newest week first. */
export async function listWeeklyPlans(week?: Date): Promise<WeeklyPlanDto[]> {
  await connectToDatabase();
  const filter = week ? { weekStart: getWeekStart(week) } : {};
  const plans = await WeeklyPlanModel.find(filter).sort({ weekStart: -1, createdAt: 1 }).lean<WeeklyPlanRecord[]>();
  return withProgress(plans);
}

export async function getWeeklyPlan(id: string): Promise<WeeklyPlanDto> {
  await connectToDatabase();
  const [plan] = await withProgress([await findPlanOrThrow(id)]);
  return plan;
}

export async function createWeeklyPlan(input: CreateWeeklyPlanInput): Promise<WeeklyPlanDto> {
  await connectToDatabase();
  const weekStart = getWeekStart(input.weekStart);
  if (input.goalId) {
    await assertGoalExists(input.goalId);
  }
  await assertWeekHasRoom(weekStart);
  const created = await WeeklyPlanModel.create({
    title: input.title,
    weekStart,
    ...(input.goalId ? { goalId: input.goalId } : {}),
  });
  return toWeeklyPlanDto(created.toObject<WeeklyPlanRecord>(), EMPTY_COUNTS);
}

export async function updateWeeklyPlan(id: string, input: UpdateWeeklyPlanInput): Promise<WeeklyPlanDto> {
  await connectToDatabase();
  const current = await findPlanOrThrow(id);
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};

  if (input.title !== undefined) {
    set.title = input.title;
  }
  if (input.goalId === null) {
    unset.goalId = 1;
  } else if (input.goalId !== undefined) {
    await assertGoalExists(input.goalId);
    set.goalId = input.goalId;
  }
  if (input.weekStart !== undefined) {
    const weekStart = getWeekStart(input.weekStart);
    if (weekStart.getTime() !== current.weekStart.getTime()) {
      await assertWeekHasRoom(weekStart, id);
      await assertTodosFitWeek(id, weekStart);
    }
    set.weekStart = weekStart;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) {
    update.$set = set;
  }
  if (Object.keys(unset).length > 0) {
    update.$unset = unset;
  }
  const updated = await WeeklyPlanModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean<WeeklyPlanRecord>();
  if (!updated) {
    throw new NotFoundError('주간 계획을 찾을 수 없습니다.');
  }
  const [plan] = await withProgress([updated]);
  return plan;
}

/** Deletes the plan; linked todos are kept and unlinked (unlink first, so retries are safe). */
export async function deleteWeeklyPlan(id: string): Promise<void> {
  await connectToDatabase();
  await findPlanOrThrow(id);
  const unlinked = await TodoModel.updateMany({ weeklyPlanId: id }, { $unset: { weeklyPlanId: 1 } });
  await WeeklyPlanModel.deleteOne({ _id: id });
  logger.info('Weekly plan deleted', { weeklyPlanId: id, unlinkedTodos: unlinked.modifiedCount });
}
