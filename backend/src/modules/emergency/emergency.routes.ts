import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createGuideSchema, updateGuideSchema } from './emergency.validation';
import {
  createGuideHandler,
  updateGuideHandler,
  deleteGuideHandler,
  listAllGuidesHandler,
  listActiveGuidesHandler,
} from './emergency.controller';

export const emergencyRouter = Router();

// Public — a patient in an emergency should never have to log in to see red-flag guidance.
emergencyRouter.get('/emergency/guides', listActiveGuidesHandler);

emergencyRouter.use('/emergency/admin', requireAuth, requireRole('super_admin'));
emergencyRouter.get('/emergency/admin/guides', listAllGuidesHandler);
emergencyRouter.post('/emergency/admin/guides', validateBody(createGuideSchema), createGuideHandler);
emergencyRouter.patch('/emergency/admin/guides/:id', validateBody(updateGuideSchema), updateGuideHandler);
emergencyRouter.delete('/emergency/admin/guides/:id', deleteGuideHandler);
