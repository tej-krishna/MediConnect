import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as slotService from './slot.service';
import * as appointmentService from './appointment.service';
import type { SlotDoc } from './slot.model';
import type { AppointmentDoc } from './appointment.model';

function toSlotView(slot: SlotDoc) {
  return {
    id: slot._id.toString(),
    providerId: slot.providerId.toString(),
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    remaining: Math.max(0, slot.capacity - slot.bookedCount),
    status: slot.status,
  };
}

/** `field` is either a bare ObjectId or, when the query `.populate()`d it, a full document — either
 * way this pulls out just the id string, never relying on a populated Document's own `.toString()`
 * (which doesn't just give the hex id). */
function idOf(field: { _id?: unknown; toString(): string }): string {
  return field._id ? String(field._id) : field.toString();
}

function toAppointmentView(appointment: AppointmentDoc) {
  return {
    id: appointment._id.toString(),
    slotId: idOf(appointment.slotId),
    providerId: idOf(appointment.providerId),
    patientId: appointment.patientId.toString(),
    status: appointment.status,
    bookedAt: appointment.bookedAt,
    cancelledAt: appointment.cancelledAt,
  };
}

/** The shape `.populate('providerId', ...)`/`.populate('slotId', ...)` leaves on the doc — only
 * `listMyAppointments` populates, so this view is only ever used for that response. */
interface PopulatedAppointmentDoc extends Omit<AppointmentDoc, 'providerId' | 'slotId'> {
  providerId: { _id: unknown; organizationName: string; providerType: string; typeDetails: Record<string, unknown> };
  slotId: { _id: unknown; startTime: Date; endTime: Date };
}

function toMyAppointmentView(appointment: AppointmentDoc) {
  const base = toAppointmentView(appointment);
  const populated = appointment as unknown as PopulatedAppointmentDoc;
  const provider = populated.providerId;
  const slot = populated.slotId;
  return {
    ...base,
    provider:
      provider && typeof provider === 'object' && 'organizationName' in provider
        ? { organizationName: provider.organizationName, providerType: provider.providerType, typeDetails: provider.typeDetails }
        : null,
    slot: slot && typeof slot === 'object' && 'startTime' in slot ? { startTime: slot.startTime, endTime: slot.endTime } : null,
  };
}

export const createSlotHandler = asyncHandler(async (req, res) => {
  const slot = await slotService.createSlot(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { slot: toSlotView(slot) }, 201);
});

export const listProviderSlotsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await slotService.listProviderSlots(
    req.params.id as string,
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendSuccess(res, { slots: items.map(toSlotView) }, 200, meta);
});

export const listAvailableSlotsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await slotService.listAvailableSlots(
    req.params.id as string,
    req.query as Record<string, unknown>,
  );
  sendSuccess(res, { slots: items.map(toSlotView) }, 200, meta);
});

export const cancelSlotHandler = asyncHandler(async (req, res) => {
  await slotService.cancelSlot(req.params.id as string, req.params.slotId as string, req.user!.id);
  sendSuccess(res, { cancelled: true });
});

export const bookAppointmentHandler = asyncHandler(async (req, res) => {
  if (!req.body.slotId) {
    throw AppError.badRequest('slotId is required');
  }
  const appointment = await appointmentService.bookAppointment(req.body.slotId, req.user!.id);
  sendSuccess(res, { appointment: toAppointmentView(appointment) }, 201);
});

export const cancelAppointmentHandler = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id as string, req.user!);
  sendSuccess(res, { appointment: toAppointmentView(appointment) });
});

export const listMyAppointmentsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await appointmentService.listMyAppointments(
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendSuccess(res, { appointments: items.map(toMyAppointmentView) }, 200, meta);
});

export const listProviderAppointmentsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await appointmentService.listProviderAppointments(
    req.params.id as string,
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendSuccess(res, { appointments: items.map(toAppointmentView) }, 200, meta);
});
