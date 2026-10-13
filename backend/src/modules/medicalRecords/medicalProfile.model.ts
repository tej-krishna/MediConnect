import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const medicalProfileSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    bloodType: { type: String, default: null, trim: true },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    currentMedications: { type: [String], default: [] },
    lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export interface MedicalProfileAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  bloodType: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  lastEditedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MedicalProfileDoc = HydratedDocument<MedicalProfileAttrs>;

export const MedicalProfile = model<MedicalProfileAttrs>('MedicalProfile', medicalProfileSchema);
