import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current';
import { handleRouteError, readJsonBody, type IdRouteContext } from '@/lib/http';
import { parseInput, parseObjectId } from '@/schemas/common';
import { updateGoalSchema } from '@/schemas/goal';
import { deleteGoal, getGoal, updateGoal } from '@/services/goalService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    return NextResponse.json(await getGoal(parseObjectId(params.id, 'id')));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    const id = parseObjectId(params.id, 'id');
    const input = parseInput(updateGoalSchema, await readJsonBody(request));
    return NextResponse.json(await updateGoal(id, input));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    await deleteGoal(parseObjectId(params.id, 'id'));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
