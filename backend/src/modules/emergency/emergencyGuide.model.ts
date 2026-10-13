import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const emergencyGuideSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    redFlagSymptoms: { type: [String], required: true, default: [] },
    guidance: { type: String, required: true, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    clinicallyReviewed: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export interface EmergencyGuideAttrs {
  _id: Types.ObjectId;
  title: string;
  redFlagSymptoms: string[];
  guidance: string;
  displayOrder: number;
  isActive: boolean;
  clinicallyReviewed: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type EmergencyGuideDoc = HydratedDocument<EmergencyGuideAttrs>;

export const EmergencyGuide = model<EmergencyGuideAttrs>('EmergencyGuide', emergencyGuideSchema);
