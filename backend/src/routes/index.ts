import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
