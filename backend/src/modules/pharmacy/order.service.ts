import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { storage } from '../../storage';
import { ProviderApplication } from '../providers/provider.model';
import { isActivelyVerified } from '../providers/provider.service';
import { isProviderMember } from '../providers/providerStaff.service';
import { isApprovedDeliveryPartner } from '../delivery/deliveryPartner.service';
import { MedicineItem } from './medicine.model';
import { Order, ORDER_STATUSES, type OrderDoc } from './order.model';
import type { AssignDeliveryPartnerInput } from '../delivery/delivery.validation';
import type { CreateOrderInput, OrderTransitionInput } from './pharmacy.validation';

type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_prescription: ['cancelled'],
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const ACTION_TO_STATUS: Record<OrderTransitionInput['action'], OrderStatus> = {
  confirm: 'confirmed',
  start_preparing: 'preparing',
  out_for_delivery: 'out_for_delivery',
  deliver: 'delivered',
  cancel: 'cancelled',
};

/**
 * Reserves stock for every line item and creates the order in one transaction: either every item
 * has enough stock and the whole order is placed, or none of the stock changes happen at all. This
 * is the same reasoning as appointment booking (Phase 5) — a check-then-decrement without a
 * transaction has a race window where two concurrent orders could both "see" enough stock.
 */
export async function createOrder(patientId: string, input: CreateOrderInput): Promise<OrderDoc> {
  const pharmacy = await ProviderApplication.findById(input.pharmacyId);
  if (!pharmacy || pharmacy.providerType !== 'pharmacy') {
    throw AppError.notFound('Pharmacy not found');
  }
  if (!isActivelyVerified(pharmacy)) {
    throw AppError.conflict('This pharmacy is not currently active and verified');
  }

  const session = await mongoose.startSession();
  try {
    let order: OrderDoc | undefined;

    await session.withTransaction(async () => {
      const orderItems: { medicineItemId: Types.ObjectId; name: string; quantity: number; unitPrice: number }[] = [];
      let requiresPrescription = false;
      let totalAmount = 0;

      for (const line of input.items) {
        const reserved = await MedicineItem.findOneAndUpdate(
          {
            _id: line.medicineItemId,
            pharmacyId: input.pharmacyId,
            isActive: true,
            stockQuantity: { $gte: line.quantity },
          },
          { $inc: { stockQuantity: -line.quantity } },
          { returnDocument: 'after', session },
        );

        if (!reserved) {
          throw AppError.conflict(`Insufficient stock for one or more items in your order`);
        }

        orderItems.push({
          medicineItemId: reserved._id,
          name: reserved.name,
          quantity: line.quantity,
          unitPrice: reserved.unitPrice,
        });
        totalAmount += reserved.unitPrice * line.quantity;
        requiresPrescription = requiresPrescription || reserved.requiresPrescription;
      }

      const status: OrderStatus = requiresPrescription ? 'pending_prescription' : 'placed';
      const [created] = await Order.create(
        [
          {
            patientId,
            pharmacyId: input.pharmacyId,
            items: orderItems,
            totalAmount,
            requiresPrescription,
            deliveryAddress: input.deliveryAddress,
            status,
            statusHistory: [{ status, changedAt: new Date(), changedBy: patientId }],
          },
        ],
        { session },
      );
      order = created;
    });

    return order as OrderDoc;
  } finally {
    await session.endSession();
  }
}

async function loadOrderOr404(orderId: string): Promise<OrderDoc> {
  if (!Types.ObjectId.isValid(orderId)) {
    throw AppError.notFound('Order not found');
  }
  const order = await Order.findById(orderId);
  if (!order) {
    throw AppError.notFound('Order not found');
  }
  return order;
}

export async function getOrder(orderId: string, requester: { id: string; roles: string[] }): Promise<OrderDoc> {
  const order = await loadOrderOr404(orderId);
  const isPatient = order.patientId.toString() === requester.id;
  const isPharmacyMember = !isPatient && (await isProviderMember(order.pharmacyId.toString(), requester.id));
  if (!isPatient && !isPharmacyMember) {
    throw AppError.forbidden();
  }
  return order;
}

