import { api } from './apiClient';
import type { PaginationMeta } from '../types/api';
import type { Transaction } from '../types/payments';

export async function initiateRefund(ticketId: string, amount: number): Promise<Transaction> {
  const { data } = await api.post<{ transaction: Transaction }>(`/support/tickets/${ticketId}/refund`, { amount });
  return data.transaction;
}

export async function settleTransaction(
  id: string,
  outcome: 'completed' | 'rejected',
  notes?: string,
): Promise<Transaction> {
  const { data } = await api.post<{ transaction: Transaction }>(`/admin/transactions/${id}/settle`, { outcome, notes });
  return data.transaction;
}

export async function listTransactions(): Promise<{ transactions: Transaction[]; meta?: PaginationMeta }> {
  const { data, meta } = await api.get<{ transactions: Transaction[] }>('/admin/transactions');
  return { transactions: data.transactions, meta };
}
