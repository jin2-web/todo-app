import { z } from 'zod';
import { TODO_STATUSES } from '@/types/domain';
import {
  EMPTY_UPDATE_MESSAGE,
  dateInputSchema,
  descriptionSchema,
  hasAtLeastOneField,
  objectIdSchema,
  titleSchema,
} from './common';

const statusSchema = z.enum(TODO_STATUSES, {
  errorMap: function statusErrorMap() {
    return { message: `상태는 ${TODO_STATUSES.join(' / ')} 중 하나여야 합니다.` };
  },
});

export const createTodoSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  date: dateInputSchema.nullable().optional(),
  status: statusSchema.optional(),
  weeklyPlanId: objectIdSchema.nullable().optional(),
});

export const updateTodoSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    date: dateInputSchema.nullable().optional(),
    status: statusSchema.optional(),
    weeklyPlanId: objectIdSchema.nullable().optional(),
  })
  .refine(hasAtLeastOneField, EMPTY_UPDATE_MESSAGE);

export const todoQuerySchema = z.object({
  weeklyPlanId: objectIdSchema.optional(),
  status: statusSchema.optional(),
});

export type CreateTodoInput = z.output<typeof createTodoSchema>;
export type UpdateTodoInput = z.output<typeof updateTodoSchema>;
export type TodoQuery = z.output<typeof todoQuerySchema>;
