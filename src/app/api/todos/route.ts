import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current';
import { handleRouteError, readJsonBody, readSearchParams } from '@/lib/http';
import { parseInput } from '@/schemas/common';
import { createTodoSchema, todoQuerySchema } from '@/schemas/todo';
import { createTodo, listTodos } from '@/services/todoService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireApiUser(request);
    const query = parseInput(todoQuerySchema, readSearchParams(request));
    return NextResponse.json(await listTodos(query, user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireApiUser(request);
    const input = parseInput(createTodoSchema, await readJsonBody(request));
    return NextResponse.json(await createTodo(input, user.id), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
