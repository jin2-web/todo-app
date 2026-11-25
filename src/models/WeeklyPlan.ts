import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface WeeklyPlanRecord {
  _id: Types.ObjectId;
  title: string;
  /** Monday 00:00 KST of the plan's week. */
  weekStart: Date;
  goalId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyPlanSchema = new Schema<WeeklyPlanRecord>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    weekStart: { type: Date, required: true, index: true },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal', index: true },
  },
  { timestamps: true },
);

export const WeeklyPlanModel: Model<WeeklyPlanRecord> =
  (models.WeeklyPlan as Model<WeeklyPlanRecord> | undefined) ??
  model<WeeklyPlanRecord>('WeeklyPlan', weeklyPlanSchema);
