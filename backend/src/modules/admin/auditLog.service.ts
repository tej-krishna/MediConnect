import { Types } from 'mongoose';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { AuditLog, type AuditLogAttrs } from './auditLog.model';

/**
 * A thin, fire-and-forget recorder for the highest-stakes admin/staff actions in the app —
 * provider verification decisions, delivery-partner approval, support-ticket resolution, and
 * user-account moderation. This is not a general-purpose activity feed (every GET request isn't
 * logged here — winston/morgan request logging already covers that at the HTTP level); it exists
 * specifically so a platform admin reviewing "who decided what" doesn't have to reconstruct it
 * from scattered statusHistory arrays across unrelated modules.
 */
export async function recordAudit(entry: {
  actorId: string;
  action: AuditLogAttrs['action'];
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await AuditLog.create({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: new Types.ObjectId(entry.targetId),
    metadata: entry.metadata ?? {},
  });
}

export async function listAuditLog(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (typeof query.action === 'string' && query.action) filter.action = query.action;
  if (typeof query.targetType === 'string' && query.targetType) filter.targetType = query.targetType;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
