import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as deliveryService from './deliveryPartner.service';
import type { DeliveryPartnerProfileDoc } from './deliveryPartner.model';

function toProfileView(profile: DeliveryPartnerProfileDoc) {
  return {
    id: profile._id.toString(),
    userId: profile.userId.toString(),
    contactPhone: profile.contactPhone,
    vehicleType: profile.vehicleType,
    serviceCity: profile.serviceCity,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    createdAt: profile.createdAt,
  };
}

export const applyHandler = asyncHandler(async (req, res) => {
  const profile = await deliveryService.apply(req.user!.id, req.body);
  sendSuccess(res, { profile: toProfileView(profile) }, 201);
});

export const getMyProfileHandler = asyncHandler(async (req, res) => {
  const profile = await deliveryService.getMyProfile(req.user!.id);
  if (!profile) {
    throw AppError.notFound('No delivery partner application found');
  }
  sendSuccess(res, { profile: toProfileView(profile) });
});

export const reviewHandler = asyncHandler(async (req, res) => {
  const profile = await deliveryService.review(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { profile: toProfileView(profile) });
});

export const listForAdminHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await deliveryService.listForAdmin(req.query as Record<string, unknown>);
  sendSuccess(res, { profiles: items.map(toProfileView) }, 200, meta);
});

export const listDirectoryHandler = asyncHandler(async (req, res) => {
  const profiles = await deliveryService.listDirectory(req.query.city as string | undefined);
  sendSuccess(res, {
    profiles: profiles.map((p) => ({
      userId: p.userId._id.toString(),
      fullName: p.userId.fullName,
      vehicleType: p.vehicleType,
      serviceCity: p.serviceCity,
    })),
  });
});
