import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface SessionRecord {
  _id: Types.ObjectId;
  /** SHA-256 of the cookie token; the raw token is never stored. */
  tokenHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionRecord>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // TTL index: MongoDB removes the document once expiresAt passes.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

export const SessionModel: Model<SessionRecord> =
  (models.Session as Model<SessionRecord> | undefined) ?? model<SessionRecord>('Session', sessionSchema);
