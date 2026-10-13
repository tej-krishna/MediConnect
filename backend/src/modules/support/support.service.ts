import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/response';
import { SupportTicket, TICKET_STATUSES, type SupportTicketDoc } from './supportTicket.model';
import type { CreateTicketInput, AddMessageInput, UpdateTicketStatusInput } from './support.validation';

type TicketStatus = (typeof TICKET_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

const ACTION_TO_STATUS: Record<UpdateTicketStatusInput['action'], TicketStatus | null> = {
  assign_to_me: null,
  start_progress: 'in_progress',
  resolve: 'resolved',
  close: 'closed',
  reopen: 'open',
};

export async function createTicket(createdBy: string, input: CreateTicketInput): Promise<SupportTicketDoc> {
  return SupportTicket.create({
    createdBy,
    subject: input.subject,
    category: input.category,
    description: input.description,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
  });
}

async function loadTicketOr404(ticketId: string): Promise<SupportTicketDoc> {
  if (!Types.ObjectId.isValid(ticketId)) {
    throw AppError.notFound('Ticket not found');
  }
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw AppError.notFound('Ticket not found');
  }
  return ticket;
}

function assertAccess(ticket: SupportTicketDoc, requester: { id: string; roles: string[] }) {
  const isOwner = ticket.createdBy.toString() === requester.id;
  const isStaff = requester.roles.includes('support') || requester.roles.includes('super_admin');
  if (!isOwner && !isStaff) {
    throw AppError.forbidden();
  }
}

export async function getTicket(ticketId: string, requester: { id: string; roles: string[] }): Promise<SupportTicketDoc> {
  const ticket = await loadTicketOr404(ticketId);
  assertAccess(ticket, requester);
  return ticket;
}

export async function addMessage(
  ticketId: string,
  requester: { id: string; roles: string[] },
  input: AddMessageInput,
): Promise<SupportTicketDoc> {
  const ticket = await loadTicketOr404(ticketId);
  assertAccess(ticket, requester);
  if (ticket.status === 'closed') {
    throw AppError.conflict('Cannot message a closed ticket — reopen it first');
  }
  ticket.messages.push({ senderId: new Types.ObjectId(requester.id), body: input.body, sentAt: new Date() });
  await ticket.save();
  return ticket;
}

/**
 * Staff-only lifecycle actions (assign/triage/resolve/close/reopen). The ticket creator
 * can only add messages, never change status — matching the pattern used for order/appointment
 * cancellation where the "customer" side has a narrower action set than the "operator" side.
 */
export async function updateStatus(
  ticketId: string,
  requester: { id: string; roles: string[] },
  input: UpdateTicketStatusInput,
): Promise<SupportTicketDoc> {
  if (!requester.roles.includes('support') && !requester.roles.includes('super_admin')) {
    throw AppError.forbidden();
  }
  const ticket = await loadTicketOr404(ticketId);

  if (input.action === 'assign_to_me') {
    ticket.assignedTo = new Types.ObjectId(requester.id);
    await ticket.save();
    return ticket;
  }

  const targetStatus = ACTION_TO_STATUS[input.action] as TicketStatus;
  if (!ALLOWED_TRANSITIONS[ticket.status].includes(targetStatus)) {
    throw AppError.conflict(`Cannot transition from "${ticket.status}" to "${targetStatus}"`);
  }
  ticket.status = targetStatus;
  if (input.action === 'resolve') {
    ticket.resolutionNote = input.resolutionNote;
  }
  await ticket.save();
  return ticket;
}

export async function listMyTickets(createdBy: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = { createdBy };
  if (typeof query.status === 'string' && query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SupportTicket.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function listAllTickets(requester: { roles: string[] }, query: Record<string, unknown>) {
  if (!requester.roles.includes('support') && !requester.roles.includes('super_admin')) {
    throw AppError.forbidden();
  }
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (typeof query.status === 'string' && query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SupportTicket.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
