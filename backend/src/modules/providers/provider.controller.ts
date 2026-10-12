import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as providerService from './provider.service';

function toPublicApplication(app: Awaited<ReturnType<typeof providerService.getApplicationById>>) {
  return {
    id: app._id.toString(),
    userId: app.userId.toString(),
    providerType: app.providerType,
    organizationName: app.organizationName,
    registrationNumber: app.registrationNumber,
    issuingAuthority: app.issuingAuthority,
    contactPhone: app.contactPhone,
    contactEmail: app.contactEmail,
    address: app.address,
    documents: app.documents.map((doc) => ({
      id: doc._id.toString(),
      documentType: doc.documentType,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.uploadedAt,
    })),
    status: app.status,
    statusHistory: app.statusHistory,
    reviewedBy: app.reviewedBy?.toString() ?? null,
    reviewedAt: app.reviewedAt,
    rejectionReason: app.rejectionReason,
    suspensionReason: app.suspensionReason,
    verifiedAt: app.verifiedAt,
    expiresAt: app.expiresAt,
    flagged: app.flagged,
    flagReasons: app.flagReasons,
    reportCount: app.reports.length,
    isActivelyVerified: providerService.isActivelyVerified(app),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

export const createApplicationHandler = asyncHandler(async (req, res) => {
  const app = await providerService.createApplication(req.user!.id, req.body);
  sendSuccess(res, { application: toPublicApplication(app) }, 201);
});

export const addDocumentHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('A document file is required');
  }
  const app = await providerService.addDocument(
    req.params.id as string,
    req.user!.id,
    req.body.documentType,
    req.file,
  );
  sendSuccess(res, { application: toPublicApplication(app) });
});

export const submitApplicationHandler = asyncHandler(async (req, res) => {
  const app = await providerService.submitApplication(req.params.id as string, req.user!.id);
  sendSuccess(res, { application: toPublicApplication(app) });
});

export const listMineHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await providerService.listMine(req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { applications: items.map(toPublicApplication) }, 200, meta);
});

export const listAdminHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await providerService.listForAdmin(req.query as Record<string, unknown>);
  sendSuccess(res, { applications: items.map(toPublicApplication) }, 200, meta);
});

export const getApplicationHandler = asyncHandler(async (req, res) => {
  const app = await providerService.getApplicationById(req.params.id as string, req.user!);
  sendSuccess(res, { application: toPublicApplication(app) });
});

export const transitionHandler = asyncHandler(async (req, res) => {
  const app = await providerService.transition(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { application: toPublicApplication(app) });
});

export const reportApplicationHandler = asyncHandler(async (req, res) => {
  await providerService.reportApplication(req.params.id as string, req.user!.id, req.body.reason);
  sendSuccess(res, { reported: true });
});

export const downloadDocumentHandler = asyncHandler(async (req, res) => {
  const { buffer, document } = await providerService.getDocumentForDownload(
    req.params.id as string,
    req.params.documentId as string,
    req.user!,
  );
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalFilename)}"`);
  res.send(buffer);
});
