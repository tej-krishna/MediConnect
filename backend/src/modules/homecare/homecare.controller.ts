import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as offeringService from './careOffering.service';
import * as requestService from './careRequest.service';
import type { CareOfferingDoc } from './careOffering.model';
import type { CareRequestDoc } from './careRequest.model';

function toOfferingView(offering: CareOfferingDoc) {
  return {
    id: offering._id.toString(),
    providerId: offering.providerId.toString(),
    name: offering.name,
    category: offering.category,
    offeringType: offering.offeringType,
    price: offering.price,
    availableQuantity: offering.availableQuantity,
    isActive: offering.isActive,
  };
}

function toRequestView(request: CareRequestDoc) {
  return {
    id: request._id.toString(),
    patientId: request.patientId.toString(),
    providerId: request.providerId.toString(),
    offeringId: request.offeringId.toString(),
    offeringType: request.offeringType,
    offeringNameSnapshot: request.offeringNameSnapshot,
    quantity: request.quantity,
    unitPriceSnapshot: request.unitPriceSnapshot,
    totalAmount: request.totalAmount,
    preferredDate: request.preferredDate,
    expectedReturnDate: request.expectedReturnDate,
    deliveryAddress: request.deliveryAddress,
    notes: request.notes,
    status: request.status,
    statusHistory: request.statusHistory,
    createdAt: request.createdAt,
  };
}

export const createOfferingHandler = asyncHandler(async (req, res) => {
  const offering = await offeringService.createOffering(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { offering: toOfferingView(offering) }, 201);
});

export const updateOfferingHandler = asyncHandler(async (req, res) => {
  const offering = await offeringService.updateOffering(req.params.offeringId as string, req.user!.id, req.body);
  sendSuccess(res, { offering: toOfferingView(offering) });
});

export const listProviderOfferingsHandler = asyncHandler(async (req, res) => {
  const offerings = await offeringService.listProviderOfferings(req.params.id as string, req.user!.id);
  sendSuccess(res, { offerings: offerings.map(toOfferingView) });
});

export const searchOfferingsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await offeringService.searchPublicOfferings(req.validatedQuery as Record<string, unknown>);
  sendSuccess(res, { offerings: items.map(toOfferingView) }, 200, meta);
});

export const getOfferingHandler = asyncHandler(async (req, res) => {
  const offering = await offeringService.getPublicOfferingById(req.params.id as string);
  sendSuccess(res, { offering: toOfferingView(offering) });
});

export const createCareRequestHandler = asyncHandler(async (req, res) => {
  const request = await requestService.createCareRequest(req.user!.id, req.body);
  sendSuccess(res, { request: toRequestView(request) }, 201);
});

export const transitionCareRequestHandler = asyncHandler(async (req, res) => {
  const request = await requestService.transitionCareRequest(req.params.id as string, req.user!, req.body);
  sendSuccess(res, { request: toRequestView(request) });
});

export const getCareRequestHandler = asyncHandler(async (req, res) => {
  const request = await requestService.getCareRequest(req.params.id as string, req.user!);
  sendSuccess(res, { request: toRequestView(request) });
});

export const listMyCareRequestsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await requestService.listMyCareRequests(req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { requests: items.map(toRequestView) }, 200, meta);
});

export const listProviderCareRequestsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await requestService.listProviderCareRequests(
    req.params.id as string,
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendSuccess(res, { requests: items.map(toRequestView) }, 200, meta);
});
