import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { documentUpload } from '../../middleware/upload';
import {
  createApplicationSchema,
  documentMetaSchema,
  reportSchema,
  transitionSchema,
} from './provider.validation';
import {
  createApplicationHandler,
  addDocumentHandler,
  submitApplicationHandler,
  listMineHandler,
  listAdminHandler,
  getApplicationHandler,
  transitionHandler,
  reportApplicationHandler,
  downloadDocumentHandler,
} from './provider.controller';

export const providerRouter = Router();

providerRouter.use('/providers', requireAuth);

providerRouter.get('/providers/admin', requireRole('super_admin'), listAdminHandler);
providerRouter.post('/providers/admin/:id/transition', requireRole('super_admin'), validateBody(transitionSchema), transitionHandler);

providerRouter.post('/providers/applications', validateBody(createApplicationSchema), createApplicationHandler);
providerRouter.get('/providers/applications/mine', listMineHandler);
providerRouter.get('/providers/applications/:id', getApplicationHandler);
providerRouter.post(
  '/providers/applications/:id/documents',
  documentUpload.single('document'),
  validateBody(documentMetaSchema),
  addDocumentHandler,
);
providerRouter.get('/providers/applications/:id/documents/:documentId/download', downloadDocumentHandler);
providerRouter.post('/providers/applications/:id/submit', submitApplicationHandler);
providerRouter.post('/providers/applications/:id/report', validateBody(reportSchema), reportApplicationHandler);
