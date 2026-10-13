import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { storage } from '../../storage';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { DiagnosticTest } from './diagnosticTest.model';
import { DiagnosticOrder, DIAGNOSTIC_ORDER_STATUSES, type DiagnosticOrderDoc } from './diagnosticOrder.model';
import type { CreateDiagnosticOrderInput, DiagnosticOrderTransitionInput } from './diagnostics.validation';

type Status = (typeof DIAGNOSTIC_ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  requested: ['scheduled', 'cancelled'],
  scheduled: ['sample_collected', 'cancelled'],
  sample_collected: ['processing'],
  processing: ['report_ready'],
  report_ready: [],
  cancelled: [],
};

export async function createOrder(patientId: string, input: CreateDiagnosticOrderInput): Promise<DiagnosticOrderDoc> {
  const lab = await ProviderApplication.findById(input.labId);
  if (!lab || lab.providerType !== 'diagnostic_lab') {
    throw AppError.notFound('Diagnostic lab not found');
  }
  if (!isActivelyVerified(lab)) {
    throw AppError.conflict('This lab is not currently active and verified');
  }

  const tests = await DiagnosticTest.find({ _id: { $in: input.testIds }, labId: input.labId, isActive: true });
  if (tests.length !== input.testIds.length) {
    throw AppError.badRequest('One or more selected tests are not available at this lab');
  }
  if (input.collectionMethod === 'home_collection' && tests.some((t) => !t.homeCollectionAvailable)) {
    throw AppError.badRequest('One or more selected tests do not support home collection');
  }

  const totalAmount = tests.reduce((sum, t) => sum + t.price, 0);

  return DiagnosticOrder.create({
    patientId,
    labId: input.labId,
    tests: tests.map((t) => ({ testId: t._id, name: t.name, price: t.price })),
    totalAmount,
    collectionMethod: input.collectionMethod,
    homeAddress: input.homeAddress ?? null,
    preferredDateTime: input.preferredDateTime,
    status: 'requested',
    statusHistory: [{ status: 'requested', changedAt: new Date(), changedBy: patientId }],
  });
}

async function loadOrderOr404(orderId: string): Promise<DiagnosticOrderDoc> {
  if (!Types.ObjectId.isValid(orderId)) {
    throw AppError.notFound('Order not found');
  }
  const order = await DiagnosticOrder.findById(orderId);
  if (!order) {
    throw AppError.notFound('Order not found');
  }
  return order;
}

export async function getOrder(orderId: string, requester: { id: string; roles: string[] }): Promise<DiagnosticOrderDoc> {
  const order = await loadOrderOr404(orderId);
  const isPatient = order.patientId.toString() === requester.id;
  const isLabMember = !isPatient && (await isProviderMember(order.labId.toString(), requester.id));
  if (!isPatient && !isLabMember) {
    throw AppError.forbidden();
  }
  return order;
}

export async function transitionOrder(
  orderId: string,
  requester: { id: string; roles: string[] },
  input: DiagnosticOrderTransitionInput,
): Promise<DiagnosticOrderDoc> {
  const order = await loadOrderOr404(orderId);
  const isPatient = order.patientId.toString() === requester.id;
  const isLabMember = !isPatient && (await isProviderMember(order.labId.toString(), requester.id));

  if (!isPatient && !isLabMember) {
    throw AppError.forbidden();
  }
  if (isPatient && input.action !== 'cancel') {
    throw AppError.forbidden('Patients may only cancel an order');
  }

  const targetStatus: Status = input.action === 'cancel' ? 'cancelled' : input.action === 'schedule' ? 'scheduled' : input.action === 'mark_collected' ? 'sample_collected' : 'processing';

  if (!ALLOWED_TRANSITIONS[order.status].includes(targetStatus)) {
    throw AppError.conflict(`Cannot transition from "${order.status}" to "${targetStatus}"`);
  }

  if (input.action === 'schedule') {
    order.confirmedDateTime = input.confirmedDateTime;
    if (input.assignedCollector) {
      if (!(await isProviderMember(order.labId.toString(), input.assignedCollector))) {
        throw AppError.badRequest('assignedCollector must be a member of this lab');
      }
      order.assignedCollector = new Types.ObjectId(input.assignedCollector);
    }
  }

  order.status = targetStatus;
  order.statusHistory.push({ status: targetStatus, changedAt: new Date(), changedBy: new Types.ObjectId(requester.id) });
  await order.save();
  return order;
}

export async function uploadReport(
  orderId: string,
  requesterId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<DiagnosticOrderDoc> {
  const order = await loadOrderOr404(orderId);
  if (!(await isProviderMember(order.labId.toString(), requesterId))) {
    throw AppError.forbidden();
  }
  if (order.status !== 'processing') {
    throw AppError.conflict(`Cannot upload a report for an order that is "${order.status}"`);
  }

  const stored = await storage.save({ buffer: file.buffer, originalFilename: file.originalname, mimeType: file.mimetype });
  order.reportDocument = {
    storageKey: stored.storageKey,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    uploadedAt: new Date(),
  };
  order.status = 'report_ready';
  order.statusHistory.push({ status: 'report_ready', changedAt: new Date(), changedBy: new Types.ObjectId(requesterId) });
  await order.save();
  return order;
}

export async function downloadReport(orderId: string, requester: { id: string; roles: string[] }) {
  const order = await getOrder(orderId, requester);
  if (!order.reportDocument) {
    throw AppError.notFound('Report not available yet');
  }
  const buffer = await storage.read(order.reportDocument.storageKey);
  return { buffer, document: order.reportDocument };
}

export async function listMyOrders(patientId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    DiagnosticOrder.find({ patientId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    DiagnosticOrder.countDocuments({ patientId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listLabOrders(labId: string, requesterId: string, query: Record<string, unknown>) {
  if (!(await isProviderMember(labId, requesterId))) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    DiagnosticOrder.find({ labId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    DiagnosticOrder.countDocuments({ labId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
