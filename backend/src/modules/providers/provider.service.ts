import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { storage } from '../../storage';
import { User } from '../users/user.model';
import { ProviderApplication, type ProviderApplicationDoc } from './provider.model';
import { ALLOWED_TRANSITIONS, PROVIDER_TYPE_TO_ROLE, type ApplicationStatus } from './provider.types';
import type {
  CreateApplicationInput,
  TransitionInput,
  UpdateListingInfoInput,
  SearchProvidersQuery,
} from './provider.validation';

const ACTIVE_STATUSES: ApplicationStatus[] = ['submitted', 'under_review', 'approved'];
const DEFAULT_VERIFICATION_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;
const EDITABLE_STATUSES: ApplicationStatus[] = ['draft', 'submitted', 'under_review'];

export function isActivelyVerified(app: ProviderApplicationDoc): boolean {
  if (app.status !== 'approved') return false;
  if (!app.expiresAt) return true;
  return app.expiresAt.getTime() > Date.now();
}

async function assertNoActiveDuplicate(
  providerType: string,
  registrationNumber: string,
  applicantUserId: string,
) {
  const conflict = await ProviderApplication.findOne({
    providerType,
    registrationNumber,
    status: { $in: ACTIVE_STATUSES },
  });

  if (conflict && conflict.userId.toString() !== applicantUserId) {
    throw AppError.conflict(
      'This registration number is already associated with another active provider application',
    );
  }

  const ownInProgress = await ProviderApplication.findOne({
    userId: applicantUserId,
    providerType,
    status: { $in: ['draft', 'submitted', 'under_review'] },
  });
  if (ownInProgress) {
    throw AppError.conflict('You already have an in-progress application for this provider type');
  }
}

async function detectSuspiciousSignals(
  contactPhone: string,
  contactEmail: string,
  applicantUserId: string,
): Promise<string[]> {
  const sharedContact = await ProviderApplication.findOne({
    userId: { $ne: applicantUserId },
    $or: [{ contactPhone }, { contactEmail }],
  });

  return sharedContact
    ? ['Contact phone or email is shared with another provider application from a different account']
    : [];
}

function toGeoPoint(location: { lat: number; lng: number } | undefined) {
  return location ? { type: 'Point' as const, coordinates: [location.lng, location.lat] as [number, number] } : undefined;
}

export async function createApplication(
  applicantUserId: string,
  input: CreateApplicationInput,
): Promise<ProviderApplicationDoc> {
  await assertNoActiveDuplicate(input.providerType, input.registrationNumber, applicantUserId);
  const flagReasons = await detectSuspiciousSignals(input.contactPhone, input.contactEmail, applicantUserId);

  return ProviderApplication.create({
    userId: applicantUserId,
    ...input,
    location: toGeoPoint(input.location),
    flagged: flagReasons.length > 0,
    flagReasons,
    statusHistory: [{ status: 'draft', changedAt: new Date(), changedBy: applicantUserId }],
  });
}

async function loadApplicationOr404(applicationId: string): Promise<ProviderApplicationDoc> {
  if (!Types.ObjectId.isValid(applicationId)) {
    throw AppError.notFound('Provider application not found');
  }
  const app = await ProviderApplication.findById(applicationId);
  if (!app) {
    throw AppError.notFound('Provider application not found');
  }
  return app;
}

function assertOwnerOrAdmin(app: ProviderApplicationDoc, requester: { id: string; roles: string[] }) {
  const isOwner = app.userId.toString() === requester.id;
  const isAdmin = requester.roles.includes('super_admin');
  if (!isOwner && !isAdmin) {
    throw AppError.forbidden();
  }
}

export async function getApplicationById(
  applicationId: string,
  requester: { id: string; roles: string[] },
): Promise<ProviderApplicationDoc> {
  const app = await loadApplicationOr404(applicationId);
  assertOwnerOrAdmin(app, requester);
  return app;
}

