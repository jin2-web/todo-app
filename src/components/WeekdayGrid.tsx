import { WEEKDAY_LABELS, addDays, getWeekdayIndex, toDateKey } from '@/lib/week';
import { TODO_STATUS_LABELS, type TodoDto } from '@/types/domain';

interface WeekdayGridProps {
  weekStart: string;
  todos: TodoDto[];
}

function TodoChip({ todo }: { todo: TodoDto }) {
  return (
    <li className={`chip status-${todo.status}`}>
      <span>{todo.title}</span>
      <span className="badge">{TODO_STATUS_LABELS[todo.status]}</span>
    </li>
  );
}

/** Todos placed by weekday (Mon–Sun, KST); undated todos go to the "미배치" area. */
export function WeekdayGrid({ weekStart, todos }: WeekdayGridProps) {
  const start = new Date(weekStart);
  const byDay: TodoDto[][] = WEEKDAY_LABELS.map(function emptyDay() {
    return [];
  });
  const unscheduled: TodoDto[] = [];
  for (const todo of todos) {
    if (todo.date) {
      byDay[getWeekdayIndex(new Date(todo.date))].push(todo);
    } else {
      unscheduled.push(todo);
    }
  }

  return (
    <div className="weekday-wrapper">
      <div className="weekday-grid">
        {WEEKDAY_LABELS.map((label, index) => (
          <section key={label} className="weekday" aria-label={`${label}요일`}>
            <h4>
              {label} <span className="muted">{toDateKey(addDays(start, index)).slice(5)}</span>
            </h4>
            <ul>
              {byDay[index].map((todo) => (
                <TodoChip key={todo.id} todo={todo} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="unscheduled" aria-label="미배치">
        <h4>미배치</h4>
        {unscheduled.length === 0 ? (
          <p className="muted">없음</p>
        ) : (
          <ul>
            {unscheduled.map((todo) => (
              <TodoChip key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
