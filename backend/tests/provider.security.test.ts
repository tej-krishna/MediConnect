import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { registerAndLogin, registerAdminAndLogin, authHeader, uniqueEmail, sampleTypeDetailsFor } from './helpers';

const base = env.API_PREFIX;

function samplePayload(overrides: Partial<Record<string, unknown>> = {}) {
  const providerType = (overrides.providerType as string) ?? 'pharmacy';
  return {
    providerType,
    organizationName: 'City Pharmacy',
    registrationNumber: `DL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'State Drug Control Department',
    contactPhone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    contactEmail: uniqueEmail('pharmacy-contact'),
    address: { line1: '5 Market St', city: 'Nashik', state: 'Maharashtra', postalCode: '422001' },
    typeDetails: sampleTypeDetailsFor(providerType),
    ...overrides,
  };
}

async function submitApplication(app: ReturnType<typeof createApp>, token: string, appId: string) {
  await request(app)
    .post(`${base}/providers/applications/${appId}/documents`)
    .set(authHeader(token))
    .field('documentType', 'license')
    .attach('document', Buffer.from('fake'), { filename: 'license.pdf', contentType: 'application/pdf' });
  return request(app).post(`${base}/providers/applications/${appId}/submit`).set(authHeader(token));
}

describe('provider applications: fraud and abuse controls', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('blocks a second user from claiming an already-active registration number', async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    const regNumber = `DUP-${Date.now()}`;

    const firstRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(userA.accessToken))
      .send(samplePayload({ registrationNumber: regNumber }));
    expect(firstRes.status).toBe(201);
    await submitApplication(app, userA.accessToken, firstRes.body.data.application.id);

    const secondRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(userB.accessToken))
      .send(samplePayload({ registrationNumber: regNumber }));
    expect(secondRes.status).toBe(409);
  });

  it('blocks a user from opening two in-progress applications of the same provider type', async () => {
    const user = await registerAndLogin(app);

    const first = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(user.accessToken))
      .send(samplePayload());
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(user.accessToken))
      .send(samplePayload());
    expect(second.status).toBe(409);
  });

  it('flags an application that shares contact details with another account\'s application', async () => {
    const userA = await registerAndLogin(app);
    const userB = await registerAndLogin(app);
    const sharedEmail = uniqueEmail('shared-contact');

    const first = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(userA.accessToken))
      .send(samplePayload({ contactEmail: sharedEmail }));
    expect(first.body.data.application.flagged).toBe(false);

    const second = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(userB.accessToken))
      .send(samplePayload({ contactEmail: sharedEmail }));
    expect(second.status).toBe(201);
    expect(second.body.data.application.flagged).toBe(true);
    expect(second.body.data.application.flagReasons.length).toBeGreaterThan(0);
  });

  it('auto-flags an application once it accumulates three reports', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(owner.accessToken))
      .send(samplePayload());
    const appId = createRes.body.data.application.id as string;

    const cannotReportDraft = await request(app)
      .post(`${base}/providers/applications/${appId}/report`)
      .set(authHeader(admin.accessToken))
      .send({ reason: 'Looks suspicious' });
    expect(cannotReportDraft.status).toBe(400);

    await submitApplication(app, owner.accessToken, appId);

    for (let i = 0; i < 3; i += 1) {
      const reporter = await registerAndLogin(app);
      const res = await request(app)
        .post(`${base}/providers/applications/${appId}/report`)
        .set(authHeader(reporter.accessToken))
        .send({ reason: `Concern number ${i + 1}` });
      expect(res.status).toBe(200);
    }

    const detail = await request(app)
      .get(`${base}/providers/applications/${appId}`)
      .set(authHeader(admin.accessToken));
    expect(detail.body.data.application.flagged).toBe(true);
    expect(detail.body.data.application.reportCount).toBe(3);
  });

  it('lets the owner download an uploaded document but blocks an unrelated user', async () => {
    const owner = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(owner.accessToken))
      .send(samplePayload());
    const appId = createRes.body.data.application.id as string;

    const uploadRes = await request(app)
      .post(`${base}/providers/applications/${appId}/documents`)
      .set(authHeader(owner.accessToken))
      .field('documentType', 'license')
      .attach('document', Buffer.from('%PDF-1.4 real-ish'), {
        filename: 'license.pdf',
        contentType: 'application/pdf',
      });
    const documentId = uploadRes.body.data.application.documents[0].id as string;

    const ownerDownload = await request(app)
      .get(`${base}/providers/applications/${appId}/documents/${documentId}/download`)
      .set(authHeader(owner.accessToken));
    expect(ownerDownload.status).toBe(200);
    expect(ownerDownload.headers['content-type']).toBe('application/pdf');

    const strangerDownload = await request(app)
      .get(`${base}/providers/applications/${appId}/documents/${documentId}/download`)
      .set(authHeader(stranger.accessToken));
    expect(strangerDownload.status).toBe(403);
  });
});
