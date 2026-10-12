import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const providerStaffSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['invited', 'active', 'removed'], default: 'invited' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedAt: { type: Date, default: () => new Date() },
    acceptedAt: { type: Date, default: null },
    removedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A user can have at most one non-removed membership record per provider.
providerStaffSchema.index(
  { providerId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['invited', 'active'] } } },
);

export interface ProviderStaffAttrs {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  userId: Types.ObjectId;
  status: 'invited' | 'active' | 'removed';
  invitedBy: Types.ObjectId;
  invitedAt: Date;
  acceptedAt: Date | null;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderStaffDoc = HydratedDocument<ProviderStaffAttrs>;

export const ProviderStaff = model<ProviderStaffAttrs>('ProviderStaff', providerStaffSchema);