export async function addDocument(
  applicationId: string,
  requesterId: string,
  documentType: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<ProviderApplicationDoc> {
  const app = await loadApplicationOr404(applicationId);
  if (app.userId.toString() !== requesterId) {
    throw AppError.forbidden();
  }
  if (!EDITABLE_STATUSES.includes(app.status as ApplicationStatus)) {
    throw AppError.conflict(`Cannot add documents while the application is "${app.status}"`);
  }

  const stored = await storage.save({
    buffer: file.buffer,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
  });

  app.documents.push({
    _id: new Types.ObjectId(),
    documentType,
    storageKey: stored.storageKey,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: stored.size,
    uploadedAt: new Date(),
  });

  await app.save();
  return app;
}

export async function submitApplication(
  applicationId: string,
  requesterId: string,
): Promise<ProviderApplicationDoc> {
  const app = await loadApplicationOr404(applicationId);
  if (app.userId.toString() !== requesterId) {
    throw AppError.forbidden();
  }
  if (app.status !== 'draft') {
    throw AppError.conflict(`Cannot submit an application that is "${app.status}"`);
  }
  if (app.documents.length === 0) {
    throw AppError.badRequest('At least one verification document is required before submitting');
  }

  app.status = 'submitted';
  app.statusHistory.push({ status: 'submitted', changedAt: new Date(), changedBy: new Types.ObjectId(requesterId), reason: null });
  await app.save();
  return app;
}

const LISTING_EDITABLE_STATUSES: ApplicationStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'suspended'];

export async function updateListingInfo(
  applicationId: string,
  requesterId: string,
  input: UpdateListingInfoInput,
): Promise<ProviderApplicationDoc> {
  const app = await loadApplicationOr404(applicationId);
  if (app.userId.toString() !== requesterId) {
    throw AppError.forbidden();
  }
  if (!LISTING_EDITABLE_STATUSES.includes(app.status as ApplicationStatus)) {
    throw AppError.conflict(`Cannot update listing info while the application is "${app.status}"`);
  }

  if (input.location) {
    app.location = toGeoPoint(input.location);
  }
  if (input.consultationFee !== undefined) {
    app.consultationFee = input.consultationFee;
  }
  if (input.operatingHoursNote !== undefined) {
    app.operatingHoursNote = input.operatingHoursNote;
  }

  await app.save();
  return app;
}

export async function setAvailability(
  applicationId: string,
  requesterId: string,
  isCurrentlyAvailable: boolean,
): Promise<ProviderApplicationDoc> {
  const app = await loadApplicationOr404(applicationId);
  if (app.userId.toString() !== requesterId) {
    throw AppError.forbidden();
  }
  if (app.providerType !== 'ambulance_provider') {
    throw AppError.badRequest('Only ambulance providers have an availability status');
  }
  app.isCurrentlyAvailable = isCurrentlyAvailable;
  await app.save();
  return app;
}

