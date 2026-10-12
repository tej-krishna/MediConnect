import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as medicineService from './medicine.service';
import * as orderService from './order.service';
import type { MedicineItemDoc } from './medicine.model';
import type { OrderDoc } from './order.model';

function toMedicineView(item: MedicineItemDoc) {
  return {
    id: item._id.toString(),
    pharmacyId: item.pharmacyId.toString(),
    name: item.name,
    genericName: item.genericName,
    activeIngredient: item.activeIngredient,
    strength: item.strength,
    dosageForm: item.dosageForm,
    manufacturer: item.manufacturer,
    unitPrice: item.unitPrice,
    stockQuantity: item.stockQuantity,
    requiresPrescription: item.requiresPrescription,
    isActive: item.isActive,
  };
}

function toOrderView(order: OrderDoc) {
  return {
    id: order._id.toString(),
    patientId: order.patientId.toString(),
    pharmacyId: order.pharmacyId.toString(),
    items: order.items.map((i) => ({
      medicineItemId: i.medicineItemId.toString(),
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    totalAmount: order.totalAmount,
    requiresPrescription: order.requiresPrescription,
    hasPrescription: Boolean(order.prescriptionDocument),
    deliveryAddress: order.deliveryAddress,
    status: order.status,
    statusHistory: order.statusHistory,
    createdAt: order.createdAt,
  };
}

export const createMedicineItemHandler = asyncHandler(async (req, res) => {
  const item = await medicineService.createMedicineItem(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, { medicine: toMedicineView(item) }, 201);
});

export const updateMedicineItemHandler = asyncHandler(async (req, res) => {
  const item = await medicineService.updateMedicineItem(
    req.params.id as string,
    req.params.medicineId as string,
    req.user!.id,
    req.body,
  );
  sendSuccess(res, { medicine: toMedicineView(item) });
});

export const listPharmacyMedicinesHandler = asyncHandler(async (req, res) => {
  const items = await medicineService.listPharmacyMedicines(req.params.id as string, req.user!.id);
  sendSuccess(res, { medicines: items.map(toMedicineView) });
});

export const searchMedicinesHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await medicineService.searchMedicines(req.validatedQuery as Record<string, unknown>);
  sendSuccess(res, { medicines: items.map(toMedicineView) }, 200, meta);
});

export const getMedicineHandler = asyncHandler(async (req, res) => {
  const item = await medicineService.getMedicineById(req.params.id as string);
  sendSuccess(res, { medicine: toMedicineView(item) });
});

export const findAlternativesHandler = asyncHandler(async (req, res) => {
  const alternatives = await medicineService.findAlternatives(req.params.id as string);
  sendSuccess(res, {
    alternatives: alternatives.map(toMedicineView),
    disclaimer:
      'These are suitable alternatives for your review with a pharmacist or prescribing clinician — not an automatic substitution.',
  });
});

export const createOrderHandler = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user!.id, req.body);
  sendSuccess(res, { order: toOrderView(order) }, 201);
});

export const uploadPrescriptionHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('A prescription file is required');
  }
  const order = await orderService.uploadPrescription(req.params.id as string, req.user!.id, req.file);
  sendSuccess(res, { order: toOrderView(order) });
});

export const transitionOrderHandler = asyncHandler(async (req, res) => {
  const order = await orderService.transitionOrder(req.params.id as string, req.user!, req.body);
  sendSuccess(res, { order: toOrderView(order) });
});

export const getOrderHandler = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.id as string, req.user!);
  sendSuccess(res, { order: toOrderView(order) });
});

export const listMyOrdersHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await orderService.listMyOrders(req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { orders: items.map(toOrderView) }, 200, meta);
});

export const listPharmacyOrdersHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await orderService.listPharmacyOrders(
    req.params.id as string,
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendSuccess(res, { orders: items.map(toOrderView) }, 200, meta);
});
