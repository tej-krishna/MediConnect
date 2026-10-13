import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { HealthCamp, HealthCampRegistration, type HealthCampDoc } from './healthCamp.model';
import type { CreateHealthCampInput, SearchCampsQuery } from './diagnostics.validation';

const CAMP_PROVIDER_TYPES = new Set(['mobile_van_operator', 'ngo_coordinator']);
const EARTH_RADIUS_KM = 6378.1;

async function assertActiveCampProvider(providerId: string) {
  const provider = await ProviderApplication.findById(providerId);
  if (!provider) {
    throw AppError.notFound('Provider not found');
  }
  if (!CAMP_PROVIDER_TYPES.has(provider.providerType)) {
    throw AppError.badRequest('Only mobile medical van operators and NGO coordinators can schedule camps');
  }
  if (!isActivelyVerified(provider)) {
    throw AppError.conflict('This provider is not currently active and verified');
  }
  return provider;
}

export async function createCamp(
  providerId: string,
  requesterId: string,
  input: CreateHealthCampInput,
): Promise<HealthCampDoc> {
  await assertActiveCampProvider(providerId);
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }

  return HealthCamp.create({
    providerId,
    title: input.title,
    description: input.description ?? null,
    locationDescription: input.locationDescription,
    location: input.location ? { type: 'Point', coordinates: [input.location.lng, input.location.lat] } : undefined,
    scheduledDate: input.scheduledDate,
    startTime: input.startTime,
    endTime: input.endTime,
    servicesOffered: input.servicesOffered,
    capacity: input.capacity,
    createdBy: requesterId,
  });
}

export async function listProviderCamps(providerId: string, requesterId: string): Promise<HealthCampDoc[]> {
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }
  return HealthCamp.find({ providerId }).sort({ scheduledDate: 1 });
}

export async function cancelCamp(providerId: string, campId: string, requesterId: string): Promise<void> {
  if (!(await isProviderMember(providerId, requesterId))) {
    throw AppError.forbidden();
  }
  const camp = await HealthCamp.findOne({ _id: campId, providerId });
  if (!camp) {
    throw AppError.notFound('Camp not found');
  }
  camp.status = 'cancelled';
  await camp.save();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchCamps(query: SearchCampsQuery) {
  const { page, limit, skip } = parsePagination(query as unknown as Record<string, unknown>);
  const baseFilter: Record<string, unknown> = { status: 'scheduled', scheduledDate: { $gte: new Date() } };

  if (query.lat !== undefined && query.lng !== undefined) {
    const radiusRadians = query.radiusKm / EARTH_RADIUS_KM;
    const [items, total] = await Promise.all([
      HealthCamp.aggregate([
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
      HealthCamp.countDocuments({
        ...baseFilter,
        location: { $geoWithin: { $centerSphere: [[query.lng, query.lat], radiusRadians] } },
      }),
    ]);
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  const filter: Record<string, unknown> = { ...baseFilter };
  if (query.city) {
    filter.locationDescription = { $regex: new RegExp(escapeRegex(query.city), 'i') };
  }
  const [items, total] = await Promise.all([
    HealthCamp.find(filter).sort({ scheduledDate: 1 }).skip(skip).limit(limit),
    HealthCamp.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getCampById(campId: string): Promise<HealthCampDoc> {
  if (!Types.ObjectId.isValid(campId)) {
    throw AppError.notFound('Camp not found');
  }
  const camp = await HealthCamp.findOne({ _id: campId, status: 'scheduled' });
  if (!camp) {
    throw AppError.notFound('Camp not found');
  }
  return camp;
}

export async function registerForCamp(campId: string, patientId: string) {
  const campExists = await HealthCamp.exists({ _id: campId });
  if (!campExists) {
    throw AppError.notFound('Camp not found');
  }

  const session = await mongoose.startSession();
  try {
    let registration;
    await session.withTransaction(async () => {
      const reservedCamp = await HealthCamp.findOneAndUpdate(
        {
          _id: campId,
          status: 'scheduled',
          scheduledDate: { $gte: new Date() },
          $expr: { $lt: ['$registeredCount', '$capacity'] },
        },
        { $inc: { registeredCount: 1 } },
        { returnDocument: 'after', session },
      );
      if (!reservedCamp) {
        throw AppError.conflict('This camp is full or no longer accepting registrations');
      }
      try {
        const [created] = await HealthCampRegistration.create([{ campId, patientId }], { session });
        registration = created;
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000) {
          throw AppError.conflict('You are already registered for this camp');
        }
        throw err;
      }
    });
    return registration;
  } finally {
    await session.endSession();
  }
}

export async function cancelRegistration(campId: string, patientId: string): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const registration = await HealthCampRegistration.findOne({ campId, patientId, status: 'registered' }).session(
        session,
      );
      if (!registration) {
        throw AppError.notFound('Registration not found');
      }
      registration.status = 'cancelled';
      await registration.save({ session });
      await HealthCamp.updateOne({ _id: campId }, { $inc: { registeredCount: -1 } }, { session });
    });
  } finally {
    await session.endSession();
  }
}

export async function listMyRegistrations(patientId: string) {
  const registrations = await HealthCampRegistration.find({ patientId, status: 'registered' }).sort({
    registeredAt: -1,
  });
  const campIds = registrations.map((r) => r.campId);
  const camps = await HealthCamp.find({ _id: { $in: campIds } });
  const campsById = new Map(camps.map((c) => [c._id.toString(), c]));
  return registrations.map((r) => ({ registration: r, camp: campsById.get(r.campId.toString()) }));
}
