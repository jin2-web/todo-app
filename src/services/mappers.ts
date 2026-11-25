import type { GoalRecord } from '@/models/Goal';
import type { TodoRecord } from '@/models/Todo';
import type { WeeklyPlanRecord } from '@/models/WeeklyPlan';
import { calculateProgress } from '@/lib/progress';
import type { GoalDto, TodoDto, WeeklyPlanDto } from '@/types/domain';

export interface TodoCounts {
  total: number;
  done: number;
}

export function toGoalDto(goal: GoalRecord): GoalDto {
  return {
    id: goal._id.toString(),
    title: goal.title,
    description: goal.description ?? '',
    year: goal.year,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export function toWeeklyPlanDto(plan: WeeklyPlanRecord, counts: TodoCounts): WeeklyPlanDto {
  return {
    id: plan._id.toString(),
    title: plan.title,
    weekStart: plan.weekStart.toISOString(),
    goalId: plan.goalId ? plan.goalId.toString() : null,
    totalTodos: counts.total,
    doneTodos: counts.done,
    progress: calculateProgress(counts.done, counts.total),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function toTodoDto(todo: TodoRecord): TodoDto {
  return {
    id: todo._id.toString(),
    title: todo.title,
    description: todo.description ?? '',
    date: todo.date ? todo.date.toISOString() : null,
    status: todo.status,
    weeklyPlanId: todo.weeklyPlanId ? todo.weeklyPlanId.toString() : null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}
