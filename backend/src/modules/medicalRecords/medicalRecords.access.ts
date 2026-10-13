import { AppError } from '../../utils/AppError';
import { CaregiverAccess } from './caregiverAccess.model';
import { RecordAccessLog } from './recordAccessLog.model';
import type { ACCESS_SCOPES } from './caregiverAccess.model';
import type { ACCESS_ACTIONS } from './recordAccessLog.model';

type Scope = (typeof ACCESS_SCOPES)[number];
type Action = (typeof ACCESS_ACTIONS)[number];

/** Resolves the ":patientId" route param — "me" always means the requester themselves. */
export function resolvePatientId(patientIdParam: string, requesterId: string): string {
  return patientIdParam === 'me' ? requesterId : patientIdParam;
}

function isGrantActive(grant: { status: string; expiresAt: Date | null }): boolean {
  if (grant.status !== 'active') return false;
  if (!grant.expiresAt) return true;
  return grant.expiresAt.getTime() > Date.now();
}

/**
 * The one authorization gate for every medical-records read/write: either the requester is the
 * patient themselves, or they hold an active, non-expired CaregiverAccess grant for that patient
 * with the specific scope the action needs. Nothing else — not even super_admin — can read medical
 * records through this module; that's deliberate (see ARCHITECTURE.md).
 */
export async function assertAccess(
  patientId: string,
  requesterId: string,
  requiredScope: Scope | null,
): Promise<{ isSelf: boolean }> {
  if (patientId === requesterId) {
    return { isSelf: true };
  }
  if (!requiredScope) {
    // Some actions (e.g. managing caregiver grants, viewing the audit log) are patient-only.
    throw AppError.forbidden();
  }

  const grant = await CaregiverAccess.findOne({ patientId, caregiverId: requesterId });
  if (!grant || !isGrantActive(grant) || !grant.scopes.includes(requiredScope)) {
    throw AppError.forbidden();
  }
  return { isSelf: false };
}

export async function logAccess(patientId: string, accessedBy: string, action: Action): Promise<void> {
  // Only third-party (caregiver) access is logged — a patient reading their own records isn't a
  // privacy-relevant event in the way a caregiver's access is.
  if (patientId === accessedBy) return;
  await RecordAccessLog.create({ patientId, accessedBy, action });
}
