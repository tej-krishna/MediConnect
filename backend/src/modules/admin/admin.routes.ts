import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  listUsersQuerySchema,
  setUserStatusSchema,
  setCommissionRuleSchema,
  listAuditLogQuerySchema,
} from './admin.validation';
import {
  listUsersHandler,
  setUserStatusHandler,
  listCommissionRulesHandler,
  setCommissionRuleHandler,
  getAnalyticsOverviewHandler,
  listAuditLogHandler,
} from './admin.controller';
import { settleTransactionSchema } from '../payments/transaction.validation';
import { settleTransactionHandler, listTransactionsHandler } from '../payments/transaction.controller';

export const adminRouter = Router();

adminRouter.use('/admin', requireAuth, requireRole('super_admin'));

adminRouter.get('/admin/users', validateQuery(listUsersQuerySchema), listUsersHandler);
adminRouter.patch('/admin/users/:id/status', validateBody(setUserStatusSchema), setUserStatusHandler);

adminRouter.get('/admin/commission-rules', listCommissionRulesHandler);
adminRouter.patch(
  '/admin/commission-rules/:providerType',
  validateBody(setCommissionRuleSchema),
  setCommissionRuleHandler,
);

adminRouter.get('/admin/analytics/overview', getAnalyticsOverviewHandler);
adminRouter.get('/admin/audit-log', validateQuery(listAuditLogQuerySchema), listAuditLogHandler);

adminRouter.get('/admin/transactions', listTransactionsHandler);
adminRouter.post(
  '/admin/transactions/:id/settle',
  validateBody(settleTransactionSchema),
  settleTransactionHandler,
);
