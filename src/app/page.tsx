import Link from 'next/link';
import { ProgressBar } from '@/components/ProgressBar';
import { requirePageUser } from '@/lib/auth/current';
import { formatWeekRange } from '@/lib/week';
import { getDashboard } from '@/services/dashboardService';
import { listGoals } from '@/services/goalService';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requirePageUser();
  const [dashboard, goals] = await Promise.all([getDashboard(), listGoals()]);
  const goalTitles = new Map(goals.map((goal) => [goal.id, goal.title]));

  return (
    <div className="stack">
      <header className="page-header">
        <h1>이번 주</h1>
        <p className="muted">{formatWeekRange(new Date(dashboard.weekStart))}</p>
      </header>

      {dashboard.plans.length === 0 ? (
        <section className="panel">
          <p>이번 주 계획이 없습니다.</p>
          <Link href="/plans">주간 계획 만들기 →</Link>
        </section>
      ) : (
        <ul className="plan-list" aria-label="이번 주 계획 목록">
          {dashboard.plans.map((plan) => (
            <li key={plan.id} className="panel">
              <div className="plan-header">
                <h2>{plan.title}</h2>
                <span className="meta">
                  {plan.goalId ? `목표: ${goalTitles.get(plan.goalId) ?? '-'}` : '목표 미연결'}
                </span>
              </div>
              <ProgressBar value={plan.progress} label={`${plan.title} 진행률`} />
              <p className="meta">
                완료 {plan.doneTodos} / 전체 {plan.totalTodos}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
