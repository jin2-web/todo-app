'use client';

import { useDraggable } from '@dnd-kit/core';
import { toDateKey } from '@/lib/week';
import { TODO_STATUSES, TODO_STATUS_LABELS, type TodoDto, type TodoStatus } from '@/types/domain';

interface TodoCardProps {
  todo: TodoDto;
  planTitle: string | null;
  onMove: (todoId: string, status: TodoStatus) => void;
  onEdit: (todo: TodoDto) => void;
  onDelete: (todo: TodoDto) => void;
}

export function TodoCard({ todo, planTitle, onMove, onEdit, onDelete }: TodoCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card todo-card${isDragging ? ' dragging' : ''}`}
      data-testid={`todo-${todo.id}`}
    >
      <div className="todo-card-header">
        <button type="button" className="drag-handle" aria-label={`${todo.title} 끌어서 이동`} {...listeners} {...attributes}>
          ⠿
        </button>
        <h3>{todo.title}</h3>
      </div>
      {todo.description && <p className="muted">{todo.description}</p>}
      <p className="meta">
        {todo.date ? toDateKey(new Date(todo.date)) : '날짜 없음'} · {planTitle ?? '미연결'}
      </p>
      <div className="todo-card-actions">
        <label className="sr-only" htmlFor={`status-${todo.id}`}>
          {todo.title} 상태
        </label>
        <select
          id={`status-${todo.id}`}
          value={todo.status}
          onChange={(event) => onMove(todo.id, event.target.value as TodoStatus)}
        >
          {TODO_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TODO_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button type="button" className="secondary" onClick={() => onEdit(todo)}>
          수정
        </button>
        <button type="button" className="danger" onClick={() => onDelete(todo)}>
          삭제
        </button>
      </div>
    </article>
  );
}
