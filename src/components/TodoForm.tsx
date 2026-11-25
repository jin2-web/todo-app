'use client';

import { useState, type FormEvent } from 'react';
import { addDays, formatWeekRange, toDateKey } from '@/lib/week';
import type { TodoDto, WeeklyPlanDto } from '@/types/domain';
import { ErrorMessage } from './ErrorMessage';

export interface TodoFormValues {
  title: string;
  description: string;
  /** `YYYY-MM-DD` (KST) or null. */
  date: string | null;
  weeklyPlanId: string | null;
}

interface TodoFormProps {
  plans: WeeklyPlanDto[];
  initial?: TodoDto;
  defaultPlanId?: string | null;
  /** Hide the plan selector and always use `defaultPlanId`. */
  lockPlan?: boolean;
  submitLabel: string;
  onSubmit: (values: TodoFormValues) => Promise<boolean>;
  onCancel?: () => void;
}

interface WeekRange {
  min: string;
  max: string;
  label: string;
}

function getWeekRange(plan: WeeklyPlanDto | undefined): WeekRange | null {
  if (!plan) {
    return null;
  }
  const start = new Date(plan.weekStart);
  return { min: toDateKey(start), max: toDateKey(addDays(start, 6)), label: formatWeekRange(start) };
}

export function TodoForm({
  plans,
  initial,
  defaultPlanId = null,
  lockPlan = false,
  submitLabel,
  onSubmit,
  onCancel,
}: TodoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ? toDateKey(new Date(initial.date)) : '');
  const [weeklyPlanId, setWeeklyPlanId] = useState(initial ? (initial.weeklyPlanId ?? '') : (defaultPlanId ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans.find(function matchPlan(plan) {
    return plan.id === weeklyPlanId;
  });
  const range = getWeekRange(selectedPlan);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('제목을 입력하세요.');
      return;
    }
    if (range && date && (date < range.min || date > range.max)) {
      setError(`날짜는 연결된 주간 계획의 주(${range.label}) 안이어야 합니다.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    const ok = await onSubmit({
      title: trimmed,
      description,
      date: date || null,
      weeklyPlanId: weeklyPlanId || null,
    });
    setSubmitting(false);
    if (ok && !initial) {
      setTitle('');
      setDescription('');
      setDate('');
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-label={submitLabel}>
      <label>
        제목
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="할 일 제목" />
      </label>
      <label>
        설명
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="선택" />
      </label>
      <label>
        날짜
        <input
          type="date"
          value={date}
          min={range?.min}
          max={range?.max}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      {!lockPlan && (
        <label>
          주간 계획
          <select value={weeklyPlanId} onChange={(event) => setWeeklyPlanId(event.target.value)}>
            <option value="">미연결</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {formatWeekRange(new Date(plan.weekStart))} · {plan.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
        )}
      </div>
      <ErrorMessage message={error} />
    </form>
  );
}
