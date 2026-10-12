import { Schema, model, Types } from 'mongoose';

const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  replacedByHash: { type: String, default: null },
  userAgent: { type: String, default: null },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: () => new Date() },
});

export interface RefreshTokenDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByHash: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

export const RefreshToken = model<RefreshTokenDoc>('RefreshToken', refreshTokenSchema);
