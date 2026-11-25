import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import type { ApiErrorBody } from '@/types/domain';
import { AppError, ValidationError } from './errors';
import { logger } from './logger';

function errorResponse(status: number, code: string, message: string): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Maps thrown errors to the `{ error: { code, message } }` response shape. */
export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof AppError) {
    if (error.status >= 500) {
      logger.error('Request failed', { error });
    }
    return errorResponse(error.status, error.code, error.message);
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return errorResponse(400, 'VALIDATION_ERROR', error.message);
  }
  logger.error('Unhandled route error', { error });
  return errorResponse(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('요청 본문이 올바른 JSON이 아닙니다.');
  }
}

/** Query string → plain object; empty values are dropped. */
export function readSearchParams(request: Request): Record<string, string> {
  const result: Record<string, string> = {};
  new URL(request.url).searchParams.forEach(function collect(value, key) {
    if (value !== '') {
      result[key] = value;
    }
  });
  return result;
}

export interface IdRouteContext {
  params: { id: string };
}
