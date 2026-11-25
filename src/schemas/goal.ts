import { z } from 'zod';
import { EMPTY_UPDATE_MESSAGE, descriptionSchema, hasAtLeastOneField, titleSchema } from './common';

const yearSchema = z
  .number({ required_error: '연도는 필수입니다.', invalid_type_error: '연도는 숫자여야 합니다.' })
  .int('연도는 정수여야 합니다.')
  .min(2000, '연도는 2000 이상이어야 합니다.')
  .max(2100, '연도는 2100 이하여야 합니다.');

export const createGoalSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  year: yearSchema,
});

export const updateGoalSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    year: yearSchema.optional(),
  })
  .refine(hasAtLeastOneField, EMPTY_UPDATE_MESSAGE);

export type CreateGoalInput = z.output<typeof createGoalSchema>;
export type UpdateGoalInput = z.output<typeof updateGoalSchema>;
