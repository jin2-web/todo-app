import { KanbanBoard } from '@/components/KanbanBoard';
import { requirePageUser } from '@/lib/auth/current';
import { listTodos } from '@/services/todoService';
import { listWeeklyPlans } from '@/services/weeklyPlanService';

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
  const user = await requirePageUser();
  const [todos, plans] = await Promise.all([listTodos({}, user.id), listWeeklyPlans()]);
  return (
    <div className="stack">
      <header className="page-header">
        <h1>칸반 보드</h1>
        <p className="muted">카드의 ⠿ 손잡이를 끌어 다른 컬럼에 놓거나, 상태 선택으로 이동하세요.</p>
      </header>
      <KanbanBoard todos={todos} plans={plans} />
    </div>
  );
}
