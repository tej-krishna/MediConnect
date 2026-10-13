import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const DELIVERY_PARTNER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export const VEHICLE_TYPES = ['bicycle', 'two_wheeler', 'three_wheeler', 'van'] as const;

const deliveryPartnerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    contactPhone: { type: String, required: true, trim: true },
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
    serviceCity: { type: String, required: true, trim: true },
    status: { type: String, enum: DELIVERY_PARTNER_STATUSES, default: 'pending', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true },
);

export interface DeliveryPartnerProfileAttrs {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  contactPhone: string;
  vehicleType: (typeof VEHICLE_TYPES)[number];
  serviceCity: string;
  status: (typeof DELIVERY_PARTNER_STATUSES)[number];
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryPartnerProfileDoc = HydratedDocument<DeliveryPartnerProfileAttrs>;

export const DeliveryPartnerProfile = model<DeliveryPartnerProfileAttrs>(
  'DeliveryPartnerProfile',
  deliveryPartnerProfileSchema,
);
