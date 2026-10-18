import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { distanceMeters } from '../../utils/geo';
import { ProviderApplication, type ProviderApplicationDoc } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import {
  Consultation,
  CONSULTATION_STATUSES,
  type ConsultationDoc,
} from './consultation.model';
import type { RequestConsultationInput, ConsultationTransitionInput, CheckInInput } from './scheduling.validation';

type Status = (typeof CONSULTATION_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** A home visit only "arrives" when both sides check in within this many meters of each other. */
export const HOME_VISIT_CHECK_IN_RADIUS_METERS = 30;

/** Every 2nd no-show strike multiplies the doctor's rating by this factor, then resets the count. */
const NO_SHOW_RATING_PENALTY_FACTOR = 0.85;
const WARNINGS_BEFORE_PENALTY = 2;

const CONSULTATION_PROVIDER_TYPES = new Set(['doctor', 'clinic']);

async function loadDoctorOrThrow(doctorId: string): Promise<ProviderApplicationDoc> {
  const doctor = await ProviderApplication.findById(doctorId);
  if (!doctor || !CONSULTATION_PROVIDER_TYPES.has(doctor.providerType)) {
    throw AppError.notFound('Doctor not found');
  }
  if (!isActivelyVerified(doctor)) {
    throw AppError.conflict('This doctor is not currently active and verified');
  }
  return doctor;
}

export async function requestConsultation(
  patientId: string,
  input: RequestConsultationInput,
): Promise<ConsultationDoc> {
  const doctor = await loadDoctorOrThrow(input.doctorId);

  const flag = input.visitType === 'online' ? doctor.acceptsOnlineConsultations : doctor.acceptsHomeVisits;
  if (flag !== true) {
    throw AppError.conflict(
      input.visitType === 'online'
        ? 'This doctor is not currently accepting online consultations'
        : 'This doctor is not currently accepting home visits',
    );
  }

  return Consultation.create({
    patientId,
    doctorId: input.doctorId,
    visitType: input.visitType,
    homeVisitAddress: input.homeVisitAddress ?? null,
    preferredDateTime: input.preferredDateTime,
    status: 'requested',
    statusHistory: [{ status: 'requested', changedAt: new Date(), changedBy: patientId }],
  });
}

async function loadConsultationOr404(id: string): Promise<ConsultationDoc> {
  if (!Types.ObjectId.isValid(id)) {
    throw AppError.notFound('Consultation not found');
  }
  const consultation = await Consultation.findById(id);
  if (!consultation) {
    throw AppError.notFound('Consultation not found');
  }
  return consultation;
}

async function authorize(
  consultation: ConsultationDoc,
  requester: { id: string; roles: string[] },
): Promise<{ isPatient: boolean; isDoctorMember: boolean }> {
  const isPatient = consultation.patientId.toString() === requester.id;
  const isDoctorMember = !isPatient && (await isProviderMember(consultation.doctorId.toString(), requester.id));
  if (!isPatient && !isDoctorMember) {
    throw AppError.forbidden();
  }
  return { isPatient, isDoctorMember };
}

export async function getConsultation(
  id: string,
  requester: { id: string; roles: string[] },
): Promise<ConsultationDoc> {
  const consultation = await loadConsultationOr404(id);
  await authorize(consultation, requester);
  return consultation;
}

export async function transitionConsultation(
  id: string,
  requester: { id: string; roles: string[] },
  input: ConsultationTransitionInput,
): Promise<ConsultationDoc> {
  const consultation = await loadConsultationOr404(id);
  const { isPatient } = await authorize(consultation, requester);

  if (isPatient && input.action !== 'cancel' && input.action !== 'report_no_show') {
    throw AppError.forbidden('Patients may only cancel or report a missed visit');
  }
  if (!isPatient && input.action === 'report_no_show') {
    throw AppError.forbidden('Only the patient can report a missed visit');
  }

  const targetStatus: Status =
    input.action === 'cancel'
      ? 'cancelled'
      : input.action === 'confirm'
        ? 'confirmed'
        : input.action === 'complete'
          ? 'completed'
          : 'no_show';

  if (!ALLOWED_TRANSITIONS[consultation.status].includes(targetStatus)) {
    throw AppError.conflict(`Cannot transition from "${consultation.status}" to "${targetStatus}"`);
  }

  if (input.action === 'confirm') {
    consultation.confirmedDateTime = input.confirmedDateTime;
  }

  if (input.action === 'report_no_show') {
    if (!consultation.confirmedDateTime || consultation.confirmedDateTime.getTime() > Date.now()) {
      throw AppError.conflict('This visit has not happened yet');
    }
    consultation.noShowReportedBy = new Types.ObjectId(requester.id);
    await applyNoShowPenalty(consultation.doctorId.toString());
  }

  consultation.status = targetStatus;
  consultation.statusHistory.push({
    status: targetStatus,
    changedAt: new Date(),
    changedBy: new Types.ObjectId(requester.id),
  });
  await consultation.save();
  return consultation;
}

/**
 * Every reported no-show is one warning. On the *2nd* warning (and every 2nd one after that), the
 * doctor's rating is multiplied by 0.85 and the warning count resets to 0 — so the count itself
 * never grows past 1 between penalties.
 */
async function applyNoShowPenalty(doctorId: string): Promise<void> {
  const doctor = await ProviderApplication.findById(doctorId);
  if (!doctor) return;

  const nextWarningCount = (doctor.noShowWarningCount ?? 0) + 1;
  if (nextWarningCount >= WARNINGS_BEFORE_PENALTY) {
    doctor.noShowWarningCount = 0;
    doctor.reliabilityRating = Math.round((doctor.reliabilityRating ?? 100) * NO_SHOW_RATING_PENALTY_FACTOR * 100) / 100;
  } else {
    doctor.noShowWarningCount = nextWarningCount;
  }
  await doctor.save();
}

export async function checkIn(
  id: string,
  requester: { id: string; roles: string[] },
  input: CheckInInput,
): Promise<{ consultation: ConsultationDoc; distanceMeters: number | null; withinRange: boolean }> {
  const consultation = await loadConsultationOr404(id);
  const { isPatient, isDoctorMember } = await authorize(consultation, requester);

  if (consultation.visitType !== 'home_visit') {
    throw AppError.badRequest('Check-in only applies to home visits');
  }
  if (consultation.status !== 'confirmed') {
    throw AppError.conflict(`Cannot check in while the visit is "${consultation.status}"`);
  }

  const checkInEntry = { lat: input.lat, lng: input.lng, at: new Date() };
  if (isPatient) {
    consultation.patientCheckIn = checkInEntry;
  } else if (isDoctorMember) {
    consultation.doctorCheckIn = checkInEntry;
  }
  await consultation.save();

  if (!consultation.doctorCheckIn || !consultation.patientCheckIn) {
    return { consultation, distanceMeters: null, withinRange: false };
  }

  const meters = distanceMeters(consultation.doctorCheckIn, consultation.patientCheckIn);
  return { consultation, distanceMeters: Math.round(meters), withinRange: meters <= HOME_VISIT_CHECK_IN_RADIUS_METERS };
}

export async function listMyConsultations(patientId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Consultation.find({ patientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('doctorId', 'organizationName providerType typeDetails'),
    Consultation.countDocuments({ patientId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listDoctorConsultations(doctorId: string, requesterId: string, query: Record<string, unknown>) {
  if (!(await isProviderMember(doctorId, requesterId))) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Consultation.find({ doctorId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Consultation.countDocuments({ doctorId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
