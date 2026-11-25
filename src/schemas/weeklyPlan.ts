import { z } from 'zod';
import { EMPTY_UPDATE_MESSAGE, dateInputSchema, hasAtLeastOneField, objectIdSchema, titleSchema } from './common';

export const createWeeklyPlanSchema = z.object({
  title: titleSchema,
  /** Any date inside the target week; normalized to Monday 00:00 KST by the service. */
  weekStart: dateInputSchema,
  goalId: objectIdSchema.nullable().optional(),
});

export const updateWeeklyPlanSchema = z
  .object({
    title: titleSchema.optional(),
    weekStart: dateInputSchema.optional(),
    goalId: objectIdSchema.nullable().optional(),
  })
  .refine(hasAtLeastOneField, EMPTY_UPDATE_MESSAGE);

export const weeklyPlanQuerySchema = z.object({
  week: dateInputSchema.optional(),
});

export type CreateWeeklyPlanInput = z.output<typeof createWeeklyPlanSchema>;
export type UpdateWeeklyPlanInput = z.output<typeof updateWeeklyPlanSchema>;
