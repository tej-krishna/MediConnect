import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as testService from './diagnosticTest.service';
import * as orderService from './diagnosticOrder.service';
import * as campService from './healthCamp.service';
import type { DiagnosticTestDoc } from './diagnosticTest.model';
import type { DiagnosticOrderDoc } from './diagnosticOrder.model';
import type { HealthCampDoc } from './healthCamp.model';
import type { SearchCampsQuery } from './diagnostics.validation';

function toTestView(test: DiagnosticTestDoc) {
  return {
    id: test._id.toString(),
    labId: test.labId.toString(),
    name: test.name,
    category: test.category,
    sampleType: test.sampleType,
    price: test.price,
    turnaroundHours: test.turnaroundHours,
    homeCollectionAvailable: test.homeCollectionAvailable,
    isActive: test.isActive,
  };
}

function toOrderView(order: DiagnosticOrderDoc) {
  return {
    id: order._id.toString(),
    patientId: order.patientId.toString(),
    labId: order.labId.toString(),
    tests: order.tests.map((t) => ({ testId: t.testId.toString(), name: t.name, price: t.price })),
    totalAmount: order.totalAmount,
    collectionMethod: order.collectionMethod,
    homeAddress: order.homeAddress,
    preferredDateTime: order.preferredDateTime,
    confirmedDateTime: order.confirmedDateTime,
    status: order.status,
    hasReport: Boolean(order.reportDocument),
    createdAt: order.createdAt,
  };
}

function toCampView(camp: HealthCampDoc & { distanceMeters?: number }) {
  return {
    id: camp._id.toString(),
    providerId: camp.providerId.toString(),
    title: camp.title,
    description: camp.description,
    locationDescription: camp.locationDescription,
    location: camp.location?.coordinates ? { lat: camp.location.coordinates[1], lng: camp.location.coordinates[0] } : null,
    scheduledDate: camp.scheduledDate,
    startTime: camp.startTime,
    endTime: camp.endTime,
    servicesOffered: camp.servicesOffered,
    capacity: camp.capacity,
    registeredCount: camp.registeredCount,
    remaining: Math.max(0, camp.capacity - camp.registeredCount),
    status: camp.status,
    ...(camp.distanceMeters !== undefined ? { distanceMeters: Math.round(camp.distanceMeters) } : {}),
  };
}

export const createTestHandler = asyncHandler(async (req, res) => {
  const test = await testService.createTest(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { test: toTestView(test) }, 201);
});

export const updateTestHandler = asyncHandler(async (req, res) => {
  const test = await testService.updateTest(req.params.id as string, req.params.testId as string, req.user!.id, req.body);
  sendSuccess(res, { test: toTestView(test) });
});

export const listLabTestsHandler = asyncHandler(async (req, res) => {
  const tests = await testService.listLabTests(req.params.id as string, req.user!.id);
  sendSuccess(res, { tests: tests.map(toTestView) });
});

export const searchTestsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await testService.searchTests(req.validatedQuery as Record<string, unknown>);
  sendSuccess(res, { tests: items.map(toTestView) }, 200, meta);
});

export const getTestHandler = asyncHandler(async (req, res) => {
  const test = await testService.getTestById(req.params.id as string);
  sendSuccess(res, { test: toTestView(test) });
});

export const createDiagnosticOrderHandler = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user!.id, req.body);
  sendSuccess(res, { order: toOrderView(order) }, 201);
});

export const transitionDiagnosticOrderHandler = asyncHandler(async (req, res) => {
  const order = await orderService.transitionOrder(req.params.id as string, req.user!, req.body);
  sendSuccess(res, { order: toOrderView(order) });
});

export const uploadReportHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('A report file is required');
  }
  const order = await orderService.uploadReport(req.params.id as string, req.user!.id, req.file);
  sendSuccess(res, { order: toOrderView(order) });
});

export const downloadReportHandler = asyncHandler(async (req, res) => {
  const { buffer, document } = await orderService.downloadReport(req.params.id as string, req.user!);
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalFilename)}"`);
  res.send(buffer);
});

export const getDiagnosticOrderHandler = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.id as string, req.user!);
  sendSuccess(res, { order: toOrderView(order) });
});

export const listMyDiagnosticOrdersHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await orderService.listMyOrders(req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { orders: items.map(toOrderView) }, 200, meta);
});

export const listLabOrdersHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await orderService.listLabOrders(
    req.params.id as string,
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendSuccess(res, { orders: items.map(toOrderView) }, 200, meta);
});

export const createCampHandler = asyncHandler(async (req, res) => {
  const camp = await campService.createCamp(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { camp: toCampView(camp) }, 201);
});

export const listProviderCampsHandler = asyncHandler(async (req, res) => {
  const camps = await campService.listProviderCamps(req.params.id as string, req.user!.id);
  sendSuccess(res, { camps: camps.map(toCampView) });
});

export const cancelCampHandler = asyncHandler(async (req, res) => {
  await campService.cancelCamp(req.params.id as string, req.params.campId as string, req.user!.id);
  sendSuccess(res, { cancelled: true });
});

export const searchCampsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await campService.searchCamps(req.validatedQuery as SearchCampsQuery);
  sendSuccess(res, { camps: items.map(toCampView) }, 200, meta);
});

export const getCampHandler = asyncHandler(async (req, res) => {
  const camp = await campService.getCampById(req.params.id as string);
  sendSuccess(res, { camp: toCampView(camp) });
});

export const registerForCampHandler = asyncHandler(async (req, res) => {
  await campService.registerForCamp(req.params.id as string, req.user!.id);
  sendSuccess(res, { registered: true }, 201);
});

export const cancelCampRegistrationHandler = asyncHandler(async (req, res) => {
  await campService.cancelRegistration(req.params.id as string, req.user!.id);
  sendSuccess(res, { cancelled: true });
});

export const listMyCampRegistrationsHandler = asyncHandler(async (req, res) => {
  const results = await campService.listMyRegistrations(req.user!.id);
  sendSuccess(res, {
    registrations: results.map((r) => ({
      campId: r.registration.campId.toString(),
      registeredAt: r.registration.registeredAt,
      camp: r.camp ? toCampView(r.camp) : null,
    })),
  });
});