export async function uploadPrescription(
  orderId: string,
  requesterId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<OrderDoc> {
  const order = await loadOrderOr404(orderId);
  if (order.patientId.toString() !== requesterId) {
    throw AppError.forbidden();
  }
  if (order.status !== 'pending_prescription') {
    throw AppError.conflict(`Cannot upload a prescription for an order that is "${order.status}"`);
  }

  const stored = await storage.save({
    buffer: file.buffer,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
  });

  order.prescriptionDocument = {
    storageKey: stored.storageKey,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    uploadedAt: new Date(),
  };
  order.status = 'placed';
  order.statusHistory.push({ status: 'placed', changedAt: new Date(), changedBy: new Types.ObjectId(requesterId) });
  await order.save();
  return order;
}

async function restoreStock(order: OrderDoc, session: mongoose.ClientSession) {
  for (const item of order.items) {
    await MedicineItem.updateOne(
      { _id: item.medicineItemId },
      { $inc: { stockQuantity: item.quantity } },
      { session },
    );
  }
}

export async function assignDeliveryPartner(
  orderId: string,
  requesterId: string,
  input: AssignDeliveryPartnerInput,
): Promise<OrderDoc> {
  const order = await loadOrderOr404(orderId);
  if (!(await isProviderMember(order.pharmacyId.toString(), requesterId))) {
    throw AppError.forbidden();
  }
  if (!['confirmed', 'preparing', 'out_for_delivery'].includes(order.status)) {
    throw AppError.conflict(`Cannot assign a delivery partner while the order is "${order.status}"`);
  }
  if (!(await isApprovedDeliveryPartner(input.deliveryPartnerUserId))) {
    throw AppError.badRequest('That user is not an approved delivery partner');
  }

  order.assignedDeliveryPartnerId = new Types.ObjectId(input.deliveryPartnerUserId);
  await order.save();
  return order;
}

export async function transitionOrder(
  orderId: string,
  requester: { id: string; roles: string[] },
  input: OrderTransitionInput,
): Promise<OrderDoc> {
  const order = await loadOrderOr404(orderId);
  const isPatient = order.patientId.toString() === requester.id;
  const isPharmacyMember = !isPatient && (await isProviderMember(order.pharmacyId.toString(), requester.id));
  const isAssignedDeliveryPartner =
    !isPatient && !isPharmacyMember && order.assignedDeliveryPartnerId?.toString() === requester.id;

  if (!isPatient && !isPharmacyMember && !isAssignedDeliveryPartner) {
    throw AppError.forbidden();
  }
  if (isAssignedDeliveryPartner && input.action !== 'deliver') {
    throw AppError.forbidden('A delivery partner may only confirm delivery');
  }
  if (isPatient && input.action !== 'cancel') {
    throw AppError.forbidden('Patients may only cancel an order');
  }
  if (isPatient && !['pending_prescription', 'placed', 'confirmed'].includes(order.status)) {
    throw AppError.conflict('This order can no longer be cancelled by the patient — contact the pharmacy');
  }

  const targetStatus = ACTION_TO_STATUS[input.action];
  if (!ALLOWED_TRANSITIONS[order.status].includes(targetStatus)) {
    throw AppError.conflict(`Cannot transition from "${order.status}" to "${targetStatus}"`);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (targetStatus === 'cancelled') {
        await restoreStock(order, session);
      }
      order.status = targetStatus;
      order.statusHistory.push({
        status: targetStatus,
        changedAt: new Date(),
        changedBy: new Types.ObjectId(requester.id),
      });
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return order;
}

export async function listMyOrders(patientId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Order.find({ patientId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ patientId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listMyDeliveries(deliveryPartnerUserId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { assignedDeliveryPartnerId: deliveryPartnerUserId };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listPharmacyOrders(pharmacyId: string, requesterId: string, query: Record<string, unknown>) {
  if (!(await isProviderMember(pharmacyId, requesterId))) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Order.find({ pharmacyId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ pharmacyId }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
