import { api } from './apiClient';
import type { PaginationMeta } from '../types/api';
import type { SupportTicket, TicketCategory } from '../types/support';

export async function createTicket(input: {
  subject: string;
  category: TicketCategory;
  description: string;
}): Promise<SupportTicket> {
  const { data } = await api.post<{ ticket: SupportTicket }>('/support/tickets', input);
  return data.ticket;
}

export async function getTicket(id: string): Promise<SupportTicket> {
  const { data } = await api.get<{ ticket: SupportTicket }>(`/support/tickets/${id}`);
  return data.ticket;
}

export async function addMessage(id: string, body: string): Promise<SupportTicket> {
  const { data } = await api.post<{ ticket: SupportTicket }>(`/support/tickets/${id}/messages`, { body });
  return data.ticket;
}

export async function updateTicketStatus(
  id: string,
  action: 'assign_to_me' | 'start_progress' | 'resolve' | 'close' | 'reopen',
  resolutionNote?: string,
): Promise<SupportTicket> {
  const { data } = await api.post<{ ticket: SupportTicket }>(`/support/tickets/${id}/status`, { action, resolutionNote });
  return data.ticket;
}

export async function listMyTickets(): Promise<{ tickets: SupportTicket[]; meta?: PaginationMeta }> {
  const { data, meta } = await api.get<{ tickets: SupportTicket[] }>('/support/tickets/mine');
  return { tickets: data.tickets, meta };
}

export async function listAllTickets(status?: string): Promise<{ tickets: SupportTicket[]; meta?: PaginationMeta }> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const { data, meta } = await api.get<{ tickets: SupportTicket[] }>(`/support/tickets/admin?${params.toString()}`);
  return { tickets: data.tickets, meta };
}
