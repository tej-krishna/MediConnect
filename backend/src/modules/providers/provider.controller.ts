import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as providerService from './provider.service';
import type { SearchProvidersQuery } from './provider.validation';

function toLatLng(location: { coordinates?: [number, number] } | null | undefined) {
  return location?.coordinates ? { lat: location.coordinates[1], lng: location.coordinates[0] } : null;
}

/** Owner/admin view — includes everything, including fields never shown to the public. */
function toApplicationView(app: Awaited<ReturnType<typeof providerService.getApplicationById>>) {
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
    location: toLatLng(app.location),
    consultationFee: app.consultationFee,
    operatingHoursNote: app.operatingHoursNote,
    isCurrentlyAvailable: app.isCurrentlyAvailable,
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

/**
 * Public, unauthenticated view — deliberately excludes registrationNumber, contactEmail,
 * documents, statusHistory, reports/flagged, and anything else not meant for patients browsing
 * without an account.
 */
function toPublicListing(app: {
  _id: unknown;
  providerType: string;
  organizationName: string;
  contactPhone: string;
  address: unknown;
  location?: { coordinates?: [number, number] } | null;
  consultationFee: number | null;
  operatingHoursNote: string | null;
  verifiedAt: Date | null;
  isCurrentlyAvailable?: boolean | null;
  distanceMeters?: number;
}) {
  return {
    id: String(app._id),
    providerType: app.providerType,
    organizationName: app.organizationName,
    contactPhone: app.contactPhone,
    address: app.address,
    location: toLatLng(app.location),
    consultationFee: app.consultationFee,
    operatingHoursNote: app.operatingHoursNote,
    verifiedAt: app.verifiedAt,
    isCurrentlyAvailable: app.isCurrentlyAvailable ?? null,
    ...(app.distanceMeters !== undefined ? { distanceMeters: Math.round(app.distanceMeters) } : {}),
  };
}

export const createApplicationHandler = asyncHandler(async (req, res) => {
  const app = await providerService.createApplication(req.user!.id, req.body);
  sendSuccess(res, { application: toApplicationView(app) }, 201);
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
  sendSuccess(res, { application: toApplicationView(app) });
});

export const submitApplicationHandler = asyncHandler(async (req, res) => {
  const app = await providerService.submitApplication(req.params.id as string, req.user!.id);
  sendSuccess(res, { application: toApplicationView(app) });
});

export const listMineHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await providerService.listMine(req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { applications: items.map(toApplicationView) }, 200, meta);
});

export const listAdminHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await providerService.listForAdmin(req.query as Record<string, unknown>);
  sendSuccess(res, { applications: items.map(toApplicationView) }, 200, meta);
});

export const getApplicationHandler = asyncHandler(async (req, res) => {
  const app = await providerService.getApplicationById(req.params.id as string, req.user!);
  sendSuccess(res, { application: toApplicationView(app) });
});

export const transitionHandler = asyncHandler(async (req, res) => {
  const app = await providerService.transition(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { application: toApplicationView(app) });
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

export const updateListingInfoHandler = asyncHandler(async (req, res) => {
  const app = await providerService.updateListingInfo(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { application: toApplicationView(app) });
});

export const setAvailabilityHandler = asyncHandler(async (req, res) => {
  const app = await providerService.setAvailability(req.params.id as string, req.user!.id, req.body.isCurrentlyAvailable);
  sendSuccess(res, { application: toApplicationView(app) });
});

export const searchPublicProvidersHandler = asyncHandler(async (req, res) => {
  const query = req.validatedQuery as SearchProvidersQuery;
  const { items, meta } = await providerService.searchPublicProviders(query);
  sendSuccess(res, { providers: items.map(toPublicListing) }, 200, meta);
});

export const getPublicProviderHandler = asyncHandler(async (req, res) => {
  const app = await providerService.getPublicProviderById(req.params.id as string);
  sendSuccess(res, { provider: toPublicListing(app) });
});
