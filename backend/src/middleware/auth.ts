import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../modules/auth/jwt';
import type { Role } from '../config/roles';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; roles: Role[] };
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, roles: payload.roles };
    next();
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const hasRole = req.user.roles.some((role) => allowed.includes(role));
    if (!hasRole) {
      throw AppError.forbidden();
    }
    next();
  };
}
