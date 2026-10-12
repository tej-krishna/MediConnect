import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { notificationService } from '../src/services/notification.service';

const base = env.API_PREFIX;

function uniqueEmail() {
  return `reset-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('auth: forgot / reset password', () => {
  const app = createApp();

  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a reset token, allows resetting the password, and revokes existing sessions', async () => {
    const email = uniqueEmail();
    const oldPassword = 'correct-horse-1';
    const newPassword = 'new-correct-horse-2';

    await request(app)
      .post(`${base}/auth/register`)
      .send({ email, password: oldPassword, fullName: 'Reset Me' });
    const loginRes = await request(app).post(`${base}/auth/login`).send({ email, password: oldPassword });
    expect(loginRes.status).toBe(200);

    const sendSpy = vi.spyOn(notificationService, 'sendPasswordResetEmail').mockResolvedValue();

    const forgotRes = await request(app).post(`${base}/auth/forgot-password`).send({ email });
    expect(forgotRes.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const [, rawToken] = sendSpy.mock.calls[0];

    const resetRes = await request(app)
      .post(`${base}/auth/reset-password`)
      .send({ token: rawToken, newPassword });
    expect(resetRes.status).toBe(200);

    const oldPasswordLogin = await request(app)
      .post(`${base}/auth/login`)
      .send({ email, password: oldPassword });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app)
      .post(`${base}/auth/login`)
      .send({ email, password: newPassword });
    expect(newPasswordLogin.status).toBe(200);

    const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = setCookie.find((c) => c.startsWith('refreshToken='))!.split(';')[0];
    const refreshAfterReset = await request(app).post(`${base}/auth/refresh`).set('Cookie', refreshCookie);
    expect(refreshAfterReset.status).toBe(401);
  });

  it('rejects an invalid or already-used reset token', async () => {
    const res = await request(app)
      .post(`${base}/auth/reset-password`)
      .send({ token: 'not-a-real-token', newPassword: 'whatever-123' });
    expect(res.status).toBe(400);
  });

  it('does not reveal whether an email exists for forgot-password', async () => {
    const res = await request(app).post(`${base}/auth/forgot-password`).send({ email: uniqueEmail() });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/if an account/i);
  });
});
