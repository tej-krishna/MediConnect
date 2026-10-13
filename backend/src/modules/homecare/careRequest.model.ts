import { Schema, model, Types, type HydratedDocument } from 'mongoose';
import { OFFERING_TYPES } from './careOffering.model';

export const CARE_REQUEST_STATUSES = [
  'requested',
  'confirmed',
  'fulfilled',
  'returned',
  'completed',
  'cancelled',
] as const;

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, enum: CARE_REQUEST_STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, required: true, default: () => new Date() },
    note: { type: String, trim: true },
  },
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

const careRequestSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    offeringId: { type: Schema.Types.ObjectId, ref: 'CareOffering', required: true },
    offeringType: { type: String, enum: OFFERING_TYPES, required: true },
    offeringNameSnapshot: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPriceSnapshot: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    preferredDate: { type: Date, required: true },
    expectedReturnDate: { type: Date, default: null },
    deliveryAddress: { type: addressSchema, required: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: CARE_REQUEST_STATUSES, required: true, default: 'requested' },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);

careRequestSchema.index({ providerId: 1, status: 1 });
careRequestSchema.index({ patientId: 1, status: 1 });

export interface CareRequestAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  providerId: Types.ObjectId;
  offeringId: Types.ObjectId;
  offeringType: (typeof OFFERING_TYPES)[number];
  offeringNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  totalAmount: number;
  preferredDate: Date;
  expectedReturnDate: Date | null;
  deliveryAddress: { line1: string; city: string; state: string; postalCode: string };
  notes?: string;
  status: (typeof CARE_REQUEST_STATUSES)[number];
  statusHistory: Array<{ status: string; changedBy: Types.ObjectId; changedAt: Date; note?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export type CareRequestDoc = HydratedDocument<CareRequestAttrs>;

export const CareRequest = model<CareRequestAttrs>('CareRequest', careRequestSchema);
