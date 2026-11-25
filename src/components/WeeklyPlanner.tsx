'use client';

import { useState, type FormEvent } from 'react';
import { useMutationRefresh } from '@/hooks/useMutationRefresh';
import { createWeeklyPlan } from '@/lib/apiClient';
import { toDateKey } from '@/lib/week';
import { MAX_PLANS_PER_WEEK, type GoalDto, type TodoDto, type WeeklyPlanDto } from '@/types/domain';
import { ErrorMessage } from './ErrorMessage';
import { WeeklyPlanCard } from './WeeklyPlanCard';

interface WeeklyPlannerProps {
  weekStart: string;
  plans: WeeklyPlanDto[];
  todos: TodoDto[];
  goals: GoalDto[];
}

export function WeeklyPlanner({ weekStart, plans, todos, goals }: WeeklyPlannerProps) {
  const mutation = useMutationRefresh();
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState('');
  const isFull = plans.length >= MAX_PLANS_PER_WEEK;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      mutation.setError('제목을 입력하세요.');
      return;
    }
    const ok = await mutation.run(function create() {
      return createWeeklyPlan({
        title: title.trim(),
        weekStart: toDateKey(new Date(weekStart)),
        goalId: goalId || null,
      });
    });
    if (ok) {
      setTitle('');
      setGoalId('');
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>
          새 주간 계획{' '}
          <span className="muted">
            ({plans.length}/{MAX_PLANS_PER_WEEK})
          </span>
        </h2>
        <form className="form" onSubmit={handleCreate} noValidate aria-label="주간 계획 추가">
          <label>
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="이번 주 계획" />
          </label>
          <label>
            1년 목표
            <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
              <option value="">미연결</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.year} · {goal.title}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" disabled={mutation.pending}>
              추가
            </button>
          </div>
        </form>
        {isFull && <p className="muted">이번 주는 계획이 {MAX_PLANS_PER_WEEK}개로 가득 찼습니다.</p>}
        <ErrorMessage message={mutation.error} />
      </section>

      {plans.length === 0 && <p className="empty">이 주에는 주간 계획이 없습니다.</p>}
      {plans.map((plan) => (
        <WeeklyPlanCard
          key={`${plan.id}-${plan.updatedAt}`}
          plan={plan}
          goals={goals}
          todos={todos.filter((todo) => todo.weeklyPlanId === plan.id)}
        />
      ))}
    </div>
  );
}
