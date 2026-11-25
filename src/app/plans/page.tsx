import Link from 'next/link';
import { WeeklyPlanner } from '@/components/WeeklyPlanner';
import { requirePageUser } from '@/lib/auth/current';
import { addDays, formatWeekRange, getWeekStart, parseDateInput, toDateKey } from '@/lib/week';
import { listGoals } from '@/services/goalService';
import { listTodos } from '@/services/todoService';
import { listWeeklyPlans } from '@/services/weeklyPlanService';
import type { TodoDto } from '@/types/domain';

export const dynamic = 'force-dynamic';

interface PlansPageProps {
  searchParams: { week?: string };
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const user = await requirePageUser();
  const requested = searchParams.week ? parseDateInput(searchParams.week) : null;
  const weekStart = getWeekStart(requested ?? new Date());
  const [plans, goals] = await Promise.all([listWeeklyPlans(weekStart), listGoals()]);
  const todoLists = await Promise.all(plans.map((plan) => listTodos({ weeklyPlanId: plan.id }, user.id)));
  const todos: TodoDto[] = todoLists.flat();

  return (
    <div className="stack">
      <header className="page-header">
        <h1>주간 계획</h1>
        <nav className="week-nav" aria-label="주 이동">
          <Link href={`/plans?week=${toDateKey(addDays(weekStart, -7))}`}>← 이전 주</Link>
          <strong>{formatWeekRange(weekStart)}</strong>
          <Link href={`/plans?week=${toDateKey(addDays(weekStart, 7))}`}>다음 주 →</Link>
          <Link href="/plans">이번 주</Link>
        </nav>
      </header>
      <WeeklyPlanner weekStart={weekStart.toISOString()} plans={plans} todos={todos} goals={goals} />
    </div>
  );
}
