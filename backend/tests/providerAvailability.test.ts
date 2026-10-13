import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { registerAndLogin, registerAdminAndLogin, authHeader, createApprovedProvider, uniqueEmail } from './helpers';

const base = env.API_PREFIX;

function ambulancePayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    providerType: 'ambulance_provider',
    organizationName: 'Rapid Response Ambulance',
    registrationNumber: `AMB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'State Transport Dept',
    contactPhone: '9876533333',
    contactEmail: uniqueEmail('ambulance-contact'),
    address: { line1: '1 Ambulance Rd', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    ...overrides,
  };
}

function pharmacyPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    providerType: 'pharmacy',
    organizationName: 'Non-Ambulance Pharmacy',
    registrationNumber: `DL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Drug Control',
    contactPhone: '9876544444',
    contactEmail: uniqueEmail('pharmacy-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    ...overrides,
  };
}

describe('ambulance provider availability toggle', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('defaults an approved ambulance provider to available, and lets only the owner toggle it', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const stranger = await registerAndLogin(app);
    const ambulance = await createApprovedProvider(app, owner.accessToken, admin.accessToken, ambulancePayload());

    expect(ambulance.application.isCurrentlyAvailable).toBe(true);

    const publicRes = await request(app).get(`${base}/providers/search/${ambulance.appId}`);
    expect(publicRes.body.data.provider.isCurrentlyAvailable).toBe(true);

    const forbidden = await request(app)
      .patch(`${base}/providers/applications/${ambulance.appId}/availability`)
      .set(authHeader(stranger.accessToken))
      .send({ isCurrentlyAvailable: false });
    expect(forbidden.status).toBe(403);

    const toggleRes = await request(app)
      .patch(`${base}/providers/applications/${ambulance.appId}/availability`)
      .set(authHeader(owner.accessToken))
      .send({ isCurrentlyAvailable: false });
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.application.isCurrentlyAvailable).toBe(false);

    const publicAfterToggle = await request(app).get(`${base}/providers/search/${ambulance.appId}`);
    expect(publicAfterToggle.body.data.provider.isCurrentlyAvailable).toBe(false);
  });

  it('rejects the availability toggle for a non-ambulance provider type', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const res = await request(app)
      .patch(`${base}/providers/applications/${pharmacy.appId}/availability`)
      .set(authHeader(owner.accessToken))
      .send({ isCurrentlyAvailable: true });
    expect(res.status).toBe(400);
  });
});
