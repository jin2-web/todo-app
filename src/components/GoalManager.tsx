'use client';

import { useState, type FormEvent } from 'react';
import { useMutationRefresh } from '@/hooks/useMutationRefresh';
import { createGoal, deleteGoal, updateGoal } from '@/lib/apiClient';
import type { GoalDto } from '@/types/domain';
import { ErrorMessage } from './ErrorMessage';

interface GoalFormValues {
  title: string;
  description: string;
  year: number;
}

interface GoalFormProps {
  initial?: GoalDto;
  defaultYear: number;
  submitLabel: string;
  onSubmit: (values: GoalFormValues) => Promise<boolean>;
  onCancel?: () => void;
}

function GoalForm({ initial, defaultYear, submitLabel, onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [year, setYear] = useState(String(initial?.year ?? defaultYear));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear)) {
      setError('연도를 숫자로 입력하세요.');
      return;
    }
    setError(null);
    const ok = await onSubmit({ title: title.trim(), description, year: parsedYear });
    if (ok && !initial) {
      setTitle('');
      setDescription('');
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-label={submitLabel}>
      <label>
        제목
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="1년 목표" />
      </label>
      <label>
        연도
        <input type="number" value={year} onChange={(event) => setYear(event.target.value)} />
      </label>
      <label className="wide">
        설명
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
      </label>
      <div className="form-actions">
        <button type="submit">{submitLabel}</button>
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

interface GoalManagerProps {
  goals: GoalDto[];
  currentYear: number;
}

export function GoalManager({ goals, currentYear }: GoalManagerProps) {
  const mutation = useMutationRefresh();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleCreate(values: GoalFormValues): Promise<boolean> {
    return mutation.run(function create() {
      return createGoal(values);
    });
  }

  async function handleUpdate(id: string, values: GoalFormValues): Promise<boolean> {
    const ok = await mutation.run(function update() {
      return updateGoal(id, values);
    });
    if (ok) {
      setEditingId(null);
    }
    return ok;
  }

  function handleDelete(goal: GoalDto) {
    if (!window.confirm(`'${goal.title}' 목표를 삭제할까요? 연결된 주간 계획은 남고 연결만 해제됩니다.`)) {
      return;
    }
    void mutation.run(function remove() {
      return deleteGoal(goal.id);
    });
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>새 1년 목표</h2>
        <GoalForm defaultYear={currentYear} submitLabel="추가" onSubmit={handleCreate} />
      </section>
      <ErrorMessage message={mutation.error} />

      {goals.length === 0 && <p className="empty">아직 1년 목표가 없습니다.</p>}
      {goals.map((goal) => (
        <article key={goal.id} className="panel" aria-label={`목표 ${goal.title}`}>
          {editingId === goal.id ? (
            <GoalForm
              initial={goal}
              defaultYear={currentYear}
              submitLabel="저장"
              onSubmit={(values) => handleUpdate(goal.id, values)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="plan-header">
              <div>
                <h3>
                  <span className="badge">{goal.year}</span> {goal.title}
                </h3>
                {goal.description && <p className="muted">{goal.description}</p>}
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setEditingId(goal.id)}>
                  수정
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(goal)}>
                  삭제
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
