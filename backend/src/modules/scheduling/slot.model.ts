import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const slotSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1, default: 1 },
    bookedCount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['open', 'cancelled'], default: 'open', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

slotSchema.index({ providerId: 1, startTime: 1 });

export interface SlotAttrs {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  capacity: number;
  bookedCount: number;
  status: 'open' | 'cancelled';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SlotDoc = HydratedDocument<SlotAttrs>;

export const Slot = model<SlotAttrs>('Slot', slotSchema);
