import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as supportService from './support.service';
import type { SupportTicketDoc } from './supportTicket.model';

function toTicketView(ticket: SupportTicketDoc) {
  return {
    id: ticket._id.toString(),
    createdBy: ticket.createdBy.toString(),
    subject: ticket.subject,
    category: ticket.category,
    relatedEntityType: ticket.relatedEntityType,
    relatedEntityId: ticket.relatedEntityId?.toString() ?? null,
    description: ticket.description,
    status: ticket.status,
    assignedTo: ticket.assignedTo?.toString() ?? null,
    resolutionNote: ticket.resolutionNote,
    messages: ticket.messages.map((m) => ({
      senderId: m.senderId.toString(),
      body: m.body,
      sentAt: m.sentAt,
    })),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export const createTicketHandler = asyncHandler(async (req, res) => {
  const ticket = await supportService.createTicket(req.user!.id, req.body);
  sendSuccess(res, { ticket: toTicketView(ticket) }, 201);
});

export const getTicketHandler = asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicket(req.params.id as string, req.user!);
  sendSuccess(res, { ticket: toTicketView(ticket) });
});

export const addMessageHandler = asyncHandler(async (req, res) => {
  const ticket = await supportService.addMessage(req.params.id as string, req.user!, req.body);
  sendSuccess(res, { ticket: toTicketView(ticket) });
});

export const updateStatusHandler = asyncHandler(async (req, res) => {
  const ticket = await supportService.updateStatus(req.params.id as string, req.user!, req.body);
  sendSuccess(res, { ticket: toTicketView(ticket) });
});

export const listMyTicketsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await supportService.listMyTickets(req.user!.id, req.query as Record<string, unknown>);
  sendSuccess(res, { tickets: items.map(toTicketView) }, 200, meta);
});

export const listAllTicketsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await supportService.listAllTickets(req.user!, req.query as Record<string, unknown>);
  sendSuccess(res, { tickets: items.map(toTicketView) }, 200, meta);
});
