import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const healthCampSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    locationDescription: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    servicesOffered: { type: [String], default: [] },
    capacity: { type: Number, required: true, min: 1 },
    registeredCount: { type: Number, default: 0 },
    status: { type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

healthCampSchema.index({ location: '2dsphere' });

export interface HealthCampAttrs {
  _id: Types.ObjectId;
  providerId: Types.ObjectId;
  title: string;
  description: string | null;
  locationDescription: string;
  location?: { type: 'Point'; coordinates: [number, number] } | null;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  servicesOffered: string[];
  capacity: number;
  registeredCount: number;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type HealthCampDoc = HydratedDocument<HealthCampAttrs>;

export const HealthCamp = model<HealthCampAttrs>('HealthCamp', healthCampSchema);

const registrationSchema = new Schema(
  {
    campId: { type: Schema.Types.ObjectId, ref: 'HealthCamp', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' },
    registeredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

registrationSchema.index(
  { campId: 1, patientId: 1 },
  { unique: true, partialFilterExpression: { status: 'registered' } },
);

export interface HealthCampRegistrationAttrs {
  _id: Types.ObjectId;
  campId: Types.ObjectId;
  patientId: Types.ObjectId;
  status: 'registered' | 'cancelled';
  registeredAt: Date;
}

export type HealthCampRegistrationDoc = HydratedDocument<HealthCampRegistrationAttrs>;

export const HealthCampRegistration = model<HealthCampRegistrationAttrs>(
  'HealthCampRegistration',
  registrationSchema,
);
