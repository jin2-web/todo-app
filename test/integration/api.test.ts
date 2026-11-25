import { addDays, getWeekStart, toDateKey } from '@/lib/week';
import type { DashboardDto, GoalDto, TodoDto, WeeklyPlanDto } from '@/types/domain';
import { api, setSessionToken } from '../helpers/api';
import { loginAs } from '../helpers/auth';
import { clearTestDatabase, startTestDatabase, stopTestDatabase } from '../helpers/db';

interface ErrorBody {
  error: { code: string; message: string };
}

const WEEK = '2026-11-23'; // Monday
const NEXT_WEEK = '2026-11-30';

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
beforeEach(async () => {
  await loginAs('tester');
});
afterEach(async () => {
  setSessionToken(null);
  await clearTestDatabase();
});

async function createPlan(title: string, weekStart = WEEK, goalId?: string): Promise<WeeklyPlanDto> {
  const res = await api<WeeklyPlanDto>('POST', 'weekly-plans', { title, weekStart, goalId });
  expect(res.status).toBe(201);
  return res.body;
}

async function createTodo(body: Record<string, unknown>): Promise<TodoDto> {
  const res = await api<TodoDto>('POST', 'todos', body);
  expect(res.status).toBe(201);
  return res.body;
}

async function getPlan(id: string): Promise<WeeklyPlanDto> {
  const res = await api<WeeklyPlanDto>('GET', `weekly-plans/${id}`);
  expect(res.status).toBe(200);
  return res.body;
}

describe('todos CRUD', () => {
  it('creates a todo with only a title and defaults status to todo', async () => {
    const todo = await createTodo({ title: '책 읽기' });
    expect(todo).toMatchObject({ title: '책 읽기', status: 'todo', date: null, weeklyPlanId: null });
  });

  it('rejects a missing or blank title with 400', async () => {
    const missing = await api<ErrorBody>('POST', 'todos', {});
    const blank = await api<ErrorBody>('POST', 'todos', { title: '   ' });
    expect(missing.status).toBe(400);
    expect(blank.status).toBe(400);
    expect(blank.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reads, updates and deletes a todo', async () => {
    const todo = await createTodo({ title: '운동' });
    const updated = await api<TodoDto>('PATCH', `todos/${todo.id}`, { title: '운동 30분', status: 'doing' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ title: '운동 30분', status: 'doing' });

    expect((await api('DELETE', `todos/${todo.id}`)).status).toBe(204);
    expect((await api('GET', `todos/${todo.id}`)).status).toBe(404);
  });

  it('rejects an unknown status with 400', async () => {
    const todo = await createTodo({ title: '상태' });
    expect((await api('PATCH', `todos/${todo.id}`, { status: 'archived' })).status).toBe(400);
  });

  it('allows every status transition (6 directions)', async () => {
    const todo = await createTodo({ title: '이동' });
    const path: Array<TodoDto['status']> = ['doing', 'done', 'todo', 'done', 'doing', 'todo'];
    for (const status of path) {
      const res = await api<TodoDto>('PATCH', `todos/${todo.id}`, { status });
      expect(res.body.status).toBe(status);
    }
  });

  it('returns 404 when linking to a weekly plan that does not exist', async () => {
    const res = await api('POST', 'todos', { title: 'x', weeklyPlanId: '0123456789abcdef01234567' });
    expect(res.status).toBe(404);
  });
});

describe('weekly plans', () => {
  it('normalizes weekStart to Monday 00:00 KST', async () => {
    const plan = await createPlan('계획', '2026-11-26');
    expect(plan.weekStart).toBe(new Date('2026-11-23T00:00:00+09:00').toISOString());
  });

  it('rejects the 6th plan in the same week with 409', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await createPlan(`계획 ${i}`);
    }
    const res = await api<ErrorBody>('POST', 'weekly-plans', { title: '계획 6', weekStart: WEEK });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects moving a plan into a full week with 409, but allows editing within its own week', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await createPlan(`계획 ${i}`);
    }
    const other = await createPlan('다음 주', NEXT_WEEK);
    expect((await api('PATCH', `weekly-plans/${other.id}`, { weekStart: WEEK })).status).toBe(409);

    const full = (await api<WeeklyPlanDto[]>('GET', `weekly-plans?week=${WEEK}`)).body;
    expect(full).toHaveLength(5);
    const own = await api<WeeklyPlanDto>('PATCH', `weekly-plans/${full[0].id}`, { title: '이름만 변경', weekStart: WEEK });
    expect(own.status).toBe(200);
    expect(own.body.title).toBe('이름만 변경');
  });

  it('rejects a weekStart change that would leave linked todo dates outside the week (409)', async () => {
    const plan = await createPlan('계획');
    await createTodo({ title: '수요일', date: '2026-11-25', weeklyPlanId: plan.id });
    expect((await api('PATCH', `weekly-plans/${plan.id}`, { weekStart: NEXT_WEEK })).status).toBe(409);
  });

  it('allows moving a plan whose linked todos have no date', async () => {
    const plan = await createPlan('계획');
    await createTodo({ title: '날짜 없음', weeklyPlanId: plan.id });
    const res = await api<WeeklyPlanDto>('PATCH', `weekly-plans/${plan.id}`, { weekStart: NEXT_WEEK });
    expect(res.status).toBe(200);
    expect(res.body.weekStart).toBe(new Date('2026-11-30T00:00:00+09:00').toISOString());
  });

  it('lists only plans of the requested week', async () => {
    await createPlan('이번 주');
    await createPlan('다음 주', NEXT_WEEK);
    const res = await api<WeeklyPlanDto[]>('GET', `weekly-plans?week=${WEEK}`);
    expect(res.body.map((plan) => plan.title)).toEqual(['이번 주']);
  });
});

