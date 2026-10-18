import { Schema, model, Types, type HydratedDocument } from 'mongoose';
import { PROVIDER_TYPES, APPLICATION_STATUSES } from './provider.types';

const addressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'India' },
  },
  { _id: false },
);

const documentSchema = new Schema(
  {
    documentType: { type: String, required: true, trim: true },
    storageKey: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    changedAt: { type: Date, default: () => new Date() },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, default: null },
  },
  { _id: false },
);

const reportSchema = new Schema(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    reportedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const providerApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    organizationName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    issuingAuthority: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    address: { type: addressSchema, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },
    consultationFee: { type: Number, default: null, min: 0 },
    operatingHoursNote: { type: String, default: null, trim: true, maxlength: 200 },
    isCurrentlyAvailable: { type: Boolean, default: null },
    // Doctor/clinic only — gate whether patients can request each visit type from this provider
    // (see consultation.service.ts's requestConsultation). null/false both mean "not offered."
    acceptsOnlineConsultations: { type: Boolean, default: null },
    acceptsHomeVisits: { type: Boolean, default: null },
    // Doctor/clinic only — starts at 100, multiplied by 0.85 every 2nd reported no-show (see
    // consultation.service.ts's applyNoShowPenalty), which also resets noShowWarningCount to 0.
    reliabilityRating: { type: Number, default: 100, min: 0, max: 100 },
    noShowWarningCount: { type: Number, default: 0, min: 0 },
    // Shape varies by providerType (see provider.validation.ts's discriminated union) — a doctor's
    // specialization, a hospital's bed count, an NGO's registration type, etc. Stored loosely since
    // Mongoose has no first-class polymorphic-by-sibling-field embedding; the zod schema at the API
    // boundary is what actually enforces the right shape for each type.
    typeDetails: { type: Schema.Types.Mixed, default: {} },
    documents: { type: [documentSchema], default: [] },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'draft', index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    suspensionReason: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    flagged: { type: Boolean, default: false },
    flagReasons: { type: [String], default: [] },
    reports: { type: [reportSchema], default: [] },
  },
  { timestamps: true },
);

providerApplicationSchema.index({ providerType: 1, registrationNumber: 1 });
providerApplicationSchema.index({ location: '2dsphere' });

export interface ProviderDocumentSubdoc {
  _id: Types.ObjectId;
  documentType: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export interface ProviderApplicationAttrs {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  providerType: string;
  organizationName: string;
  registrationNumber: string;
  issuingAuthority: string;
  contactPhone: string;
  contactEmail: string;
  address: { line1: string; city: string; state: string; postalCode: string; country: string };
  location?: { type: 'Point'; coordinates: [number, number] } | null;
  consultationFee: number | null;
  operatingHoursNote: string | null;
  isCurrentlyAvailable: boolean | null;
  acceptsOnlineConsultations: boolean | null;
  acceptsHomeVisits: boolean | null;
  reliabilityRating: number;
  noShowWarningCount: number;
  typeDetails: Record<string, unknown>;
  documents: Types.DocumentArray<ProviderDocumentSubdoc>;
  status: string;
  statusHistory: { status: string; changedAt: Date; changedBy: Types.ObjectId | null; reason: string | null }[];
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  flagged: boolean;
  flagReasons: string[];
  reports: { reportedBy: Types.ObjectId; reason: string; reportedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderApplicationDoc = HydratedDocument<ProviderApplicationAttrs>;

export const ProviderApplication = model<ProviderApplicationAttrs>(
  'ProviderApplication',
  providerApplicationSchema,
);
