import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { CareOffering } from './careOffering.model';
import { CareRequest, CARE_REQUEST_STATUSES, type CareRequestDoc } from './careRequest.model';
import type { CreateCareRequestInput, CareRequestTransitionInput } from './homecare.validation';

type CareRequestStatus = (typeof CARE_REQUEST_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<CareRequestStatus, CareRequestStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['fulfilled', 'cancelled'],
  fulfilled: ['returned', 'completed'],
  returned: [],
  completed: [],
  cancelled: [],
};

const ACTION_TO_STATUS: Record<CareRequestTransitionInput['action'], CareRequestStatus> = {
  confirm: 'confirmed',
  fulfill: 'fulfilled',
  mark_returned: 'returned',
  mark_completed: 'completed',
  cancel: 'cancelled',
};

/**
 * Equipment rental/purchase offerings track availableQuantity and must reserve stock
 * atomically, same reasoning as pharmacy orders and appointment slots. A home_visit_service
 * offering has availableQuantity === null (it isn't a finite inventory item), so no
 * reservation/transaction is needed — the provider just reviews and confirms the booking.
 */
export async function createCareRequest(patientId: string, input: CreateCareRequestInput): Promise<CareRequestDoc> {
  const offering = await CareOffering.findById(input.offeringId);
  if (!offering || !offering.isActive) {
    throw AppError.notFound('Offering not found');
  }
  const provider = await ProviderApplication.findById(offering.providerId);
  if (!provider || !isActivelyVerified(provider)) {
    throw AppError.conflict('This provider is not currently active and verified');
  }

  const totalAmount = offering.price * input.quantity;
  const baseDoc = {
    patientId,
    providerId: offering.providerId,
    offeringId: offering._id,
    offeringType: offering.offeringType,
    offeringNameSnapshot: offering.name,
    quantity: input.quantity,
    unitPriceSnapshot: offering.price,
    totalAmount,
    preferredDate: input.preferredDate,
    expectedReturnDate: input.expectedReturnDate ?? null,
    deliveryAddress: input.deliveryAddress,
    notes: input.notes,
    status: 'requested' as const,
    statusHistory: [{ status: 'requested' as const, changedAt: new Date(), changedBy: patientId }],
  };

  if (offering.availableQuantity === null) {
    return CareRequest.create(baseDoc);
  }

  const session = await mongoose.startSession();
  try {
    let request: CareRequestDoc | undefined;
    await session.withTransaction(async () => {
      const reserved = await CareOffering.findOneAndUpdate(
        { _id: offering._id, isActive: true, availableQuantity: { $gte: input.quantity } },
        { $inc: { availableQuantity: -input.quantity } },
        { returnDocument: 'after', session },
      );
      if (!reserved) {
        throw AppError.conflict('Insufficient availability for the requested quantity');
      }
      const [created] = await CareRequest.create([baseDoc], { session });
      request = created;
    });
    return request as CareRequestDoc;
  } finally {
    await session.endSession();
  }
}

async function loadRequestOr404(requestId: string): Promise<CareRequestDoc> {
  if (!Types.ObjectId.isValid(requestId)) {
    throw AppError.notFound('Request not found');
  }
  const request = await CareRequest.findById(requestId);
  if (!request) {
    throw AppError.notFound('Request not found');
  }
  return request;
}

async function restoreAvailability(request: CareRequestDoc, session: mongoose.ClientSession) {
  const offering = await CareOffering.findById(request.offeringId).session(session);
  if (offering && offering.availableQuantity !== null) {
    await CareOffering.updateOne(
      { _id: offering._id },
      { $inc: { availableQuantity: request.quantity } },
      { session },
    );
  }
}

export async function getCareRequest(
  requestId: string,
  requester: { id: string; roles: string[] },
): Promise<CareRequestDoc> {
  const request = await loadRequestOr404(requestId);
  const isPatient = request.patientId.toString() === requester.id;
  const isMember = !isPatient && (await isProviderMember(request.providerId.toString(), requester.id));
  if (!isPatient && !isMember) {
    throw AppError.forbidden();
  }
  return request;
}

export async function transitionCareRequest(
  requestId: string,
  requester: { id: string; roles: string[] },
  input: CareRequestTransitionInput,
): Promise<CareRequestDoc> {
  const request = await loadRequestOr404(requestId);
  const isPatient = request.patientId.toString() === requester.id;
  const isMember = !isPatient && (await isProviderMember(request.providerId.toString(), requester.id));

  if (!isPatient && !isMember) {
    throw AppError.forbidden();
  }
  if (isPatient && input.action !== 'cancel') {
    throw AppError.forbidden('Patients may only cancel a request');
  }
  if (isPatient && !['requested', 'confirmed'].includes(request.status)) {
    throw AppError.conflict('This request can no longer be cancelled by the patient — contact the provider');
  }

  const targetStatus = ACTION_TO_STATUS[input.action];
  if (!ALLOWED_TRANSITIONS[request.status].includes(targetStatus)) {
    throw AppError.conflict(`Cannot transition from "${request.status}" to "${targetStatus}"`);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (targetStatus === 'cancelled') {
        await restoreAvailability(request, session);
      }
      request.status = targetStatus;
      request.statusHistory.push({
        status: targetStatus,
        changedAt: new Date(),
        changedBy: new Types.ObjectId(requester.id),
      });
      await request.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return request;
}

export async function listMyCareRequests(patientId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    CareRequest.find({ patientId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CareRequest.countDocuments({ patientId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listProviderCareRequests(providerId: string, requesterId: string, query: Record<string, unknown>) {
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    CareRequest.find({ providerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CareRequest.countDocuments({ providerId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
