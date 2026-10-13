import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { resolvePatientId } from './medicalRecords.access';
import * as profileService from './medicalProfile.service';
import * as documentService from './medicalDocument.service';
import * as visitService from './visitRecord.service';
import * as caregiverService from './caregiverAccess.service';
import * as auditService from './recordAccessLog.service';
import type { MedicalProfileDoc } from './medicalProfile.model';
import type { MedicalDocumentDoc } from './medicalDocument.model';
import type { VisitRecordDoc } from './visitRecord.model';
import type { CaregiverAccessDoc } from './caregiverAccess.model';
import type { RecordAccessLogDoc } from './recordAccessLog.model';

function toProfileView(profile: MedicalProfileDoc | null) {
  if (!profile) return null;
  return {
    patientId: profile.patientId.toString(),
    bloodType: profile.bloodType,
    allergies: profile.allergies,
    chronicConditions: profile.chronicConditions,
    currentMedications: profile.currentMedications,
    updatedAt: profile.updatedAt,
  };
}

function toDocumentView(doc: MedicalDocumentDoc) {
  return {
    id: doc._id.toString(),
    patientId: doc.patientId.toString(),
    documentType: doc.documentType,
    title: doc.title,
    visitDate: doc.visitDate,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    createdAt: doc.createdAt,
  };
}

function toVisitView(visit: VisitRecordDoc) {
  return {
    id: visit._id.toString(),
    patientId: visit.patientId.toString(),
    visitDate: visit.visitDate,
    reasonForVisit: visit.reasonForVisit,
    notes: visit.notes,
  };
}

function toGrantView(grant: CaregiverAccessDoc) {
  return {
    id: grant._id.toString(),
    patientId: grant.patientId.toString(),
    caregiverId: grant.caregiverId.toString(),
    scopes: grant.scopes,
    status: grant.status,
    expiresAt: grant.expiresAt,
    invitedAt: grant.invitedAt,
  };
}

function toLogView(log: RecordAccessLogDoc) {
  return {
    id: log._id.toString(),
    accessedBy: log.accessedBy.toString(),
    action: log.action,
    timestamp: log.timestamp,
  };
}

export const getProfileHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const profile = await profileService.getProfile(patientId, req.user!.id);
  sendSuccess(res, { profile: toProfileView(profile) });
});

export const updateProfileHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const profile = await profileService.updateProfile(patientId, req.user!.id, req.body);
  sendSuccess(res, { profile: toProfileView(profile) });
});

export const uploadDocumentHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('A file is required');
  }
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const doc = await documentService.uploadDocument(patientId, req.user!.id, req.body, req.file);
  sendSuccess(res, { document: toDocumentView(doc) }, 201);
});

export const listDocumentsHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const { items, meta } = await documentService.listDocuments(patientId, req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { documents: items.map(toDocumentView) }, 200, meta);
});

export const downloadDocumentHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const { buffer, document } = await documentService.downloadDocument(
    patientId,
    req.params.documentId as string,
    req.user!.id,
  );
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalFilename)}"`);
  res.send(buffer);
});

export const deleteDocumentHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  await documentService.deleteDocument(patientId, req.params.documentId as string, req.user!.id);
  sendSuccess(res, { deleted: true });
});

export const createVisitHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const visit = await visitService.createVisit(patientId, req.user!.id, req.body);
  sendSuccess(res, { visit: toVisitView(visit) }, 201);
});

export const listVisitsHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const { items, meta } = await visitService.listVisits(patientId, req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { visits: items.map(toVisitView) }, 200, meta);
});

export const updateVisitHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const visit = await visitService.updateVisit(patientId, req.params.visitId as string, req.user!.id, req.body);
  sendSuccess(res, { visit: toVisitView(visit) });
});

export const deleteVisitHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  await visitService.deleteVisit(patientId, req.params.visitId as string, req.user!.id);
  sendSuccess(res, { deleted: true });
});

export const inviteCaregiverHandler = asyncHandler(async (req, res) => {
  const grant = await caregiverService.inviteCaregiver(req.user!.id, req.body);
  sendSuccess(res, { grant: toGrantView(grant) }, 201);
});

export const listMyGrantsHandler = asyncHandler(async (req, res) => {
  const grants = await caregiverService.listMyGrants(req.user!.id);
  sendSuccess(res, { grants: grants.map(toGrantView) });
});

export const revokeGrantHandler = asyncHandler(async (req, res) => {
  await caregiverService.revokeGrant(req.user!.id, req.params.grantId as string);
  sendSuccess(res, { revoked: true });
});

export const listInvitesToMeHandler = asyncHandler(async (req, res) => {
  const grants = await caregiverService.listInvitesToMe(req.user!.id);
  sendSuccess(res, { grants: grants.map(toGrantView) });
});

export const acceptInviteHandler = asyncHandler(async (req, res) => {
  const grant = await caregiverService.respondToInvite(req.params.grantId as string, req.user!.id, true);
  sendSuccess(res, { grant: toGrantView(grant) });
});

export const declineInviteHandler = asyncHandler(async (req, res) => {
  const grant = await caregiverService.respondToInvite(req.params.grantId as string, req.user!.id, false);
  sendSuccess(res, { grant: toGrantView(grant) });
});

export const listAccessLogHandler = asyncHandler(async (req, res) => {
  const patientId = resolvePatientId(req.params.patientId as string, req.user!.id);
  const { items, meta } = await auditService.listAccessLog(patientId, req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { logs: items.map(toLogView) }, 200, meta);
});
