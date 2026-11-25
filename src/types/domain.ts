export const TODO_STATUSES = ['todo', 'doing', 'done'] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done',
};

export const MAX_PLANS_PER_WEEK = 5;

export interface GoalDto {
  id: string;
  title: string;
  description: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlanDto {
  id: string;
  title: string;
  /** ISO instant of Monday 00:00 KST of the plan's week. */
  weekStart: string;
  goalId: string | null;
  totalTodos: number;
  doneTodos: number;
  /** 0-100, Math.round(done / total * 100), 0 when there are no todos. */
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoDto {
  id: string;
  title: string;
  description: string;
  /** ISO instant, or null when the todo has no date. */
  date: string | null;
  status: TodoStatus;
  weeklyPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardDto {
  weekStart: string;
  plans: WeeklyPlanDto[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
