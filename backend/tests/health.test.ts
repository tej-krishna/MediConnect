import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

describe('GET /api/v1/health', () => {
  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('reports ok status and a connected database', async () => {
    const app = createApp();
    const res = await request(app).get(`${env.API_PREFIX}/health`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });
});

describe('unknown routes', () => {
  it('returns a structured 404', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
