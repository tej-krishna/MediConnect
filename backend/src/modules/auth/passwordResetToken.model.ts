import { Schema, model, Types } from 'mongoose';

const passwordResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: () => new Date() },
});

export interface PasswordResetTokenDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export const PasswordResetToken = model<PasswordResetTokenDoc>(
  'PasswordResetToken',
  passwordResetTokenSchema,
);
