import rateLimit from 'express-rate-limit';

export function createLimiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' } },
  });
}

/** Stricter limiter for credential-guessing-prone endpoints: login, password reset, OTP. */
export const authLimiter = createLimiter(15 * 60 * 1000, 10);