describe('todo date must fall inside the linked plan week', () => {
  it('rejects create, date update and link change outside the week with 400', async () => {
    const plan = await createPlan('계획');
    const outside = await api('POST', 'todos', { title: 'x', date: NEXT_WEEK, weeklyPlanId: plan.id });
    expect(outside.status).toBe(400);

    const inside = await createTodo({ title: 'y', date: '2026-11-24', weeklyPlanId: plan.id });
    expect((await api('PATCH', `todos/${inside.id}`, { date: NEXT_WEEK })).status).toBe(400);

    const unlinked = await createTodo({ title: 'z', date: NEXT_WEEK });
    expect((await api('PATCH', `todos/${unlinked.id}`, { weeklyPlanId: plan.id })).status).toBe(400);
  });

  it('accepts Monday 00:00 KST and Sunday 23:59 KST', async () => {
    const plan = await createPlan('계획');
    await createTodo({ title: '월', date: '2026-11-23T00:00:00+09:00', weeklyPlanId: plan.id });
    await createTodo({ title: '일', date: '2026-11-29T23:59:00+09:00', weeklyPlanId: plan.id });
  });

  it('allows clearing the date of a linked todo', async () => {
    const plan = await createPlan('계획');
    const todo = await createTodo({ title: 'x', date: '2026-11-24', weeklyPlanId: plan.id });
    const res = await api<TodoDto>('PATCH', `todos/${todo.id}`, { date: null });
    expect(res.status).toBe(200);
    expect(res.body.date).toBeNull();
  });
});

describe('deleting a parent unlinks children', () => {
  it('keeps todos and clears weeklyPlanId when a weekly plan is deleted', async () => {
    const plan = await createPlan('계획');
    const todo = await createTodo({ title: 'x', weeklyPlanId: plan.id });
    expect((await api('DELETE', `weekly-plans/${plan.id}`)).status).toBe(204);

    const after = await api<TodoDto>('GET', `todos/${todo.id}`);
    expect(after.status).toBe(200);
    expect(after.body.weeklyPlanId).toBeNull();
  });

  it('keeps weekly plans and clears goalId when a goal is deleted', async () => {
    const goal = (await api<GoalDto>('POST', 'goals', { title: '건강', year: 2026 })).body;
    const plan = await createPlan('계획', WEEK, goal.id);
    expect(plan.goalId).toBe(goal.id);

    expect((await api('DELETE', `goals/${goal.id}`)).status).toBe(204);
    const after = await getPlan(plan.id);
    expect(after.goalId).toBeNull();
    expect((await api('GET', `goals/${goal.id}`)).status).toBe(404);
  });
});

describe('goals', () => {
  it('creates, updates and validates goals', async () => {
    const created = await api<GoalDto>('POST', 'goals', { title: '독서 50권', year: 2026, description: '월 4권' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: '독서 50권', year: 2026, description: '월 4권' });

    const updated = await api<GoalDto>('PATCH', `goals/${created.body.id}`, { year: 2027 });
    expect(updated.body.year).toBe(2027);

    expect((await api('POST', 'goals', { title: '연도 없음' })).status).toBe(400);
    expect((await api('PATCH', `goals/${created.body.id}`, {})).status).toBe(400);
  });

  it('returns 400 for a malformed id', async () => {
    expect((await api('GET', 'goals/not-an-id')).status).toBe(400);
  });
});

describe('weekly progress', () => {
  it('is 0 with no todos and follows create / status / link / delete changes', async () => {
    const plan = await createPlan('계획');
    expect((await getPlan(plan.id)).progress).toBe(0);

    const todos = [];
    for (let i = 0; i < 4; i += 1) {
      todos.push(await createTodo({ title: `t${i}`, weeklyPlanId: plan.id }));
    }
    await api('PATCH', `todos/${todos[0].id}`, { status: 'done' });
    expect(await getPlan(plan.id)).toMatchObject({ progress: 25, doneTodos: 1, totalTodos: 4 });

    await api('PATCH', `todos/${todos[1].id}`, { weeklyPlanId: null });
    expect((await getPlan(plan.id)).progress).toBe(33);

    await api('DELETE', `todos/${todos[2].id}`);
    expect((await getPlan(plan.id)).progress).toBe(50);

    await api('PATCH', `todos/${todos[0].id}`, { status: 'todo' });
    expect((await getPlan(plan.id)).progress).toBe(0);
  });

  it('dashboard shows only this week plans with progress', async () => {
    const thisWeek = getWeekStart(new Date());
    const current = await createPlan('이번 주', toDateKey(thisWeek));
    await createPlan('다음 주', toDateKey(addDays(thisWeek, 7)));
    const todo = await createTodo({ title: 'x', weeklyPlanId: current.id });
    await api('PATCH', `todos/${todo.id}`, { status: 'done' });

    const res = await api<DashboardDto>('GET', 'dashboard');
    expect(res.status).toBe(200);
    expect(res.body.weekStart).toBe(thisWeek.toISOString());
    expect(res.body.plans).toHaveLength(1);
    expect(res.body.plans[0]).toMatchObject({ title: '이번 주', progress: 100 });
  });
});
