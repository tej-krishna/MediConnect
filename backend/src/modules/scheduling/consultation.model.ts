import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export const CONSULTATION_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
export const VISIT_TYPES = ['online', 'home_visit'] as const;

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
    status: { type: String, enum: CONSULTATION_STATUSES, required: true },
    changedAt: { type: Date, default: () => new Date() },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

// {lat,lng,at} the doctor or patient submitted while trying to start a home visit — kept (not just
// the latest) isn't needed since a visit only ever has one active attempt in flight at a time, so a
// single slot per side is enough; see consultation.service.ts's checkIn for the 30m proximity gate.
const checkInSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const consultationSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    visitType: { type: String, enum: VISIT_TYPES, required: true },
    homeVisitAddress: { type: addressSchema, default: null },
    preferredDateTime: { type: Date, required: true },
    confirmedDateTime: { type: Date, default: null },
    status: { type: String, enum: CONSULTATION_STATUSES, default: 'requested', index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    noShowReportedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Reserved for the home-visit geofenced check-in (consultation.service.ts's checkIn).
    doctorCheckIn: { type: checkInSchema, default: null },
    patientCheckIn: { type: checkInSchema, default: null },
    // Reserved for the video-call signaling room (video.gateway.ts) — only set for visitType
    // 'online', generated once the consultation is confirmed.
    videoSessionId: { type: String, default: null },
  },
  { timestamps: true },
);

export interface ConsultationAttrs {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  visitType: (typeof VISIT_TYPES)[number];
  homeVisitAddress: { line1: string; city: string; state: string; postalCode: string } | null;
  preferredDateTime: Date;
  confirmedDateTime: Date | null;
  status: (typeof CONSULTATION_STATUSES)[number];
  statusHistory: { status: string; changedAt: Date; changedBy: Types.ObjectId | null }[];
  noShowReportedBy: Types.ObjectId | null;
  doctorCheckIn: { lat: number; lng: number; at: Date } | null;
  patientCheckIn: { lat: number; lng: number; at: Date } | null;
  videoSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ConsultationDoc = HydratedDocument<ConsultationAttrs>;

export const Consultation = model<ConsultationAttrs>('Consultation', consultationSchema);
