import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { User, type UserDoc } from '../users/user.model';
import { RefreshToken } from '../auth/refreshToken.model';
import { recordAudit } from './auditLog.service';

export async function listUsers(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (typeof query.role === 'string' && query.role) filter.roles = query.role;
  if (typeof query.status === 'string' && query.status) filter.status = query.status;
  if (typeof query.search === 'string' && query.search.trim()) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { email: { $regex: new RegExp(escaped, 'i') } },
      { fullName: { $regex: new RegExp(escaped, 'i') } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

/**
 * Suspension/reactivation only — this never touches `roles`. Granting or revoking a role still
 * only happens through the dedicated, audited paths (provider approval, delivery-partner review),
 * never a generic "edit user" endpoint, which is exactly the "no self-granted or admin-shortcut
 * role editing" boundary the rest of the app already enforces.
 */
export async function setUserStatus(
  targetUserId: string,
  actorId: string,
  status: 'active' | 'suspended',
): Promise<UserDoc> {
  if (!Types.ObjectId.isValid(targetUserId)) {
    throw AppError.notFound('User not found');
  }
  const user = await User.findById(targetUserId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  if (user.roles.includes('super_admin') && status === 'suspended') {
    throw AppError.forbidden('Cannot suspend another super admin account');
  }
  if (targetUserId === actorId) {
    throw AppError.forbidden('Cannot change your own account status');
  }

  user.status = status;
  if (status === 'suspended') {
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  }
  await user.save();

  await recordAudit({
    actorId,
    action: 'user_status_change',
    targetType: 'User',
    targetId: targetUserId,
    metadata: { status },
  });

  return user;
}
