import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as adminUserService from './adminUser.service';
import * as commissionRuleService from './commissionRule.service';
import * as analyticsService from './analytics.service';
import * as auditLogService from './auditLog.service';
import type { UserDoc } from '../users/user.model';
import type { CommissionRuleDoc } from './commissionRule.model';
import type { AuditLogDoc } from './auditLog.model';

function toUserView(user: UserDoc) {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    roles: user.roles,
    status: user.status,
    createdAt: user.createdAt,
  };
}

function toCommissionRuleView(rule: CommissionRuleDoc) {
  return {
    providerType: rule.providerType,
    percentage: rule.percentage,
    updatedAt: rule.updatedAt,
  };
}

function toAuditLogView(entry: AuditLogDoc) {
  return {
    id: entry._id.toString(),
    actorId: entry.actorId.toString(),
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId.toString(),
    metadata: entry.metadata,
    createdAt: entry.createdAt,
  };
}

export const listUsersHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await adminUserService.listUsers(req.validatedQuery as Record<string, unknown>);
  sendSuccess(res, { users: items.map(toUserView) }, 200, meta);
});

export const setUserStatusHandler = asyncHandler(async (req, res) => {
  const user = await adminUserService.setUserStatus(req.params.id as string, req.user!.id, req.body.status);
  sendSuccess(res, { user: toUserView(user) });
});

export const listCommissionRulesHandler = asyncHandler(async (_req, res) => {
  const rules = await commissionRuleService.listCommissionRules();
  sendSuccess(res, { rules: rules.map(toCommissionRuleView) });
});

export const setCommissionRuleHandler = asyncHandler(async (req, res) => {
  const rule = await commissionRuleService.setCommissionRule(
    req.params.providerType as string,
    req.body.percentage,
    req.user!.id,
  );
  sendSuccess(res, { rule: toCommissionRuleView(rule) });
});

export const getAnalyticsOverviewHandler = asyncHandler(async (_req, res) => {
  const overview = await analyticsService.getOverview();
  sendSuccess(res, overview);
});

export const listAuditLogHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await auditLogService.listAuditLog(req.validatedQuery as Record<string, unknown>);
  sendSuccess(res, { entries: items.map(toAuditLogView) }, 200, meta);
});
