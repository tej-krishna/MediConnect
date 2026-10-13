import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const diagnosticTestSchema = new Schema(
  {
    labId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    sampleType: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    turnaroundHours: { type: Number, required: true, min: 1 },
    homeCollectionAvailable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

diagnosticTestSchema.index({ name: 'text', category: 'text' });

export interface DiagnosticTestAttrs {
  _id: Types.ObjectId;
  labId: Types.ObjectId;
  name: string;
  category: string;
  sampleType: string;
  price: number;
  turnaroundHours: number;
  homeCollectionAvailable: boolean;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type DiagnosticTestDoc = HydratedDocument<DiagnosticTestAttrs>;

export const DiagnosticTest = model<DiagnosticTestAttrs>('DiagnosticTest', diagnosticTestSchema);
