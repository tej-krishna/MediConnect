import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { providerRouter } from '../modules/providers/provider.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(providerRouter);
