import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  createCareOfferingSchema,
  updateCareOfferingSchema,
  searchCareOfferingsQuerySchema,
  createCareRequestSchema,
  careRequestTransitionSchema,
} from './homecare.validation';
import {
  createOfferingHandler,
  updateOfferingHandler,
  listProviderOfferingsHandler,
  searchOfferingsHandler,
  getOfferingHandler,
  createCareRequestHandler,
  transitionCareRequestHandler,
  getCareRequestHandler,
  listMyCareRequestsHandler,
  listProviderCareRequestsHandler,
} from './homecare.controller';

export const homecareRouter = Router();

// Public, unauthenticated discovery of equipment/home-care offerings.
homecareRouter.get('/offerings/search', validateQuery(searchCareOfferingsQuerySchema), searchOfferingsHandler);
homecareRouter.get('/offerings/:id', getOfferingHandler);

homecareRouter.use('/providers/applications/:id/offerings', requireAuth);
homecareRouter.post('/providers/applications/:id/offerings', validateBody(createCareOfferingSchema), createOfferingHandler);
homecareRouter.get('/providers/applications/:id/offerings', listProviderOfferingsHandler);
homecareRouter.patch(
  '/providers/applications/:id/offerings/:offeringId',
  validateBody(updateCareOfferingSchema),
  updateOfferingHandler,
);

homecareRouter.get('/providers/applications/:id/care-requests', requireAuth, listProviderCareRequestsHandler);

homecareRouter.use('/care-requests', requireAuth);
homecareRouter.post('/care-requests', validateBody(createCareRequestSchema), createCareRequestHandler);
homecareRouter.get('/care-requests/mine', listMyCareRequestsHandler);
homecareRouter.get('/care-requests/:id', getCareRequestHandler);
homecareRouter.post('/care-requests/:id/transition', validateBody(careRequestTransitionSchema), transitionCareRequestHandler);
