import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current';
import { handleRouteError, readJsonBody, type IdRouteContext } from '@/lib/http';
import { parseInput, parseObjectId } from '@/schemas/common';
import { updateWeeklyPlanSchema } from '@/schemas/weeklyPlan';
import { deleteWeeklyPlan, getWeeklyPlan, updateWeeklyPlan } from '@/services/weeklyPlanService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    return NextResponse.json(await getWeeklyPlan(parseObjectId(params.id, 'id')));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    const id = parseObjectId(params.id, 'id');
    const input = parseInput(updateWeeklyPlanSchema, await readJsonBody(request));
    return NextResponse.json(await updateWeeklyPlan(id, input));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    await deleteWeeklyPlan(parseObjectId(params.id, 'id'));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
