import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current';
import { handleRouteError, readJsonBody } from '@/lib/http';
import { parseInput } from '@/schemas/common';
import { createGoalSchema } from '@/schemas/goal';
import { createGoal, listGoals } from '@/services/goalService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    return NextResponse.json(await listGoals());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    const input = parseInput(createGoalSchema, await readJsonBody(request));
    return NextResponse.json(await createGoal(input), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
