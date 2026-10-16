import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES } from '../../config/roles';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional: a Google-only account (created via Google sign-in, never given a password) has no
    // passwordHash. auth.service.ts's password-login path checks for this and rejects with a clear
    // "use Google sign-in" error rather than crashing on bcrypt.compare(password, undefined).
    passwordHash: { type: String, required: false },
    // Sparse so multiple password-only accounts (no googleId) don't collide on a shared `null`
    // under a plain unique index.
    googleId: { type: String, required: false, unique: true, sparse: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    roles: {
      type: [String],
      enum: ROLES,
      default: ['patient'],
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: 'A user must have at least one role',
      },
    },
    status: {
      type: String,
      enum: ['active', 'locked', 'suspended'],
      default: 'active',
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model('User', userSchema);
