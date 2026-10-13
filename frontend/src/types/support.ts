export type TicketCategory = 'complaint' | 'dispute' | 'refund_request' | 'general';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketMessage {
  senderId: string;
  body: string;
  sentAt: string;
}

export interface SupportTicket {
  id: string;
  createdBy: string;
  subject: string;
  category: TicketCategory;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  description: string;
  status: TicketStatus;
  assignedTo: string | null;
  resolutionNote: string | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  complaint: 'Complaint',
  dispute: 'Dispute',
  refund_request: 'Refund request',
  general: 'General question',
};
