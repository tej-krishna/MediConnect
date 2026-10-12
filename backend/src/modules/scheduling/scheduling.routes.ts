import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createSlotSchema } from './scheduling.validation';
import {
  createSlotHandler,
  listProviderSlotsHandler,
  listAvailableSlotsHandler,
  cancelSlotHandler,
  bookAppointmentHandler,
  cancelAppointmentHandler,
  listMyAppointmentsHandler,
  listProviderAppointmentsHandler,
} from './scheduling.controller';

export const schedulingRouter = Router();

schedulingRouter.use('/providers/applications/:id/slots', requireAuth);
schedulingRouter.use('/appointments', requireAuth);

schedulingRouter.post('/providers/applications/:id/slots', validateBody(createSlotSchema), createSlotHandler);
schedulingRouter.get('/providers/applications/:id/slots', listProviderSlotsHandler);
schedulingRouter.get('/providers/applications/:id/slots/available', listAvailableSlotsHandler);
schedulingRouter.delete('/providers/applications/:id/slots/:slotId', cancelSlotHandler);

schedulingRouter.get('/providers/applications/:id/appointments', requireAuth, listProviderAppointmentsHandler);

schedulingRouter.post('/appointments', bookAppointmentHandler);
schedulingRouter.post('/appointments/:id/cancel', cancelAppointmentHandler);
schedulingRouter.get('/appointments/mine', listMyAppointmentsHandler);
