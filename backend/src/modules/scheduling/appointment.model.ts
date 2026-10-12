import { Schema, model, Types, type HydratedDocument } from 'mongoose';

const appointmentSchema = new Schema(
  {
    slotId: { type: Schema.Types.ObjectId, ref: 'Slot', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'ProviderApplication', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['booked', 'cancelled', 'completed', 'no_show'], default: 'booked' },
    bookedAt: { type: Date, default: () => new Date() },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// Prevents the same patient double-booking the same slot while it's active; a cancelled booking
// doesn't block a later rebooking of the same slot by the same patient.
appointmentSchema.index(
  { slotId: 1, patientId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['booked', 'completed', 'no_show'] } } },
);

export interface AppointmentAttrs {
  _id: Types.ObjectId;
  slotId: Types.ObjectId;
  providerId: Types.ObjectId;
  patientId: Types.ObjectId;
  status: 'booked' | 'cancelled' | 'completed' | 'no_show';
  bookedAt: Date;
  cancelledAt: Date | null;
  cancelledBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentDoc = HydratedDocument<AppointmentAttrs>;

export const Appointment = model<AppointmentAttrs>('Appointment', appointmentSchema);
