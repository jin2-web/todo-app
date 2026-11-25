import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface GoalRecord {
  _id: Types.ObjectId;
  title: string;
  description: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<GoalRecord>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    year: { type: Number, required: true, min: 2000, max: 2100 },
  },
  { timestamps: true },
);

export const GoalModel: Model<GoalRecord> =
  (models.Goal as Model<GoalRecord> | undefined) ?? model<GoalRecord>('Goal', goalSchema);
