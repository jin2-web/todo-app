import { getWeekStart } from '@/lib/week';
import type { DashboardDto } from '@/types/domain';
import { listWeeklyPlans } from './weeklyPlanService';

/** This week's (Monday-start, KST) plans with their progress. */
export async function getDashboard(now: Date = new Date()): Promise<DashboardDto> {
  const weekStart = getWeekStart(now);
  const plans = await listWeeklyPlans(weekStart);
  return { weekStart: weekStart.toISOString(), plans };
}
