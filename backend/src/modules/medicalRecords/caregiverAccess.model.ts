import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const ACCESS_SCOPES = ['view_profile', 'view_documents', 'view_visits', 'manage_profile'] as const;

const caregiverAccessSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caregiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scopes: { type: [String], enum: ACCESS_SCOPES, required: true },
    status: { type: String, enum: ['pending', 'active', 'declined', 'revoked'], default: 'pending' },
    expiresAt: { type: Date, default: null },
    invitedAt: { type: Date, default: () => new Date() },
    respondedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A patient can have at most one non-terminal grant per caregiver at a time.
caregiverAccessSchema.index(
  { patientId: 1, caregiverId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'active'] } } },
);

export interface CaregiverAccessAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  caregiverId: Types.ObjectId;
  scopes: (typeof ACCESS_SCOPES)[number][];
  status: 'pending' | 'active' | 'declined' | 'revoked';
  expiresAt: Date | null;
  invitedAt: Date;
  respondedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CaregiverAccessDoc = HydratedDocument<CaregiverAccessAttrs>;

export const CaregiverAccess = model<CaregiverAccessAttrs>('CaregiverAccess', caregiverAccessSchema);
