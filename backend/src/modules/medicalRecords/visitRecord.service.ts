import { AppError } from '../../utils/AppError';
import { assertAccess, logAccess } from './medicalRecords.access';
import { VisitRecord, type VisitRecordDoc } from './visitRecord.model';
import type { CreateVisitInput, UpdateVisitInput } from './medicalRecords.validation';

export async function createVisit(
  patientId: string,
  requesterId: string,
  input: CreateVisitInput,
): Promise<VisitRecordDoc> {
  await assertAccess(patientId, requesterId, 'manage_profile');
  return VisitRecord.create({ patientId, createdBy: requesterId, ...input });
}

export async function listVisits(patientId: string, requesterId: string): Promise<VisitRecordDoc[]> {
  await assertAccess(patientId, requesterId, 'view_visits');
  await logAccess(patientId, requesterId, 'view_visits');
  return VisitRecord.find({ patientId }).sort({ visitDate: -1 });
}

export async function updateVisit(
  patientId: string,
  visitId: string,
  requesterId: string,
  input: UpdateVisitInput,
): Promise<VisitRecordDoc> {
  await assertAccess(patientId, requesterId, 'manage_profile');
  const visit = await VisitRecord.findOne({ _id: visitId, patientId });
  if (!visit) {
    throw AppError.notFound('Visit record not found');
  }
  Object.assign(visit, input);
  await visit.save();
  return visit;
}

export async function deleteVisit(patientId: string, visitId: string, requesterId: string): Promise<void> {
  if (patientId !== requesterId) {
    throw AppError.forbidden();
  }
  const visit = await VisitRecord.findOne({ _id: visitId, patientId });
  if (!visit) {
    throw AppError.notFound('Visit record not found');
  }
  await visit.deleteOne();
}
