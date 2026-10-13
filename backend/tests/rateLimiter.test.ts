import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/env';
import { createLimiter } from '../src/middleware/rateLimiter';

/**
 * createLimiter() deliberately goes unlimited whenever NODE_ENV === 'test' (see its own comment)
 * so that functional suites — which legitimately log in dozens of times across many files — don't
 * fail for reasons unrelated to what they're checking. That same escape hatch means this is the
 * one test in the suite that has to briefly turn it off to exercise the real, production-facing
 * limiting behavior at all; every other test file relies on it staying on.
 */
describe('rate limiting: createLimiter enforces its configured cap outside test mode', () => {
  const originalNodeEnv = env.NODE_ENV;

  beforeAll(() => {
    env.NODE_ENV = 'production';
  });

  afterAll(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it('allows requests up to the limit, then responds 429 with the documented error shape', async () => {
    const app = express();
    app.use(createLimiter(60_000, 3));
    app.get('/probe', (_req, res) => res.json({ ok: true }));

    const results = await Promise.all(Array.from({ length: 5 }, () => request(app).get('/probe')));
    const succeeded = results.filter((r) => r.status === 200);
    const limited = results.filter((r) => r.status === 429);

    expect(succeeded).toHaveLength(3);
    expect(limited).toHaveLength(2);
    expect(limited[0].body).toEqual({
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
    });
  });

  it('reverts to effectively unlimited once NODE_ENV is back to "test"', async () => {
    env.NODE_ENV = 'test';
    const app = express();
    app.use(createLimiter(60_000, 1));
    app.get('/probe', (_req, res) => res.json({ ok: true }));

    const results = await Promise.all(Array.from({ length: 10 }, () => request(app).get('/probe')));
    expect(results.every((r) => r.status === 200)).toBe(true);

    env.NODE_ENV = 'production';
  });
});