export async function listMine(userId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    ProviderApplication.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ProviderApplication.countDocuments({ userId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listForAdmin(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (typeof query.status === 'string' && query.status) filter.status = query.status;
  if (typeof query.providerType === 'string' && query.providerType) filter.providerType = query.providerType;

  const [items, total] = await Promise.all([
    ProviderApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ProviderApplication.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

const EARTH_RADIUS_KM = 6378.1;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildVerifiedFilter(providerType?: string): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    status: 'approved',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };
  if (providerType) filter.providerType = providerType;
  return filter;
}

/**
 * Public, unauthenticated provider discovery. Only ever returns providers that are currently
 * actively verified (approved and not past expiry) — never drafts, pending review, rejected,
 * suspended, or expired applications, regardless of what filters are passed in.
 */
export async function searchPublicProviders(query: SearchProvidersQuery) {
  const { page, limit, skip } = parsePagination(query as Record<string, unknown>);
  const baseFilter = buildVerifiedFilter(query.providerType);

  if (query.lat !== undefined && query.lng !== undefined) {
    const radiusRadians = query.radiusKm / EARTH_RADIUS_KM;
    const [items, total] = await Promise.all([
      ProviderApplication.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [query.lng, query.lat] },
            distanceField: 'distanceMeters',
            maxDistance: query.radiusKm * 1000,
            spherical: true,
            query: baseFilter,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]),
      ProviderApplication.countDocuments({
        ...baseFilter,
        location: { $geoWithin: { $centerSphere: [[query.lng, query.lat], radiusRadians] } },
      }),
    ]);
    return { items, meta: buildPaginationMeta(page, limit, total), mode: 'geo' as const };
  }

  const filter: Record<string, unknown> = { ...baseFilter };
  if (query.city) {
    filter['address.city'] = { $regex: new RegExp(escapeRegex(query.city), 'i') };
  }

  const [items, total] = await Promise.all([
    ProviderApplication.find(filter).sort({ organizationName: 1 }).skip(skip).limit(limit),
    ProviderApplication.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total), mode: 'list' as const };
}

export async function getPublicProviderById(applicationId: string) {
  if (!Types.ObjectId.isValid(applicationId)) {
    throw AppError.notFound('Provider not found');
  }
  const app = await ProviderApplication.findOne({ _id: applicationId, ...buildVerifiedFilter() });
  if (!app) {
    throw AppError.notFound('Provider not found');
  }
  return app;
}

async function grantProviderRole(userId: Types.ObjectId, providerType: string) {
  const role = PROVIDER_TYPE_TO_ROLE[providerType as keyof typeof PROVIDER_TYPE_TO_ROLE];
  await User.updateOne({ _id: userId }, { $addToSet: { roles: role } });
}

export async function transition(
  applicationId: string,
  actorId: string,
  input: TransitionInput,
): Promise<ProviderApplicationDoc> {
  const app = await loadApplicationOr404(applicationId);
  const currentStatus = app.status as ApplicationStatus;

  const actionToTargetStatus: Record<TransitionInput['action'], ApplicationStatus> = {
    start_review: 'under_review',
    approve: 'approved',
    reject: 'rejected',
    suspend: 'suspended',
    reinstate: 'approved',
    mark_expired: 'expired',
  };
  const targetStatus = actionToTargetStatus[input.action];

  if (!ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus)) {
    throw AppError.conflict(`Cannot transition from "${currentStatus}" to "${targetStatus}"`);
  }

  if (input.action === 'mark_expired' && (!app.expiresAt || app.expiresAt.getTime() > Date.now())) {
    throw AppError.badRequest('Application has not yet passed its expiry date');
  }

  const now = new Date();
  app.status = targetStatus;
  app.reviewedBy = new Types.ObjectId(actorId);
  app.reviewedAt = now;

  if (input.action === 'approve') {
    app.verifiedAt = now;
    app.expiresAt = input.expiresAt ?? new Date(Date.now() + DEFAULT_VERIFICATION_VALIDITY_MS);
    app.rejectionReason = null;
    if (app.providerType === 'ambulance_provider' && app.isCurrentlyAvailable === null) {
      app.isCurrentlyAvailable = true;
    }
    await grantProviderRole(app.userId, app.providerType);
  } else if (input.action === 'reject') {
    app.rejectionReason = input.reason;
  } else if (input.action === 'suspend') {
    app.suspensionReason = input.reason;
  } else if (input.action === 'reinstate') {
    app.suspensionReason = null;
  }

  const reason = 'reason' in input ? input.reason : null;
  app.statusHistory.push({ status: targetStatus, changedAt: now, changedBy: new Types.ObjectId(actorId), reason });

  await app.save();
  return app;
}

export async function reportApplication(
  applicationId: string,
  reporterId: string,
  reason: string,
): Promise<void> {
  const app = await loadApplicationOr404(applicationId);
  if (app.status === 'draft') {
    throw AppError.badRequest('Cannot report an application that has not been submitted');
  }

  app.reports.push({ reportedBy: new Types.ObjectId(reporterId), reason, reportedAt: new Date() });
  if (app.reports.length >= 3 && !app.flagged) {
    app.flagged = true;
    app.flagReasons.push('Reported by multiple users');
  }
  await app.save();
}

export async function getDocumentForDownload(
  applicationId: string,
  documentId: string,
  requester: { id: string; roles: string[] },
) {
  const app = await getApplicationById(applicationId, requester);
  const doc = app.documents.find((d) => d._id.toString() === documentId);
  if (!doc) {
    throw AppError.notFound('Document not found');
  }
  const buffer = await storage.read(doc.storageKey);
  return { buffer, document: doc };
}
