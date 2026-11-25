import type { ApiErrorBody, GoalDto, TodoDto, TodoStatus, WeeklyPlanDto } from '@/types/domain';
import { ApiRequestError } from './errors';

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const error = (value as { error: unknown }).error;
  return typeof error === 'object' && error !== null && 'message' in error;
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError('서버에 연결할 수 없습니다. 네트워크를 확인하세요.', 0, 'NETWORK_ERROR');
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const data: unknown = await response.json().catch(function ignoreParseError() {
    return null;
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      // Session expired while the page was open: go log in again.
      window.location.assign('/login');
    }
    if (isApiErrorBody(data)) {
      throw new ApiRequestError(data.error.message, response.status, data.error.code);
    }
    throw new ApiRequestError(`요청이 실패했습니다. (${response.status})`, response.status, 'HTTP_ERROR');
  }
  return data as T;
}

export interface TodoPayload {
  title?: string;
  description?: string;
  /** `YYYY-MM-DD` (KST) or null to clear. */
  date?: string | null;
  status?: TodoStatus;
  weeklyPlanId?: string | null;
}

export interface WeeklyPlanPayload {
  title?: string;
  /** Any `YYYY-MM-DD` inside the target week. */
  weekStart?: string;
  goalId?: string | null;
}

export interface GoalPayload {
  title?: string;
  description?: string;
  year?: number;
}

export function createTodo(payload: TodoPayload): Promise<TodoDto> {
  return request<TodoDto>('/api/todos', 'POST', payload);
}

export function updateTodo(id: string, payload: TodoPayload): Promise<TodoDto> {
  return request<TodoDto>(`/api/todos/${id}`, 'PATCH', payload);
}

export function deleteTodo(id: string): Promise<void> {
  return request<void>(`/api/todos/${id}`, 'DELETE');
}

export function createWeeklyPlan(payload: WeeklyPlanPayload): Promise<WeeklyPlanDto> {
  return request<WeeklyPlanDto>('/api/weekly-plans', 'POST', payload);
}

export function updateWeeklyPlan(id: string, payload: WeeklyPlanPayload): Promise<WeeklyPlanDto> {
  return request<WeeklyPlanDto>(`/api/weekly-plans/${id}`, 'PATCH', payload);
}

export function deleteWeeklyPlan(id: string): Promise<void> {
  return request<void>(`/api/weekly-plans/${id}`, 'DELETE');
}

export function createGoal(payload: GoalPayload): Promise<GoalDto> {
  return request<GoalDto>('/api/goals', 'POST', payload);
}

export function updateGoal(id: string, payload: GoalPayload): Promise<GoalDto> {
  return request<GoalDto>(`/api/goals/${id}`, 'PATCH', payload);
}

export function deleteGoal(id: string): Promise<void> {
  return request<void>(`/api/goals/${id}`, 'DELETE');
}
