import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { documentUpload } from '../../middleware/upload';
import { assignDeliveryPartnerSchema } from '../delivery/delivery.validation';
import {
  createMedicineItemSchema,
  updateMedicineItemSchema,
  searchMedicinesQuerySchema,
  createOrderSchema,
  orderTransitionSchema,
} from './pharmacy.validation';
import {
  createMedicineItemHandler,
  updateMedicineItemHandler,
  listPharmacyMedicinesHandler,
  searchMedicinesHandler,
  getMedicineHandler,
  findAlternativesHandler,
  createOrderHandler,
  uploadPrescriptionHandler,
  transitionOrderHandler,
  assignDeliveryPartnerHandler,
  getOrderHandler,
  listMyOrdersHandler,
  listMyDeliveriesHandler,
  listPharmacyOrdersHandler,
} from './pharmacy.controller';

export const pharmacyRouter = Router();

// Public, unauthenticated medicine discovery.
pharmacyRouter.get('/medicines/search', validateQuery(searchMedicinesQuerySchema), searchMedicinesHandler);
pharmacyRouter.get('/medicines/:id', getMedicineHandler);
pharmacyRouter.get('/medicines/:id/alternatives', findAlternativesHandler);

pharmacyRouter.use('/providers/applications/:id/medicines', requireAuth);
pharmacyRouter.post(
  '/providers/applications/:id/medicines',
  validateBody(createMedicineItemSchema),
  createMedicineItemHandler,
);
pharmacyRouter.get('/providers/applications/:id/medicines', listPharmacyMedicinesHandler);
pharmacyRouter.patch(
  '/providers/applications/:id/medicines/:medicineId',
  validateBody(updateMedicineItemSchema),
  updateMedicineItemHandler,
);

pharmacyRouter.get('/providers/applications/:id/orders', requireAuth, listPharmacyOrdersHandler);

pharmacyRouter.use('/orders', requireAuth);
pharmacyRouter.post('/orders', validateBody(createOrderSchema), createOrderHandler);
pharmacyRouter.get('/orders/mine', listMyOrdersHandler);
pharmacyRouter.get('/orders/my-deliveries', listMyDeliveriesHandler);
pharmacyRouter.get('/orders/:id', getOrderHandler);
pharmacyRouter.post('/orders/:id/prescription', documentUpload.single('prescription'), uploadPrescriptionHandler);
pharmacyRouter.post('/orders/:id/transition', validateBody(orderTransitionSchema), transitionOrderHandler);
pharmacyRouter.post(
  '/orders/:id/assign-delivery-partner',
  validateBody(assignDeliveryPartnerSchema),
  assignDeliveryPartnerHandler,
);
