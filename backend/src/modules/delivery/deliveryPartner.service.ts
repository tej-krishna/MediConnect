import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { User } from '../users/user.model';
import { recordAudit } from '../admin/auditLog.service';
import { notificationService } from '../../services/notification.service';
import { DeliveryPartnerProfile, type DeliveryPartnerProfileDoc } from './deliveryPartner.model';
import type { ApplyDeliveryPartnerInput, ReviewDeliveryPartnerInput } from './delivery.validation';

export async function apply(userId: string, input: ApplyDeliveryPartnerInput): Promise<DeliveryPartnerProfileDoc> {
  const existing = await DeliveryPartnerProfile.findOne({ userId });
  if (existing && existing.status !== 'rejected') {
    throw AppError.conflict('You already have a delivery partner application on file');
  }
  if (existing) {
    existing.set({ ...input, status: 'pending', reviewedBy: null, reviewedAt: null, rejectionReason: null });
    await existing.save();
    return existing;
  }
  return DeliveryPartnerProfile.create({ userId, ...input });
}

export async function getMyProfile(userId: string): Promise<DeliveryPartnerProfileDoc | null> {
  return DeliveryPartnerProfile.findOne({ userId });
}

/**
 * Matches the provider-verification pattern (Phase 3): the delivery_partner role is never
 * self-granted, it is only added to the user's roles once a super_admin approves the application.
 */
export async function review(
  profileId: string,
  reviewerId: string,
  input: ReviewDeliveryPartnerInput,
): Promise<DeliveryPartnerProfileDoc> {
  if (!Types.ObjectId.isValid(profileId)) {
    throw AppError.notFound('Delivery partner application not found');
  }
  const profile = await DeliveryPartnerProfile.findById(profileId);
  if (!profile) {
    throw AppError.notFound('Delivery partner application not found');
  }
  if (input.action === 'approve' && profile.status !== 'pending' && profile.status !== 'suspended') {
    throw AppError.conflict(`Cannot approve an application that is "${profile.status}"`);
  }
  if (input.action === 'reject' && profile.status !== 'pending') {
    throw AppError.conflict(`Cannot reject an application that is "${profile.status}"`);
  }
  if (input.action === 'suspend' && profile.status !== 'approved') {
    throw AppError.conflict(`Cannot suspend an application that is "${profile.status}"`);
  }

  if (input.action === 'approve') {
    profile.status = 'approved';
    profile.rejectionReason = null;
    await User.updateOne({ _id: profile.userId }, { $addToSet: { roles: 'delivery_partner' } });
  } else if (input.action === 'reject') {
    profile.status = 'rejected';
    profile.rejectionReason = input.reason;
  } else {
    profile.status = 'suspended';
    profile.rejectionReason = input.reason;
    await User.updateOne({ _id: profile.userId }, { $pull: { roles: 'delivery_partner' } });
  }

  profile.reviewedBy = new Types.ObjectId(reviewerId);
  profile.reviewedAt = new Date();
  await profile.save();

  await recordAudit({
    actorId: reviewerId,
    action: 'delivery_partner_review',
    targetType: 'DeliveryPartnerProfile',
    targetId: profileId,
    metadata: { action: input.action },
  });

  await notificationService.notify(
    profile.userId.toString(),
    `Your delivery partner application is now "${profile.status}"`,
    profile.rejectionReason ? `Reason: ${profile.rejectionReason}` : 'You can now accept deliveries.',
  );

  return profile;
}

export async function listForAdmin(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (typeof query.status === 'string' && query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    DeliveryPartnerProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    DeliveryPartnerProfile.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function isApprovedDeliveryPartner(userId: string): Promise<boolean> {
  const profile = await DeliveryPartnerProfile.findOne({ userId, status: 'approved' });
  return Boolean(profile);
}

/**
 * Minimal directory of approved delivery partners, open to any authenticated user — a pharmacy
 * owner needs to find a partner to assign without admin privileges. Deliberately exposes only
 * what's needed to pick someone (city, vehicle, userId), not the full admin profile.
 */
export async function listDirectory(city?: string) {
  const filter: Record<string, unknown> = { status: 'approved' };
  if (city) filter.serviceCity = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return DeliveryPartnerProfile.find(filter)
    .populate<{ userId: { _id: Types.ObjectId; fullName: string } }>('userId', 'fullName')
    .sort({ serviceCity: 1 })
    .limit(100);
}
