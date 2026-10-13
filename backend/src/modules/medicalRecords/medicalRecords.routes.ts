import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { documentUpload } from '../../middleware/upload';
import {
  updateProfileSchema,
  documentMetaSchema,
  createVisitSchema,
  updateVisitSchema,
  inviteCaregiverSchema,
} from './medicalRecords.validation';
import {
  getProfileHandler,
  updateProfileHandler,
  uploadDocumentHandler,
  listDocumentsHandler,
  downloadDocumentHandler,
  deleteDocumentHandler,
  createVisitHandler,
  listVisitsHandler,
  updateVisitHandler,
  deleteVisitHandler,
  inviteCaregiverHandler,
  listMyGrantsHandler,
  revokeGrantHandler,
  listInvitesToMeHandler,
  acceptInviteHandler,
  declineInviteHandler,
  listAccessLogHandler,
} from './medicalRecords.controller';

export const medicalRecordsRouter = Router();

medicalRecordsRouter.use('/medical-records', requireAuth);

// Caregiver relationship management (always "self" as either patient or invited caregiver —
// registered before the ":patientId" routes so "caregivers"/"caregiver-invites" never gets
// mistaken for a patient id).
medicalRecordsRouter.post('/medical-records/caregivers', validateBody(inviteCaregiverSchema), inviteCaregiverHandler);
medicalRecordsRouter.get('/medical-records/caregivers', listMyGrantsHandler);
medicalRecordsRouter.post('/medical-records/caregivers/:grantId/revoke', revokeGrantHandler);
medicalRecordsRouter.get('/medical-records/caregiver-invites', listInvitesToMeHandler);
medicalRecordsRouter.post('/medical-records/caregiver-invites/:grantId/accept', acceptInviteHandler);
medicalRecordsRouter.post('/medical-records/caregiver-invites/:grantId/decline', declineInviteHandler);

// Records, addressed by patient — ":patientId" is either the literal "me" or another user's id
// (only reachable with an active caregiver grant; see medicalRecords.access.ts).
medicalRecordsRouter.get('/medical-records/:patientId/profile', getProfileHandler);
medicalRecordsRouter.patch('/medical-records/:patientId/profile', validateBody(updateProfileSchema), updateProfileHandler);

medicalRecordsRouter.post(
  '/medical-records/:patientId/documents',
  documentUpload.single('document'),
  validateBody(documentMetaSchema),
  uploadDocumentHandler,
);
medicalRecordsRouter.get('/medical-records/:patientId/documents', listDocumentsHandler);
medicalRecordsRouter.get('/medical-records/:patientId/documents/:documentId/download', downloadDocumentHandler);
medicalRecordsRouter.delete('/medical-records/:patientId/documents/:documentId', deleteDocumentHandler);

medicalRecordsRouter.post('/medical-records/:patientId/visits', validateBody(createVisitSchema), createVisitHandler);
medicalRecordsRouter.get('/medical-records/:patientId/visits', listVisitsHandler);
medicalRecordsRouter.patch(
  '/medical-records/:patientId/visits/:visitId',
  validateBody(updateVisitSchema),
  updateVisitHandler,
);
medicalRecordsRouter.delete('/medical-records/:patientId/visits/:visitId', deleteVisitHandler);

medicalRecordsRouter.get('/medical-records/:patientId/access-log', listAccessLogHandler);
