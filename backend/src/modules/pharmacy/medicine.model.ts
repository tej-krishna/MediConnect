import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const medicineItemSchema = new Schema(
  {
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, required: true, trim: true },
    activeIngredient: { type: String, required: true, trim: true, lowercase: true, index: true },
    strength: { type: String, required: true, trim: true },
    dosageForm: { type: String, required: true, trim: true, lowercase: true },
    manufacturer: { type: String, trim: true, default: null },
    unitPrice: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    requiresPrescription: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

medicineItemSchema.index({ name: 'text', genericName: 'text' });
medicineItemSchema.index({ activeIngredient: 1, strength: 1, dosageForm: 1 });

export interface MedicineItemAttrs {
  _id: Types.ObjectId;
  pharmacyId: Types.ObjectId;
  name: string;
  genericName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  manufacturer: string | null;
  unitPrice: number;
  stockQuantity: number;
  requiresPrescription: boolean;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type MedicineItemDoc = HydratedDocument<MedicineItemAttrs>;

export const MedicineItem = model<MedicineItemAttrs>('MedicineItem', medicineItemSchema);
