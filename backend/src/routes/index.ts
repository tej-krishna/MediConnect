import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { providerRouter } from '../modules/providers/provider.routes';
import { schedulingRouter } from '../modules/scheduling/scheduling.routes';
import { pharmacyRouter } from '../modules/pharmacy/pharmacy.routes';
import { diagnosticsRouter } from '../modules/diagnostics/diagnostics.routes';
import { emergencyRouter } from '../modules/emergency/emergency.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(providerRouter);
apiRouter.use(schedulingRouter);
apiRouter.use(pharmacyRouter);
apiRouter.use(diagnosticsRouter);
apiRouter.use(emergencyRouter);
