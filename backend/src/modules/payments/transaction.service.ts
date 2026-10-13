import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { SupportTicket } from '../support/supportTicket.model';
import { recordAudit } from '../admin/auditLog.service';
import { paymentProvider } from './manual.provider';
import { Transaction, type TransactionDoc } from './transaction.model';

/**
 * Opens a refund transaction against a support ticket. Staff-only (same gate as every other
 * support-ticket status action) and only makes sense against a `refund_request` ticket. This
 * records the request and routes it to manual review — it does not and cannot move real money,
 * since no payment gateway is configured (see payment.interface.ts).
 */
export async function initiateRefund(
  ticketId: string,
  requester: { id: string; roles: string[] },
  amount: number,
): Promise<TransactionDoc> {
  if (!requester.roles.includes('support') && !requester.roles.includes('super_admin')) {
    throw AppError.forbidden();
  }
  if (!Types.ObjectId.isValid(ticketId)) {
    throw AppError.notFound('Ticket not found');
  }
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw AppError.notFound('Ticket not found');
  }
  if (ticket.category !== 'refund_request') {
    throw AppError.conflict('A refund can only be initiated for a refund_request ticket');
  }

  const existing = await Transaction.findOne({ supportTicketId: ticket._id, status: 'pending_manual_review' });
  if (existing) {
    throw AppError.conflict('A refund is already pending manual review for this ticket');
  }

  const { providerReference } = await paymentProvider.initiateRefund({
    amount,
    currency: 'INR',
    reference: ticket._id.toString(),
  });

  const transaction = await Transaction.create({
    type: 'refund',
    patientId: ticket.createdBy,
    amount,
    currency: 'INR',
    supportTicketId: ticket._id,
    provider: 'manual',
    providerReference,
  });

  return transaction;
}

export async function settleTransaction(
  transactionId: string,
  actorId: string,
  outcome: 'completed' | 'rejected',
  notes?: string,
): Promise<TransactionDoc> {
  if (!Types.ObjectId.isValid(transactionId)) {
    throw AppError.notFound('Transaction not found');
  }
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw AppError.notFound('Transaction not found');
  }
  if (transaction.status !== 'pending_manual_review') {
    throw AppError.conflict(`Cannot settle a transaction that is "${transaction.status}"`);
  }

  transaction.status = outcome;
  transaction.settledBy = new Types.ObjectId(actorId);
  transaction.settledAt = new Date();
  if (notes) transaction.notes = notes;
  await transaction.save();

  await recordAudit({
    actorId,
    action: 'transaction_settled',
    targetType: 'Transaction',
    targetId: transactionId,
    metadata: { outcome },
  });

  return transaction;
}

export async function listTransactions(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (typeof query.status === 'string' && query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
