import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface UserRecord {
  _id: Types.ObjectId;
  /** GitHub numeric user id — stable even if the username changes. */
  githubId: number;
  /** GitHub `login`. */
  username: string;
  /** GitHub `avatar_url`. */
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    githubId: { type: Number, required: true, unique: true },
    username: { type: String, required: true, index: true },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true },
);

export const UserModel: Model<UserRecord> =
  (models.User as Model<UserRecord> | undefined) ?? model<UserRecord>('User', userSchema);
