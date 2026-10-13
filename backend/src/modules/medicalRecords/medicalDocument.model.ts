import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const DOCUMENT_TYPES = ['prescription', 'diagnostic_report', 'discharge_summary', 'other'] as const;

const medicalDocumentSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    visitDate: { type: Date, default: null },
    storageKey: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: true },
);

export interface MedicalDocumentAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  documentType: (typeof DOCUMENT_TYPES)[number];
  title: string;
  visitDate: Date | null;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MedicalDocumentDoc = HydratedDocument<MedicalDocumentAttrs>;

export const MedicalDocument = model<MedicalDocumentAttrs>('MedicalDocument', medicalDocumentSchema);
