import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { CareOffering, type CareOfferingDoc } from './careOffering.model';
import type { CreateCareOfferingInput, UpdateCareOfferingInput, SearchCareOfferingsQuery } from './homecare.validation';

const HOMECARE_PROVIDER_TYPE = 'equipment_provider';

async function assertHomecareProviderMember(providerId: string, requesterId: string): Promise<void> {
  const app = await ProviderApplication.findById(providerId);
  if (!app || app.providerType !== HOMECARE_PROVIDER_TYPE) {
    throw AppError.notFound('Home healthcare / equipment provider not found');
  }
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }
}

export async function createOffering(
  providerId: string,
  requesterId: string,
  input: CreateCareOfferingInput,
): Promise<CareOfferingDoc> {
  await assertHomecareProviderMember(providerId, requesterId);
  return CareOffering.create({ ...input, providerId, createdBy: requesterId });
}

async function loadOfferingOr404(offeringId: string): Promise<CareOfferingDoc> {
  if (!Types.ObjectId.isValid(offeringId)) {
    throw AppError.notFound('Offering not found');
  }
  const offering = await CareOffering.findById(offeringId);
  if (!offering) {
    throw AppError.notFound('Offering not found');
  }
  return offering;
}

export async function updateOffering(
  offeringId: string,
  requesterId: string,
  input: UpdateCareOfferingInput,
): Promise<CareOfferingDoc> {
  const offering = await loadOfferingOr404(offeringId);
  if (!(await isProviderMember(offering.providerId.toString(), requesterId))) {
    throw AppError.forbidden();
  }
  Object.assign(offering, input);
  await offering.save();
  return offering;
}

export async function listProviderOfferings(providerId: string, requesterId: string) {
  await assertHomecareProviderMember(providerId, requesterId);
  return CareOffering.find({ providerId }).sort({ createdAt: -1 });
}

/**
 * Public search mirrors the pharmacy medicine search (Phase 6): only surfaces offerings
 * belonging to a provider that is currently actively verified, and only active offerings.
 */
export async function searchPublicOfferings(query: SearchCareOfferingsQuery) {
  const { page, limit, skip } = parsePagination(query as Record<string, unknown>);

  const verifiedProviderIds = await ProviderApplication.find({
    providerType: HOMECARE_PROVIDER_TYPE,
    status: 'approved',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).distinct('_id');

  const filter: Record<string, unknown> = {
    providerId: { $in: verifiedProviderIds },
    isActive: true,
  };
  if (query.offeringType) filter.offeringType = query.offeringType;
  if (query.query) filter.$text = { $search: query.query };

  const [items, total] = await Promise.all([
    CareOffering.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CareOffering.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getPublicOfferingById(offeringId: string): Promise<CareOfferingDoc> {
  const offering = await loadOfferingOr404(offeringId);
  const provider = await ProviderApplication.findById(offering.providerId);
  if (!offering.isActive || !provider || !isActivelyVerified(provider)) {
    throw AppError.notFound('Offering not found');
  }
  return offering;
}
