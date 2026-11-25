import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current';
import { handleRouteError, readJsonBody, type IdRouteContext } from '@/lib/http';
import { parseInput, parseObjectId } from '@/schemas/common';
import { updateTodoSchema } from '@/schemas/todo';
import { assertTodoOwner, deleteTodo, getTodo, updateTodo } from '@/services/todoService';

export const dynamic = 'force-dynamic';

/** Logged in + owns the todo; otherwise 401 / 404. */
async function authorize(request: Request, rawId: string): Promise<string> {
  const user = await requireApiUser(request);
  const id = parseObjectId(rawId, 'id');
  await assertTodoOwner(id, user.id);
  return id;
}

export async function GET(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    const id = await authorize(request, params.id);
    return NextResponse.json(await getTodo(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    const id = await authorize(request, params.id);
    const input = parseInput(updateTodoSchema, await readJsonBody(request));
    return NextResponse.json(await updateTodo(id, input));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: IdRouteContext): Promise<NextResponse> {
  try {
    const id = await authorize(request, params.id);
    await deleteTodo(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
