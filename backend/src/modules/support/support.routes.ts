import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
  listTicketsQuerySchema,
} from './support.validation';
import {
  createTicketHandler,
  getTicketHandler,
  addMessageHandler,
  updateStatusHandler,
  listMyTicketsHandler,
  listAllTicketsHandler,
} from './support.controller';

export const supportRouter = Router();

supportRouter.use('/support/tickets', requireAuth);

supportRouter.post('/support/tickets', validateBody(createTicketSchema), createTicketHandler);
supportRouter.get('/support/tickets/mine', listMyTicketsHandler);
supportRouter.get(
  '/support/tickets/admin',
  requireRole('support', 'super_admin'),
  validateQuery(listTicketsQuerySchema),
  listAllTicketsHandler,
);
supportRouter.get('/support/tickets/:id', getTicketHandler);
supportRouter.post('/support/tickets/:id/messages', validateBody(addMessageSchema), addMessageHandler);
supportRouter.post('/support/tickets/:id/status', validateBody(updateTicketStatusSchema), updateStatusHandler);
