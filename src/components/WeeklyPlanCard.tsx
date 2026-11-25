'use client';

import { useState, type FormEvent } from 'react';
import { useMutationRefresh } from '@/hooks/useMutationRefresh';
import { createTodo, deleteWeeklyPlan, updateWeeklyPlan } from '@/lib/apiClient';
import { toDateKey } from '@/lib/week';
import type { GoalDto, TodoDto, WeeklyPlanDto } from '@/types/domain';
import { ErrorMessage } from './ErrorMessage';
import { ProgressBar } from './ProgressBar';
import { TodoForm, type TodoFormValues } from './TodoForm';
import { WeekdayGrid } from './WeekdayGrid';

interface WeeklyPlanCardProps {
  plan: WeeklyPlanDto;
  todos: TodoDto[];
  goals: GoalDto[];
}

export function WeeklyPlanCard({ plan, todos, goals }: WeeklyPlanCardProps) {
  const mutation = useMutationRefresh();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(plan.title);
  const [goalId, setGoalId] = useState(plan.goalId ?? '');
  const [weekDate, setWeekDate] = useState(toDateKey(new Date(plan.weekStart)));

  const goal = goals.find(function matchGoal(item) {
    return item.id === plan.goalId;
  });

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      mutation.setError('제목을 입력하세요.');
      return;
    }
    const ok = await mutation.run(function save() {
      return updateWeeklyPlan(plan.id, { title: title.trim(), goalId: goalId || null, weekStart: weekDate });
    });
    if (ok) {
      setEditing(false);
    }
  }

  function handleDelete() {
    if (!window.confirm(`'${plan.title}' 주간 계획을 삭제할까요? 연결된 할 일은 남고 연결만 해제됩니다.`)) {
      return;
    }
    void mutation.run(function remove() {
      return deleteWeeklyPlan(plan.id);
    });
  }

  function handleAddTodo(values: TodoFormValues): Promise<boolean> {
    return mutation.run(function create() {
      return createTodo({ ...values, weeklyPlanId: plan.id });
    });
  }

  return (
    <article className="panel plan-card" aria-label={`주간 계획 ${plan.title}`}>
      {editing ? (
        <form className="form" onSubmit={handleSave} noValidate>
          <label>
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            1년 목표
            <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
              <option value="">미연결</option>
              {goals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.year} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            주 (해당 주의 아무 날짜)
            <input type="date" value={weekDate} onChange={(event) => setWeekDate(event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={mutation.pending}>
              저장
            </button>
            <button type="button" className="secondary" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </form>
      ) : (
        <header className="plan-header">
          <div>
            <h3>{plan.title}</h3>
            <p className="meta">{goal ? `목표: ${goal.title}` : '목표 미연결'}</p>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setEditing(true)}>
              수정
            </button>
            <button type="button" className="danger" onClick={handleDelete}>
              삭제
            </button>
          </div>
        </header>
      )}

      <ProgressBar value={plan.progress} label={`${plan.title} 진행률`} />
      <p className="meta">
        완료 {plan.doneTodos} / 전체 {plan.totalTodos}
      </p>

      <WeekdayGrid weekStart={plan.weekStart} todos={todos} />

      <details>
        <summary>이 계획에 할 일 추가</summary>
        <TodoForm plans={[plan]} defaultPlanId={plan.id} lockPlan submitLabel="할 일 추가" onSubmit={handleAddTodo} />
      </details>
      <ErrorMessage message={mutation.error} />
    </article>
  );
}
