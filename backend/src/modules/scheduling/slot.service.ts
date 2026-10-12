import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { Slot, type SlotDoc } from './slot.model';
import type { CreateSlotInput } from './scheduling.validation';

async function assertActivelyVerifiedProvider(providerId: string) {
  const provider = await ProviderApplication.findById(providerId);
  if (!provider) {
    throw AppError.notFound('Provider not found');
  }
  if (!isActivelyVerified(provider)) {
    throw AppError.conflict('This provider is not currently active and verified');
  }
  return provider;
}

export async function createSlot(
  providerId: string,
  requesterId: string,
  input: CreateSlotInput,
): Promise<SlotDoc> {
  await assertActivelyVerifiedProvider(providerId);
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }

  return Slot.create({
    providerId,
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity,
    createdBy: requesterId,
  });
}

export async function listProviderSlots(providerId: string, requesterId: string, query: Record<string, unknown>) {
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Slot.find({ providerId }).sort({ startTime: 1 }).skip(skip).limit(limit),
    Slot.countDocuments({ providerId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listAvailableSlots(providerId: string, query: Record<string, unknown>) {
  await assertActivelyVerifiedProvider(providerId);
  const { page, limit, skip } = parsePagination(query);
  const filter = {
    providerId,
    status: 'open' as const,
    startTime: { $gt: new Date() },
    $expr: { $lt: ['$bookedCount', '$capacity'] },
  };
  const [items, total] = await Promise.all([
    Slot.find(filter).sort({ startTime: 1 }).skip(skip).limit(limit),
    Slot.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function cancelSlot(providerId: string, slotId: string, requesterId: string): Promise<void> {
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }
  const slot = await Slot.findOne({ _id: slotId, providerId });
  if (!slot) {
    throw AppError.notFound('Slot not found');
  }
  if (slot.bookedCount > 0) {
    throw AppError.conflict('Cancel the existing bookings for this slot before cancelling it');
  }
  slot.status = 'cancelled';
  await slot.save();
}
