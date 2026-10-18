import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createSlotSchema, requestConsultationSchema, consultationTransitionSchema, checkInSchema } from './scheduling.validation';
import {
  createSlotHandler,
  listProviderSlotsHandler,
  listAvailableSlotsHandler,
  cancelSlotHandler,
  bookAppointmentHandler,
  cancelAppointmentHandler,
  listMyAppointmentsHandler,
  listProviderAppointmentsHandler,
  requestConsultationHandler,
  transitionConsultationHandler,
  checkInConsultationHandler,
  getConsultationHandler,
  listMyConsultationsHandler,
  listDoctorConsultationsHandler,
} from './scheduling.controller';

export const schedulingRouter = Router();

schedulingRouter.use('/providers/applications/:id/slots', requireAuth);
schedulingRouter.use('/appointments', requireAuth);
schedulingRouter.use('/consultations', requireAuth);

schedulingRouter.post('/providers/applications/:id/slots', validateBody(createSlotSchema), createSlotHandler);
schedulingRouter.get('/providers/applications/:id/slots', listProviderSlotsHandler);
schedulingRouter.get('/providers/applications/:id/slots/available', listAvailableSlotsHandler);
schedulingRouter.delete('/providers/applications/:id/slots/:slotId', cancelSlotHandler);

schedulingRouter.get('/providers/applications/:id/appointments', requireAuth, listProviderAppointmentsHandler);
schedulingRouter.get('/providers/applications/:id/consultations', requireAuth, listDoctorConsultationsHandler);

schedulingRouter.post('/appointments', bookAppointmentHandler);
schedulingRouter.post('/appointments/:id/cancel', cancelAppointmentHandler);
schedulingRouter.get('/appointments/mine', listMyAppointmentsHandler);

schedulingRouter.post('/consultations', validateBody(requestConsultationSchema), requestConsultationHandler);
schedulingRouter.get('/consultations/mine', listMyConsultationsHandler);
schedulingRouter.get('/consultations/:id', getConsultationHandler);
schedulingRouter.post('/consultations/:id/transition', validateBody(consultationTransitionSchema), transitionConsultationHandler);
schedulingRouter.post('/consultations/:id/check-in', validateBody(checkInSchema), checkInConsultationHandler);
