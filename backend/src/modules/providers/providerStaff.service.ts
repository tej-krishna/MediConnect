import { AppError } from '../../utils/AppError';
import { User } from '../users/user.model';
import { ProviderApplication } from './provider.model';
import { ProviderStaff, type ProviderStaffDoc } from './providerStaff.model';

export async function isProviderMember(providerId: string, userId: string): Promise<boolean> {
  const app = await ProviderApplication.findById(providerId).select('userId');
  if (!app) return false;
  if (app.userId.toString() === userId) return true;

  const staff = await ProviderStaff.findOne({ providerId, userId, status: 'active' });
  return Boolean(staff);
}

async function assertOwner(providerId: string, requesterId: string) {
  const app = await ProviderApplication.findById(providerId).select('userId');
  if (!app) {
    throw AppError.notFound('Provider application not found');
  }
  if (app.userId.toString() !== requesterId) {
    throw AppError.forbidden('Only the provider owner can manage staff');
  }
  return app;
}

export async function inviteStaff(
  providerId: string,
  requesterId: string,
  inviteeEmail: string,
): Promise<ProviderStaffDoc> {
  await assertOwner(providerId, requesterId);

  const invitee = await User.findOne({ email: inviteeEmail.trim().toLowerCase() });
  if (!invitee) {
    throw AppError.notFound('No account exists with that email — ask them to register first');
  }
  if (invitee._id.toString() === requesterId) {
    throw AppError.badRequest('You are already the owner of this provider');
  }

  const existing = await ProviderStaff.findOne({
    providerId,
    userId: invitee._id,
    status: { $in: ['invited', 'active'] },
  });
  if (existing) {
    throw AppError.conflict('This user is already a staff member or has a pending invite');
  }

  return ProviderStaff.create({ providerId, userId: invitee._id, invitedBy: requesterId });
}

export async function listStaff(providerId: string, requesterId: string): Promise<ProviderStaffDoc[]> {
  await assertOwner(providerId, requesterId);
  return ProviderStaff.find({ providerId, status: { $ne: 'removed' } }).sort({ createdAt: -1 });
}

export async function acceptInvite(staffId: string, requesterId: string): Promise<ProviderStaffDoc> {
  const staff = await ProviderStaff.findById(staffId);
  if (!staff || staff.userId.toString() !== requesterId) {
    throw AppError.notFound('Invite not found');
  }
  if (staff.status !== 'invited') {
    throw AppError.conflict(`This invite is "${staff.status}", not pending`);
  }
  staff.status = 'active';
  staff.acceptedAt = new Date();
  await staff.save();
  return staff;
}

export async function removeStaff(providerId: string, staffId: string, requesterId: string): Promise<void> {
  await assertOwner(providerId, requesterId);
  const staff = await ProviderStaff.findOne({ _id: staffId, providerId });
  if (!staff) {
    throw AppError.notFound('Staff member not found');
  }
  staff.status = 'removed';
  staff.removedAt = new Date();
  await staff.save();
}
