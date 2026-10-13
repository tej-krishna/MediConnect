import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const DIAGNOSTIC_ORDER_STATUSES = [
  'requested',
  'scheduled',
  'sample_collected',
  'processing',
  'report_ready',
  'cancelled',
] as const;

const testLineSchema = new Schema(
  { testId: { type: Schema.Types.ObjectId, ref: 'DiagnosticTest', required: true }, name: String, price: Number },
  { _id: false },
);

const addressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, enum: DIAGNOSTIC_ORDER_STATUSES, required: true },
    changedAt: { type: Date, default: () => new Date() },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const diagnosticOrderSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    labId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    tests: { type: [testLineSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    collectionMethod: { type: String, enum: ['at_lab', 'home_collection'], required: true },
    homeAddress: { type: addressSchema, default: null },
    preferredDateTime: { type: Date, required: true },
    confirmedDateTime: { type: Date, default: null },
    assignedCollector: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: DIAGNOSTIC_ORDER_STATUSES, default: 'requested', index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    reportDocument: {
      storageKey: { type: String },
      originalFilename: { type: String },
      mimeType: { type: String },
      uploadedAt: { type: Date },
    },
  },
  { timestamps: true },
);

export interface DiagnosticOrderAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  labId: Types.ObjectId;
  tests: { testId: Types.ObjectId; name: string; price: number }[];
  totalAmount: number;
  collectionMethod: 'at_lab' | 'home_collection';
  homeAddress: { line1: string; city: string; state: string; postalCode: string } | null;
  preferredDateTime: Date;
  confirmedDateTime: Date | null;
  assignedCollector: Types.ObjectId | null;
  status: (typeof DIAGNOSTIC_ORDER_STATUSES)[number];
  statusHistory: { status: string; changedAt: Date; changedBy: Types.ObjectId | null }[];
  reportDocument: { storageKey: string; originalFilename: string; mimeType: string; uploadedAt: Date } | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DiagnosticOrderDoc = HydratedDocument<DiagnosticOrderAttrs>;

export const DiagnosticOrder = model<DiagnosticOrderAttrs>('DiagnosticOrder', diagnosticOrderSchema);
