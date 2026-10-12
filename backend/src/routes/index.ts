import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';
import { authRouter } from '../modules/auth/auth.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
