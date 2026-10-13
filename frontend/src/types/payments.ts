export type TransactionStatus = 'pending_manual_review' | 'completed' | 'rejected';

export interface Transaction {
  id: string;
  type: 'refund';
  status: TransactionStatus;
  patientId: string;
  amount: number;
  currency: string;
  supportTicketId: string;
  provider: string;
  providerReference: string | null;
  notes?: string;
  createdAt: string;
}
