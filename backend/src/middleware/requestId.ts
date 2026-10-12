import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
