import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as transactionService from './transaction.service';
import type { TransactionDoc } from './transaction.model';

function toTransactionView(t: TransactionDoc) {
  return {
    id: t._id.toString(),
    type: t.type,
    status: t.status,
    patientId: t.patientId.toString(),
    amount: t.amount,
    currency: t.currency,
    supportTicketId: t.supportTicketId.toString(),
    provider: t.provider,
    providerReference: t.providerReference,
    notes: t.notes,
    createdAt: t.createdAt,
  };
}

export const initiateRefundHandler = asyncHandler(async (req, res) => {
  const transaction = await transactionService.initiateRefund(req.params.id as string, req.user!, req.body.amount);
  sendSuccess(res, { transaction: toTransactionView(transaction) }, 201);
});

export const settleTransactionHandler = asyncHandler(async (req, res) => {
  const transaction = await transactionService.settleTransaction(
    req.params.id as string,
    req.user!.id,
    req.body.outcome,
    req.body.notes,
  );
  sendSuccess(res, { transaction: toTransactionView(transaction) });
});

export const listTransactionsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await transactionService.listTransactions(req.query as Record<string, unknown>);
  sendSuccess(res, { transactions: items.map(toTransactionView) }, 200, meta);
});
