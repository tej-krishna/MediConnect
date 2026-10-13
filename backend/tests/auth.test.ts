import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

const base = env.API_PREFIX;

function uniqueEmail() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function extractRefreshCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  const line = setCookie?.find((c) => c.startsWith('refreshToken='));
  if (!line) {
    throw new Error('refreshToken cookie was not set on the response');
  }
  return line.split(';')[0];
}

describe('auth: register, login, refresh, logout', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('registers a new patient account with the password hashed, never returned', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post(`${base}/auth/register`)
      .send({ email, password: 'correct-horse-1', fullName: 'Asha Rao', role: 'super_admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.roles).toEqual(['patient']); // role field in body is ignored
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate registration email with 409', async () => {
    const email = uniqueEmail();
    await request(app)
      .post(`${base}/auth/register`)
      .send({ email, password: 'correct-horse-1', fullName: 'Asha Rao' });

    const res = await request(app)
      .post(`${base}/auth/register`)
      .send({ email, password: 'correct-horse-1', fullName: 'Asha Rao' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects registration with an invalid payload (400)', async () => {
    const res = await request(app)
      .post(`${base}/auth/register`)
      .send({ email: 'not-an-email', password: 'short', fullName: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in, accesses /auth/me, rotates the refresh token, then logs out', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    const password = 'correct-horse-1';

    await agent.post(`${base}/auth/register`).send({ email, password, fullName: 'Vikram Singh' });

    const loginRes = await agent.post(`${base}/auth/login`).send({ email, password });
    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.data.accessToken as string;
    expect(typeof accessToken).toBe('string');
    expect(loginRes.headers['set-cookie']?.[0]).toMatch(/refreshToken=/);

    const meRes = await agent.get(`${base}/auth/me`).set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(email);

    const unauthRes = await agent.get(`${base}/auth/me`);
    expect(unauthRes.status).toBe(401);

    const refreshRes = await agent.post(`${base}/auth/refresh`);
    expect(refreshRes.status).toBe(200);
    expect(typeof refreshRes.body.data.accessToken).toBe('string');

    const logoutRes = await agent.post(`${base}/auth/logout`);
    expect(logoutRes.status).toBe(200);

    const refreshAfterLogout = await agent.post(`${base}/auth/refresh`);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('rejects login with a wrong password using a generic message', async () => {
    const email = uniqueEmail();
    await request(app)
      .post(`${base}/auth/register`)
      .send({ email, password: 'correct-horse-1', fullName: 'Nisha Patel' });

    const res = await request(app).post(`${base}/auth/login`).send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects login for an email that does not exist with the same generic message', async () => {
    const res = await request(app)
      .post(`${base}/auth/login`)
      .send({ email: uniqueEmail(), password: 'whatever-1' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('detects refresh-token reuse and revokes the whole session', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    const password = 'correct-horse-1';

    await agent.post(`${base}/auth/register`).send({ email, password, fullName: 'Reuse Test' });
    const loginRes = await agent.post(`${base}/auth/login`).send({ email, password });
    const firstRefreshCookie = extractRefreshCookie(loginRes);

    await agent.post(`${base}/auth/refresh`); // rotates via the agent's own cookie jar

    const replay = await request(app).post(`${base}/auth/refresh`).set('Cookie', firstRefreshCookie);
    expect(replay.status).toBe(401);

    // Even the *current* (post-rotation) refresh token should now be revoked as a precaution.
    const currentShouldAlsoFail = await agent.post(`${base}/auth/refresh`);
    expect(currentShouldAlsoFail.status).toBe(401);
  });

  it('gives a mobile client (X-Client-Platform: mobile) the raw refresh token to store itself, never a browser client', async () => {
    const email = uniqueEmail();
    const password = 'correct-horse-1';
    await request(app).post(`${base}/auth/register`).send({ email, password, fullName: 'Mobile Test' });

    const webLogin = await request(app).post(`${base}/auth/login`).send({ email, password });
    expect(webLogin.body.data.refreshToken).toBeUndefined();

    const mobileLogin = await request(app)
      .post(`${base}/auth/login`)
      .set('X-Client-Platform', 'mobile')
      .send({ email, password });
    expect(mobileLogin.status).toBe(200);
    const mobileRefreshToken = mobileLogin.body.data.refreshToken as string;
    expect(typeof mobileRefreshToken).toBe('string');
    expect(mobileRefreshToken.length).toBeGreaterThan(10);

    // No cookie jar at all — the refresh token travels only in the JSON body, as a native app would.
    const refreshViaBody = await request(app)
      .post(`${base}/auth/refresh`)
      .set('X-Client-Platform', 'mobile')
      .send({ refreshToken: mobileRefreshToken });
    expect(refreshViaBody.status).toBe(200);
    expect(typeof refreshViaBody.body.data.refreshToken).toBe('string');
    const rotatedToken = refreshViaBody.body.data.refreshToken as string;

    // The token login first issued was rotated out by the refresh above — reusing it must fail.
    const reuseOldToken = await request(app).post(`${base}/auth/refresh`).send({ refreshToken: mobileRefreshToken });
    expect(reuseOldToken.status).toBe(401);

    const logoutViaBody = await request(app).post(`${base}/auth/logout`).send({ refreshToken: rotatedToken });
    expect(logoutViaBody.status).toBe(200);

    const refreshAfterLogout = await request(app).post(`${base}/auth/refresh`).send({ refreshToken: rotatedToken });
    expect(refreshAfterLogout.status).toBe(401);
  });
});
