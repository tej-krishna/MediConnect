import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { ProviderApplication } from '../src/modules/providers/provider.model';
import { registerAndLogin, registerAdminAndLogin, authHeader, createApprovedProvider, uniqueEmail } from './helpers';

const base = env.API_PREFIX;

// Pune (18.52, 73.85) and Nashik (20.00, 73.78) are roughly 165km apart.
const PUNE = { lat: 18.52, lng: 73.85 };
const NASHIK = { lat: 20.0, lng: 73.78 };

function payloadFor(type: string, location: { lat: number; lng: number }, overrides: Record<string, unknown> = {}) {
  return {
    providerType: type,
    organizationName: `${type} at ${location.lat}`,
    registrationNumber: `REG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Test Authority',
    contactPhone: '9876500000',
    contactEmail: uniqueEmail('discovery-contact'),
    address: { line1: '1 Main St', city: location === PUNE ? 'Pune' : 'Nashik', state: 'Maharashtra', postalCode: '411001' },
    location,
    consultationFee: 300,
    operatingHoursNote: 'Mon-Sat 9am-8pm',
    ...overrides,
  };
}

describe('provider discovery: public search and detail', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('returns only actively verified providers within radius, sorted by distance, excluding expired ones', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);

    const puneDoctor = await createApprovedProvider(app, owner.accessToken, admin.accessToken, payloadFor('doctor', PUNE));
    const nashikDoctor = await createApprovedProvider(
      app,
      (await registerAndLogin(app)).accessToken,
      admin.accessToken,
      payloadFor('doctor', NASHIK),
    );

    const pendingOwner = await registerAndLogin(app);
    const pendingRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(pendingOwner.accessToken))
      .send(payloadFor('doctor', PUNE, { registrationNumber: `PENDING-${Date.now()}` }));
    expect(pendingRes.status).toBe(201); // never submitted/approved — must not appear

    const searchNearPune = await request(app).get(`${base}/providers/search`).query({ lat: PUNE.lat, lng: PUNE.lng, radiusKm: 30 });
    expect(searchNearPune.status).toBe(200);
    const ids = searchNearPune.body.data.providers.map((p: { id: string }) => p.id);
    expect(ids).toContain(puneDoctor.appId);
    expect(ids).not.toContain(nashikDoctor.appId);
    expect(ids).not.toContain(pendingRes.body.data.application.id);
    expect(searchNearPune.body.data.providers[0].distanceMeters).toBeTypeOf('number');

    // Simulate the verification having passed its expiry (no scheduler exists yet — see ARCHITECTURE.md).
    await ProviderApplication.updateOne({ _id: puneDoctor.appId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const searchAfterExpiry = await request(app).get(`${base}/providers/search`).query({ lat: PUNE.lat, lng: PUNE.lng, radiusKm: 30 });
    const idsAfterExpiry = searchAfterExpiry.body.data.providers.map((p: { id: string }) => p.id);
    expect(idsAfterExpiry).not.toContain(puneDoctor.appId);

    const detailAfterExpiry = await request(app).get(`${base}/providers/search/${puneDoctor.appId}`);
    expect(detailAfterExpiry.status).toBe(404);
  });

  it('falls back to a city-name match when no coordinates are supplied', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const pharmacy = await createApprovedProvider(
      app,
      owner.accessToken,
      admin.accessToken,
      payloadFor('pharmacy', NASHIK),
    );

    const res = await request(app).get(`${base}/providers/search`).query({ city: 'nashik', providerType: 'pharmacy' });
    expect(res.status).toBe(200);
    const ids = res.body.data.providers.map((p: { id: string }) => p.id);
    expect(ids).toContain(pharmacy.appId);
  });

  it('never exposes registrationNumber, contactEmail, or documents in the public shape', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const clinic = await createApprovedProvider(app, owner.accessToken, admin.accessToken, payloadFor('clinic', PUNE));

    const res = await request(app).get(`${base}/providers/search/${clinic.appId}`);
    expect(res.status).toBe(200);
    const provider = res.body.data.provider;
    expect(provider.registrationNumber).toBeUndefined();
    expect(provider.contactEmail).toBeUndefined();
    expect(provider.documents).toBeUndefined();
    expect(provider.statusHistory).toBeUndefined();
    expect(provider.organizationName).toBeTruthy();
    expect(provider.contactPhone).toBeTruthy();
  });

  it('lets the owner update listing info (fee, hours, location) but blocks everyone else', async () => {
    const owner = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const hospital = await createApprovedProvider(app, owner.accessToken, admin.accessToken, payloadFor('hospital', PUNE));

    const forbidden = await request(app)
      .patch(`${base}/providers/applications/${hospital.appId}/listing-info`)
      .set(authHeader(stranger.accessToken))
      .send({ consultationFee: 999 });
    expect(forbidden.status).toBe(403);

    const update = await request(app)
      .patch(`${base}/providers/applications/${hospital.appId}/listing-info`)
      .set(authHeader(owner.accessToken))
      .send({ consultationFee: 450, operatingHoursNote: '24x7 Emergency', location: NASHIK });
    expect(update.status).toBe(200);
    expect(update.body.data.application.consultationFee).toBe(450);
    expect(update.body.data.application.operatingHoursNote).toBe('24x7 Emergency');
    expect(update.body.data.application.location).toEqual(NASHIK);
  });
});
