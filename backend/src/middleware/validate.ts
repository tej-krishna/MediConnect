import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

declare module 'express-serve-static-core' {
  interface Request {
    /** Parsed query params from validateQuery(). req.query itself is getter-only in Express 5. */
    validatedQuery?: unknown;
  }
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.validatedQuery = schema.parse(req.query);
    next();
  };
}
