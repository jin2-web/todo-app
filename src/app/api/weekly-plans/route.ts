import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current';
import { handleRouteError, readJsonBody, readSearchParams } from '@/lib/http';
import { parseInput } from '@/schemas/common';
import { createWeeklyPlanSchema, weeklyPlanQuerySchema } from '@/schemas/weeklyPlan';
import { createWeeklyPlan, listWeeklyPlans } from '@/services/weeklyPlanService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    const query = parseInput(weeklyPlanQuerySchema, readSearchParams(request));
    return NextResponse.json(await listWeeklyPlans(query.week));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    const input = parseInput(createWeeklyPlanSchema, await readJsonBody(request));
    return NextResponse.json(await createWeeklyPlan(input), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
