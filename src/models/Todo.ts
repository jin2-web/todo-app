import { Schema, model, models, type Model, type Types } from 'mongoose';
import { TODO_STATUSES, type TodoStatus } from '@/types/domain';

export interface TodoRecord {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date?: Date | null;
  status: TodoStatus;
  weeklyPlanId?: Types.ObjectId | null;
  /** Owner. Missing only on todos created before login existed (see scripts/migrate-todo-owner.ts). */
  userId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new Schema<TodoRecord>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    date: { type: Date },
    status: { type: String, enum: TODO_STATUSES, default: 'todo', required: true, index: true },
    weeklyPlanId: { type: Schema.Types.ObjectId, ref: 'WeeklyPlan', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
);

export const TodoModel: Model<TodoRecord> =
  (models.Todo as Model<TodoRecord> | undefined) ?? model<TodoRecord>('Todo', todoSchema);
