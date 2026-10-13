import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const TRANSACTION_TYPES = ['refund'] as const;
export const TRANSACTION_STATUSES = ['pending_manual_review', 'completed', 'rejected'] as const;

const transactionSchema = new Schema(
  {
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, required: true, default: 'pending_manual_review', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    supportTicketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
    provider: { type: String, required: true, default: 'manual' },
    providerReference: { type: String, default: null },
    settledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    settledAt: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export interface TransactionAttrs {
  _id: Types.ObjectId;
  type: (typeof TRANSACTION_TYPES)[number];
  status: (typeof TRANSACTION_STATUSES)[number];
  patientId: Types.ObjectId;
  amount: number;
  currency: string;
  supportTicketId: Types.ObjectId;
  provider: string;
  providerReference: string | null;
  settledBy: Types.ObjectId | null;
  settledAt: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionDoc = HydratedDocument<TransactionAttrs>;

export const Transaction = model<TransactionAttrs>('Transaction', transactionSchema);
