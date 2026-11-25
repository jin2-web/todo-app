'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMutationRefresh } from '@/hooks/useMutationRefresh';
import { createTodo, deleteTodo, updateTodo } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errors';
import { TODO_STATUSES, type TodoDto, type TodoStatus, type WeeklyPlanDto } from '@/types/domain';
import { ErrorMessage } from './ErrorMessage';
import { KanbanColumn } from './KanbanColumn';
import { TodoCard } from './TodoCard';
import { TodoForm, type TodoFormValues } from './TodoForm';

interface KanbanBoardProps {
  todos: TodoDto[];
  plans: WeeklyPlanDto[];
}

const ALL = 'all';
const UNLINKED = 'unlinked';

function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === 'string' && (TODO_STATUSES as readonly string[]).includes(value);
}

function withStatus(todos: TodoDto[], todoId: string, status: TodoStatus): TodoDto[] {
  return todos.map(function applyStatus(todo) {
    return todo.id === todoId ? { ...todo, status } : todo;
  });
}

export function KanbanBoard({ todos, plans }: KanbanBoardProps) {
  const router = useRouter();
  const mutation = useMutationRefresh();
  const [items, setItems] = useState(todos);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TodoDto | null>(null);
  const [filter, setFilter] = useState(ALL);
  const requestCounter = useRef(0);
  const latestRequest = useRef<Record<string, number>>({});

  useEffect(
    function syncFromServer() {
      setItems(todos);
    },
    [todos],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const planTitles = new Map(
    plans.map(function toEntry(plan): [string, string] {
      return [plan.id, plan.title];
    }),
  );

  /** Optimistic move: update UI first, persist, roll back to the original column on failure. */
  async function moveTodo(todoId: string, nextStatus: TodoStatus) {
    const current = items.find(function matchTodo(todo) {
      return todo.id === todoId;
    });
    if (!current || current.status === nextStatus) {
      return;
    }
    const previousStatus = current.status;
    requestCounter.current += 1;
    const requestId = requestCounter.current;
    latestRequest.current[todoId] = requestId;

    setMoveError(null);
    setItems(function optimistic(prev) {
      return withStatus(prev, todoId, nextStatus);
    });
    try {
      await updateTodo(todoId, { status: nextStatus });
      if (latestRequest.current[todoId] === requestId) {
        router.refresh();
      }
    } catch (error) {
      // Only the latest request for a card may roll it back; older responses are stale.
      if (latestRequest.current[todoId] === requestId) {
        setItems(function rollback(prev) {
          return withStatus(prev, todoId, previousStatus);
        });
        setMoveError(`'${current.title}' 상태를 저장하지 못해 원래 컬럼으로 되돌렸습니다. (${getErrorMessage(error)})`);
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const status = event.over?.id;
    if (isTodoStatus(status)) {
      void moveTodo(String(event.active.id), status);
    }
  }

  function handleCreate(values: TodoFormValues): Promise<boolean> {
    return mutation.run(function create() {
      return createTodo(values);
    });
  }

  async function handleEdit(values: TodoFormValues): Promise<boolean> {
    if (!editing) {
      return false;
    }
    const target = editing;
    const ok = await mutation.run(function update() {
      return updateTodo(target.id, values);
    });
    if (ok) {
      setEditing(null);
    }
    return ok;
  }

  function handleDelete(todo: TodoDto) {
    if (!window.confirm(`'${todo.title}' 할 일을 삭제할까요?`)) {
      return;
    }
    void mutation.run(function remove() {
      return deleteTodo(todo.id);
    });
  }

  const visible = items.filter(function matchFilter(todo) {
    if (filter === ALL) {
      return true;
    }
    if (filter === UNLINKED) {
      return todo.weeklyPlanId === null;
    }
    return todo.weeklyPlanId === filter;
  });

  return (
    <div className="stack">
      <section className="panel">
        <h2>{editing ? '할 일 수정' : '새 할 일'}</h2>
        {editing ? (
          <TodoForm
            key={editing.id}
            plans={plans}
            initial={editing}
            submitLabel="저장"
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <TodoForm plans={plans} submitLabel="추가" onSubmit={handleCreate} />
        )}
        <ErrorMessage message={mutation.error} />
      </section>

      <div className="toolbar">
        <label>
          보기
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value={ALL}>전체</option>
            <option value={UNLINKED}>미연결</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorMessage message={moveError} />

      <DndContext id="kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="kanban">
          {TODO_STATUSES.map((status) => {
            const columnTodos = visible.filter((todo) => todo.status === status);
            return (
              <KanbanColumn key={status} status={status} count={columnTodos.length}>
                {columnTodos.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    planTitle={todo.weeklyPlanId ? (planTitles.get(todo.weeklyPlanId) ?? null) : null}
                    onMove={(todoId, nextStatus) => void moveTodo(todoId, nextStatus)}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                  />
                ))}
                {columnTodos.length === 0 && <p className="empty">비어 있음</p>}
              </KanbanColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
