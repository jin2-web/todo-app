'use client';

import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { TODO_STATUS_LABELS, type TodoStatus } from '@/types/domain';

interface KanbanColumnProps {
  status: TodoStatus;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ status, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`kanban-column${isOver ? ' over' : ''}`}
      aria-label={`${TODO_STATUS_LABELS[status]} 컬럼`}
      data-testid={`column-${status}`}
    >
      <h2>
        {TODO_STATUS_LABELS[status]} <span className="count">{count}</span>
      </h2>
      <div className="kanban-cards">{children}</div>
    </section>
  );
}
