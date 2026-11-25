import { connectToDatabase } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { formatWeekRange, isInWeek } from '@/lib/week';
import { TodoModel, type TodoRecord } from '@/models/Todo';
import type { CreateTodoInput, TodoQuery, UpdateTodoInput } from '@/schemas/todo';
import type { TodoDto } from '@/types/domain';
import { toTodoDto } from './mappers';
import { getPlanWeekStart } from './weeklyPlanService';

async function findTodoOrThrow(id: string): Promise<TodoRecord> {
  const todo = await TodoModel.findById(id).lean<TodoRecord>();
  if (!todo) {
    throw new NotFoundError('할 일을 찾을 수 없습니다.');
  }
  return todo;
}

/** The linked plan must exist, and a dated todo must fall inside the plan's week (KST). */
async function assertValidLink(weeklyPlanId: string | null, date: Date | null): Promise<void> {
  if (!weeklyPlanId) {
    return;
  }
  const weekStart = await getPlanWeekStart(weeklyPlanId);
  if (date && !isInWeek(date, weekStart)) {
    throw new ValidationError(
      `할 일 날짜는 연결된 주간 계획의 주(${formatWeekRange(weekStart)}) 안이어야 합니다.`,
    );
  }
}

/**
 * Ownership guard used by the API before get / update / delete.
 * Someone else's todo is reported as 404 so its existence is not revealed.
 */
export async function assertTodoOwner(id: string, userId: string): Promise<void> {
  await connectToDatabase();
  const owned = await TodoModel.exists({ _id: id, userId });
  if (!owned) {
    throw new NotFoundError('할 일을 찾을 수 없습니다.');
  }
}

/** Lists the given user's todos only. */
export async function listTodos(query: TodoQuery, userId: string): Promise<TodoDto[]> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { userId };
  if (query.weeklyPlanId) {
    filter.weeklyPlanId = query.weeklyPlanId;
  }
  if (query.status) {
    filter.status = query.status;
  }
  const todos = await TodoModel.find(filter).sort({ createdAt: 1 }).lean<TodoRecord[]>();
  return todos.map(toTodoDto);
}

export async function getTodo(id: string): Promise<TodoDto> {
  await connectToDatabase();
  return toTodoDto(await findTodoOrThrow(id));
}

export async function createTodo(input: CreateTodoInput, userId: string): Promise<TodoDto> {
  await connectToDatabase();
  const weeklyPlanId = input.weeklyPlanId ?? null;
  const date = input.date ?? null;
  await assertValidLink(weeklyPlanId, date);
  const created = await TodoModel.create({
    title: input.title,
    description: input.description ?? '',
    status: input.status ?? 'todo',
    userId,
    ...(date ? { date } : {}),
    ...(weeklyPlanId ? { weeklyPlanId } : {}),
  });
  return toTodoDto(created.toObject<TodoRecord>());
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<TodoDto> {
  await connectToDatabase();
  const current = await findTodoOrThrow(id);

  if (input.weeklyPlanId !== undefined || input.date !== undefined) {
    const nextPlanId =
      input.weeklyPlanId !== undefined ? input.weeklyPlanId : (current.weeklyPlanId?.toString() ?? null);
    const nextDate = input.date !== undefined ? input.date : (current.date ?? null);
    await assertValidLink(nextPlanId, nextDate);
  }

  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  if (input.title !== undefined) {
    set.title = input.title;
  }
  if (input.description !== undefined) {
    set.description = input.description;
  }
  if (input.status !== undefined) {
    set.status = input.status;
  }
  if (input.date === null) {
    unset.date = 1;
  } else if (input.date !== undefined) {
    set.date = input.date;
  }
  if (input.weeklyPlanId === null) {
    unset.weeklyPlanId = 1;
  } else if (input.weeklyPlanId !== undefined) {
    set.weeklyPlanId = input.weeklyPlanId;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) {
    update.$set = set;
  }
  if (Object.keys(unset).length > 0) {
    update.$unset = unset;
  }
  const updated = await TodoModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean<TodoRecord>();
  if (!updated) {
    throw new NotFoundError('할 일을 찾을 수 없습니다.');
  }
  return toTodoDto(updated);
}

export async function deleteTodo(id: string): Promise<void> {
  await connectToDatabase();
  const result = await TodoModel.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new NotFoundError('할 일을 찾을 수 없습니다.');
  }
}
