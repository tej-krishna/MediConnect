import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  meHandler,
} from './auth.controller';

export const authRouter = Router();

authRouter.post('/auth/register', validateBody(registerSchema), registerHandler);
authRouter.post('/auth/login', authLimiter, validateBody(loginSchema), loginHandler);
authRouter.post('/auth/refresh', refreshHandler);
authRouter.post('/auth/logout', logoutHandler);
authRouter.post(
  '/auth/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  forgotPasswordHandler,
);
authRouter.post('/auth/reset-password', authLimiter, validateBody(resetPasswordSchema), resetPasswordHandler);
authRouter.get('/auth/me', requireAuth, meHandler);
