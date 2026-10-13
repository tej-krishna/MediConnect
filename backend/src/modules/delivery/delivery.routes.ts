import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { applyDeliveryPartnerSchema, reviewDeliveryPartnerSchema } from './delivery.validation';
import {
  applyHandler,
  getMyProfileHandler,
  reviewHandler,
  listForAdminHandler,
  listDirectoryHandler,
} from './delivery.controller';
import { z } from 'zod';

export const deliveryRouter = Router();

const listQuerySchema = z.object({ status: z.string().optional(), page: z.string().optional(), limit: z.string().optional() });

deliveryRouter.use('/delivery-partners', requireAuth);
deliveryRouter.post('/delivery-partners/apply', validateBody(applyDeliveryPartnerSchema), applyHandler);
deliveryRouter.get('/delivery-partners/me', getMyProfileHandler);
deliveryRouter.get('/delivery-partners/directory', listDirectoryHandler);
deliveryRouter.get(
  '/delivery-partners',
  requireRole('super_admin', 'support'),
  validateQuery(listQuerySchema),
  listForAdminHandler,
);
deliveryRouter.post(
  '/delivery-partners/:id/review',
  requireRole('super_admin'),
  validateBody(reviewDeliveryPartnerSchema),
  reviewHandler,
);
