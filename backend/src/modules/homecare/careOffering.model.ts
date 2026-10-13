import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const OFFERING_TYPES = ['equipment_rental', 'equipment_purchase', 'home_visit_service'] as const;

const careOfferingSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    offeringType: { type: String, enum: OFFERING_TYPES, required: true },
    price: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, default: null, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

careOfferingSchema.index({ name: 'text', category: 'text' });

export interface CareOfferingAttrs {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  name: string;
  category: string;
  offeringType: (typeof OFFERING_TYPES)[number];
  price: number;
  availableQuantity: number | null;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CareOfferingDoc = HydratedDocument<CareOfferingAttrs>;

export const CareOffering = model<CareOfferingAttrs>('CareOffering', careOfferingSchema);
