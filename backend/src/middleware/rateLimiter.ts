import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export function createLimiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    // Rate limiting itself isn't what functional/integration tests exercise (that belongs to a
    // dedicated abuse/rate-limit test in Phase 12); a low cap here would otherwise make test
    // suites that legitimately log in many times fail for reasons unrelated to what they check.
    limit: env.NODE_ENV === 'test' ? 1_000_000 : limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' } },
  });
}

/** Stricter limiter for credential-guessing-prone endpoints: login, password reset, OTP. */
export const authLimiter = createLimiter(15 * 60 * 1000, 10);
