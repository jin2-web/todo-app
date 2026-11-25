import { GoalManager } from '@/components/GoalManager';
import { requirePageUser } from '@/lib/auth/current';
import { toDateKey } from '@/lib/week';
import { listGoals } from '@/services/goalService';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  await requirePageUser();
  const goals = await listGoals();
  const currentYear = Number(toDateKey(new Date()).slice(0, 4));
  return (
    <div className="stack">
      <header className="page-header">
        <h1>1년 목표</h1>
      </header>
      <GoalManager goals={goals} currentYear={currentYear} />
    </div>
  );
}
