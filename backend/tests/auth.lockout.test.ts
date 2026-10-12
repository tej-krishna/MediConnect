import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { MAX_LOGIN_ATTEMPTS } from '../src/config/constants';

const base = env.API_PREFIX;

function uniqueEmail() {
  return `lockout-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('auth: account lockout after repeated failed logins', () => {
  const app = createApp();

  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it(`locks the account after ${MAX_LOGIN_ATTEMPTS} failed attempts and blocks even a correct password`, async () => {
    const email = uniqueEmail();
    const password = 'correct-horse-1';
    await request(app).post(`${base}/auth/register`).send({ email, password, fullName: 'Locked Out' });

    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i += 1) {
      const res = await request(app).post(`${base}/auth/login`).send({ email, password: 'wrong' });
      expect(res.status).toBe(401);
    }

    const lockedRes = await request(app).post(`${base}/auth/login`).send({ email, password });
    expect(lockedRes.status).toBe(423);
    expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
  });
});
