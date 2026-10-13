import { Schema, model, Types, type HydratedDocument } from 'mongoose';
import { PROVIDER_TYPES } from '../providers/provider.types';

const commissionRuleSchema = new Schema(
  {
    providerType: { type: String, enum: PROVIDER_TYPES, required: true, unique: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export interface CommissionRuleAttrs {
  _id: Types.ObjectId;
  providerType: string;
  percentage: number;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CommissionRuleDoc = HydratedDocument<CommissionRuleAttrs>;

export const CommissionRule = model<CommissionRuleAttrs>('CommissionRule', commissionRuleSchema);
