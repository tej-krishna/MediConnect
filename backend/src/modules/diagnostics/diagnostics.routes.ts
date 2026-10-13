import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { documentUpload } from '../../middleware/upload';
import {
  createTestSchema,
  updateTestSchema,
  searchTestsQuerySchema,
  createDiagnosticOrderSchema,
  diagnosticOrderTransitionSchema,
  createHealthCampSchema,
  searchCampsQuerySchema,
} from './diagnostics.validation';
import {
  createTestHandler,
  updateTestHandler,
  listLabTestsHandler,
  searchTestsHandler,
  getTestHandler,
  createDiagnosticOrderHandler,
  transitionDiagnosticOrderHandler,
  uploadReportHandler,
  downloadReportHandler,
  getDiagnosticOrderHandler,
  listMyDiagnosticOrdersHandler,
  listLabOrdersHandler,
  createCampHandler,
  listProviderCampsHandler,
  cancelCampHandler,
  searchCampsHandler,
  getCampHandler,
  registerForCampHandler,
  cancelCampRegistrationHandler,
  listMyCampRegistrationsHandler,
} from './diagnostics.controller';

export const diagnosticsRouter = Router();

// Public, unauthenticated discovery.
diagnosticsRouter.get('/diagnostic-tests/search', validateQuery(searchTestsQuerySchema), searchTestsHandler);
diagnosticsRouter.get('/diagnostic-tests/:id', getTestHandler);
diagnosticsRouter.get('/health-camps/search', validateQuery(searchCampsQuerySchema), searchCampsHandler);
diagnosticsRouter.get('/health-camps/:id', getCampHandler);

diagnosticsRouter.use('/providers/applications/:id/diagnostic-tests', requireAuth);
diagnosticsRouter.post(
  '/providers/applications/:id/diagnostic-tests',
  validateBody(createTestSchema),
  createTestHandler,
);
diagnosticsRouter.get('/providers/applications/:id/diagnostic-tests', listLabTestsHandler);
diagnosticsRouter.patch(
  '/providers/applications/:id/diagnostic-tests/:testId',
  validateBody(updateTestSchema),
  updateTestHandler,
);

diagnosticsRouter.get('/providers/applications/:id/diagnostic-orders', requireAuth, listLabOrdersHandler);

diagnosticsRouter.use('/providers/applications/:id/health-camps', requireAuth);
diagnosticsRouter.post(
  '/providers/applications/:id/health-camps',
  validateBody(createHealthCampSchema),
  createCampHandler,
);
diagnosticsRouter.get('/providers/applications/:id/health-camps', listProviderCampsHandler);
diagnosticsRouter.delete('/providers/applications/:id/health-camps/:campId', cancelCampHandler);

diagnosticsRouter.use('/diagnostic-orders', requireAuth);
diagnosticsRouter.post('/diagnostic-orders', validateBody(createDiagnosticOrderSchema), createDiagnosticOrderHandler);
diagnosticsRouter.get('/diagnostic-orders/mine', listMyDiagnosticOrdersHandler);
diagnosticsRouter.get('/diagnostic-orders/:id', getDiagnosticOrderHandler);
diagnosticsRouter.post(
  '/diagnostic-orders/:id/transition',
  validateBody(diagnosticOrderTransitionSchema),
  transitionDiagnosticOrderHandler,
);
diagnosticsRouter.post('/diagnostic-orders/:id/report', documentUpload.single('report'), uploadReportHandler);
diagnosticsRouter.get('/diagnostic-orders/:id/report/download', downloadReportHandler);

diagnosticsRouter.use('/health-camps/:id/register', requireAuth);
diagnosticsRouter.post('/health-camps/:id/register', registerForCampHandler);
diagnosticsRouter.post('/health-camps/:id/cancel-registration', requireAuth, cancelCampRegistrationHandler);
diagnosticsRouter.get('/health-camps/registrations/mine', requireAuth, listMyCampRegistrationsHandler);
