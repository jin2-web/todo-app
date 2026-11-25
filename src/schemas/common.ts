import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import { parseDateInput } from '@/lib/week';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, '올바르지 않은 ID 형식입니다.');

function toDate(value: string, ctx: z.RefinementCtx): Date {
  const parsed = parseDateInput(value);
  if (!parsed) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '올바르지 않은 날짜 형식입니다.' });
    return z.NEVER;
  }
  return parsed;
}

/** Accepts `YYYY-MM-DD` (KST midnight) or an ISO 8601 instant. */
export const dateInputSchema = z.string().transform(toDate);

export const titleSchema = z
  .string({ required_error: '제목은 필수입니다.' })
  .trim()
  .min(1, '제목은 필수입니다.')
  .max(200, '제목은 200자 이하여야 합니다.');

export const descriptionSchema = z.string().max(2000, '설명은 2000자 이하여야 합니다.');

function formatIssue(issue: z.ZodIssue): string {
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Parses input with a zod schema, throwing ValidationError (400) on failure. */
export function parseInput<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues.map(formatIssue).join(', '));
  }
  return result.data;
}

export function parseObjectId(value: string, label: string): string {
  const result = objectIdSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(`${label}: 올바르지 않은 ID 형식입니다.`);
  }
  return result.data;
}

function isDefined(value: unknown): boolean {
  return value !== undefined;
}

/** For update schemas: at least one field must be present. */
export function hasAtLeastOneField(value: Record<string, unknown>): boolean {
  return Object.values(value).some(isDefined);
}

export const EMPTY_UPDATE_MESSAGE = '수정할 항목이 없습니다.';
