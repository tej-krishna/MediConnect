import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAuth, requireRole } from '../src/middleware/auth';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestId } from '../src/middleware/requestId';
import { signAccessToken } from '../src/modules/auth/jwt';

function buildTestApp() {
  const app = express();
  app.use(requestId);
  app.get('/protected', requireAuth, (req, res) => res.json({ userId: req.user?.id }));
  app.get('/admin-only', requireAuth, requireRole('super_admin'), (_req, res) => res.json({ ok: true }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('middleware: requireAuth / requireRole', () => {
  const app = buildTestApp();

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed or invalid token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('accepts a valid access token and exposes req.user', async () => {
    const token = signAccessToken({ sub: 'user-123', roles: ['patient'] });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-123');
  });

  it('returns 403 when the caller does not have the required role', async () => {
    const token = signAccessToken({ sub: 'user-123', roles: ['patient'] });
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows access when the caller has the required role', async () => {
    const token = signAccessToken({ sub: 'admin-1', roles: ['super_admin'] });
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
