import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const ORDER_STATUSES = [
  'pending_prescription',
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

const orderItemSchema = new Schema(
  {
    medicineItemId: { type: Schema.Types.ObjectId, ref: 'MedicineItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedAt: { type: Date, default: () => new Date() },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    requiresPrescription: { type: Boolean, default: false },
    prescriptionDocument: {
      storageKey: { type: String },
      originalFilename: { type: String },
      mimeType: { type: String },
      uploadedAt: { type: Date },
    },
    deliveryAddress: { type: addressSchema, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);

export interface OrderItem {
  medicineItemId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  pharmacyId: Types.ObjectId;
  items: OrderItem[];
  totalAmount: number;
  requiresPrescription: boolean;
  prescriptionDocument: {
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    uploadedAt: Date;
  } | null;
  deliveryAddress: { line1: string; city: string; state: string; postalCode: string };
  status: (typeof ORDER_STATUSES)[number];
  statusHistory: { status: string; changedAt: Date; changedBy: Types.ObjectId | null }[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDoc = HydratedDocument<OrderAttrs>;

export const Order = model<OrderAttrs>('Order', orderSchema);
