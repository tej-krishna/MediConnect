import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { registerAndLogin, registerAdminAndLogin, authHeader } from './helpers';

const base = env.API_PREFIX;

describe('emergency guidance content', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('is readable by anyone without authentication, and only active guides show', async () => {
    const admin = await registerAdminAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/emergency/admin/guides`)
      .set(authHeader(admin.accessToken))
      .send({
        title: 'Chest pain',
        redFlagSymptoms: ['Crushing chest pain', 'Pain radiating to arm or jaw', 'Shortness of breath'],
        guidance: 'Call emergency services immediately. Do not drive yourself.',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.guide.isActive).toBe(true);
    expect(createRes.body.data.guide.clinicallyReviewed).toBe(false);
    const guideId = createRes.body.data.guide.id as string;

    const publicRes = await request(app).get(`${base}/emergency/guides`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.guides.map((g: { id: string }) => g.id)).toContain(guideId);

    const deactivateRes = await request(app)
      .delete(`${base}/emergency/admin/guides/${guideId}`)
      .set(authHeader(admin.accessToken));
    expect(deactivateRes.status).toBe(200);

    const publicResAfterDeactivate = await request(app).get(`${base}/emergency/guides`);
    expect(publicResAfterDeactivate.body.data.guides.map((g: { id: string }) => g.id)).not.toContain(guideId);
  });

  it('blocks non-admins from managing guides', async () => {
    const patient = await registerAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/emergency/admin/guides`)
      .set(authHeader(patient.accessToken))
      .send({ title: 'Stroke', redFlagSymptoms: ['Face drooping'], guidance: 'Call now.' });
    expect(createRes.status).toBe(403);

    const listRes = await request(app).get(`${base}/emergency/admin/guides`).set(authHeader(patient.accessToken));
    expect(listRes.status).toBe(403);
  });

  it('lets an admin mark a guide as clinically reviewed', async () => {
    const admin = await registerAdminAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/emergency/admin/guides`)
      .set(authHeader(admin.accessToken))
      .send({ title: 'Severe allergic reaction', redFlagSymptoms: ['Throat swelling', 'Difficulty breathing'], guidance: 'Use epinephrine if available, call emergency services.' });
    const guideId = createRes.body.data.guide.id as string;

    const updateRes = await request(app)
      .patch(`${base}/emergency/admin/guides/${guideId}`)
      .set(authHeader(admin.accessToken))
      .send({ clinicallyReviewed: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.guide.clinicallyReviewed).toBe(true);
  });
});
