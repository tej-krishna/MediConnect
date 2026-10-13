import { AppError } from '../../utils/AppError';
import { User } from '../users/user.model';
import { CaregiverAccess, type CaregiverAccessDoc } from './caregiverAccess.model';
import type { InviteCaregiverInput } from './medicalRecords.validation';

export async function inviteCaregiver(
  patientId: string,
  input: InviteCaregiverInput,
): Promise<CaregiverAccessDoc> {
  const caregiver = await User.findOne({ email: input.caregiverEmail });
  if (!caregiver) {
    throw AppError.notFound('No account exists with that email — ask them to register first');
  }
  if (caregiver._id.toString() === patientId) {
    throw AppError.badRequest('You cannot grant yourself caregiver access');
  }

  const existing = await CaregiverAccess.findOne({
    patientId,
    caregiverId: caregiver._id,
    status: { $in: ['pending', 'active'] },
  });
  if (existing) {
    throw AppError.conflict('This person already has or has been offered access to your records');
  }

  return CaregiverAccess.create({
    patientId,
    caregiverId: caregiver._id,
    scopes: input.scopes,
    expiresAt: input.expiresAt ?? null,
  });
}

export async function listMyGrants(patientId: string): Promise<CaregiverAccessDoc[]> {
  return CaregiverAccess.find({ patientId, status: { $ne: 'declined' } }).sort({ createdAt: -1 });
}

export async function revokeGrant(patientId: string, grantId: string): Promise<void> {
  const grant = await CaregiverAccess.findOne({ _id: grantId, patientId });
  if (!grant) {
    throw AppError.notFound('Access grant not found');
  }
  grant.status = 'revoked';
  grant.revokedAt = new Date();
  await grant.save();
}

export async function listInvitesToMe(caregiverId: string): Promise<CaregiverAccessDoc[]> {
  return CaregiverAccess.find({ caregiverId, status: { $ne: 'declined' } }).sort({ createdAt: -1 });
}

export async function respondToInvite(
  grantId: string,
  caregiverId: string,
  accept: boolean,
): Promise<CaregiverAccessDoc> {
  const grant = await CaregiverAccess.findOne({ _id: grantId, caregiverId });
  if (!grant) {
    throw AppError.notFound('Invite not found');
  }
  if (grant.status !== 'pending') {
    throw AppError.conflict(`This invite is "${grant.status}", not pending`);
  }
  grant.status = accept ? 'active' : 'declined';
  grant.respondedAt = new Date();
  await grant.save();
  return grant;
}
