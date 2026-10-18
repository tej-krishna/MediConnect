import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { isProviderMember } from '../providers/providerStaff.service';
import { Slot } from './slot.model';
import { Appointment, type AppointmentDoc } from './appointment.model';

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
}

/**
 * Atomically reserves one unit of slot capacity and creates the booking in the same transaction,
 * so two patients racing for the last open spot can never both succeed (one of the two
 * findOneAndUpdate calls below will simply not match any document and fail cleanly), and a patient
 * can never end up with two active bookings for the same slot (enforced by a partial unique index
 * on Appointment, not just an application-level check).
 */
export async function bookAppointment(slotId: string, patientId: string): Promise<AppointmentDoc> {
  const slotExists = await Slot.exists({ _id: slotId });
  if (!slotExists) {
    throw AppError.notFound('Slot not found');
  }

  const session = await mongoose.startSession();
  try {
    let appointment: AppointmentDoc | undefined;

    await session.withTransaction(async () => {
      const reservedSlot = await Slot.findOneAndUpdate(
        {
          _id: slotId,
          status: 'open',
          startTime: { $gt: new Date() },
          $expr: { $lt: ['$bookedCount', '$capacity'] },
        },
        { $inc: { bookedCount: 1 } },
        { returnDocument: 'after', session },
      );

      if (!reservedSlot) {
        throw AppError.conflict('This slot is no longer available');
      }

      try {
        const [created] = await Appointment.create(
          [{ slotId, providerId: reservedSlot.providerId, patientId }],
          { session },
        );
        appointment = created;
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          throw AppError.conflict('You already have a booking for this slot');
        }
        throw err;
      }
    });

    return appointment as AppointmentDoc;
  } finally {
    await session.endSession();
  }
}

export async function cancelAppointment(
  appointmentId: string,
  requester: { id: string; roles: string[] },
): Promise<AppointmentDoc> {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw AppError.notFound('Appointment not found');
  }
  if (appointment.status !== 'booked') {
    throw AppError.conflict(`Cannot cancel an appointment that is "${appointment.status}"`);
  }

  const isPatient = appointment.patientId.toString() === requester.id;
  const isMember = !isPatient && (await isProviderMember(appointment.providerId.toString(), requester.id));
  if (!isPatient && !isMember) {
    throw AppError.forbidden();
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      appointment.status = 'cancelled';
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = new Types.ObjectId(requester.id);
      await appointment.save({ session });
      await Slot.updateOne({ _id: appointment.slotId }, { $inc: { bookedCount: -1 } }, { session });
    });
  } finally {
    await session.endSession();
  }

  return appointment;
}

export async function listMyAppointments(patientId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Appointment.find({ patientId })
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(limit)
      // Populated so the client (the mobile Home screen's "Upcoming appointments" card, in
      // particular) can show the doctor's name/specialty and the booked time slot without a
      // separate round trip per appointment — only the fields a patient is already allowed to see
      // on the public provider listing.
      .populate('providerId', 'organizationName providerType typeDetails')
      .populate('slotId', 'startTime endTime'),
    Appointment.countDocuments({ patientId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listProviderAppointments(
  providerId: string,
  requesterId: string,
  query: Record<string, unknown>,
) {
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Appointment.find({ providerId }).sort({ bookedAt: -1 }).skip(skip).limit(limit),
    Appointment.countDocuments({ providerId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
