import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const visitRecordSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitDate: { type: Date, required: true },
    reasonForVisit: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

export interface VisitRecordAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  createdBy: Types.ObjectId;
  visitDate: Date;
  reasonForVisit: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VisitRecordDoc = HydratedDocument<VisitRecordAttrs>;

export const VisitRecord = model<VisitRecordAttrs>('VisitRecord', visitRecordSchema);
