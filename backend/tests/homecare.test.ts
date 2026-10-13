import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { CareOffering } from '../src/modules/homecare/careOffering.model';
import { registerAndLogin, registerAdminAndLogin, authHeader, createApprovedProvider, uniqueEmail } from './helpers';

const base = env.API_PREFIX;

function equipmentProviderPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    providerType: 'equipment_provider',
    organizationName: 'Test Home Healthcare',
    registrationNumber: `EQ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'State Health Dept',
    contactPhone: '9876511111',
    contactEmail: uniqueEmail('equipment-contact'),
    address: { line1: '1 Equip St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    ...overrides,
  };
}

const deliveryAddress = { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' };

describe('homecare: offering management', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets a provider member create offerings of every type; blocks non-members', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const stranger = await registerAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, equipmentProviderPayload());

    const forbidden = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(stranger.accessToken))
      .send({ name: 'Wheelchair', category: 'mobility', offeringType: 'equipment_rental', price: 100, availableQuantity: 5 });
    expect(forbidden.status).toBe(403);

    const rentalRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'Wheelchair', category: 'mobility', offeringType: 'equipment_rental', price: 100, availableQuantity: 5 });
    expect(rentalRes.status).toBe(201);
    expect(rentalRes.body.data.offering.availableQuantity).toBe(5);

    const serviceRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'Home Nursing Visit', category: 'nursing', offeringType: 'home_visit_service', price: 500 });
    expect(serviceRes.status).toBe(201);
    expect(serviceRes.body.data.offering.availableQuantity).toBeNull();

    const listRes = await request(app)
      .get(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(owner.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.offerings).toHaveLength(2);
  });

  it('only surfaces active offerings from actively verified providers in public search', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, equipmentProviderPayload());

    const offeringRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'Oxygen Concentrator', category: 'respiratory', offeringType: 'equipment_purchase', price: 15000, availableQuantity: 3 });
    const offeringId = offeringRes.body.data.offering.id as string;

    const searchRes = await request(app).get(`${base}/offerings/search`).query({ query: 'Oxygen' });
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.offerings.map((o: { id: string }) => o.id)).toContain(offeringId);

    await request(app)
      .patch(`${base}/providers/applications/${provider.appId}/offerings/${offeringId}`)
      .set(authHeader(owner.accessToken))
      .send({ isActive: false });

    const getRes = await request(app).get(`${base}/offerings/${offeringId}`);
    expect(getRes.status).toBe(404);
  });
});

describe('homecare: booking lifecycle and availability reservation', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('reserves equipment availability on request and restores it on cancellation', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, equipmentProviderPayload());

    const offeringRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'Hospital Bed', category: 'mobility', offeringType: 'equipment_rental', price: 200, availableQuantity: 3 });
    const offeringId = offeringRes.body.data.offering.id as string;

    const requestRes = await request(app)
      .post(`${base}/care-requests`)
      .set(authHeader(patient.accessToken))
      .send({
        offeringId,
        quantity: 2,
        preferredDate: new Date().toISOString(),
        deliveryAddress,
      });
    expect(requestRes.status).toBe(201);
    expect(requestRes.body.data.request.totalAmount).toBe(400);
    const requestId = requestRes.body.data.request.id as string;

    const afterReserve = await CareOffering.findById(offeringId);
    expect(afterReserve?.availableQuantity).toBe(1);

    const cancelRes = await request(app)
      .post(`${base}/care-requests/${requestId}/transition`)
      .set(authHeader(patient.accessToken))
      .send({ action: 'cancel' });
    expect(cancelRes.status).toBe(200);

    const afterCancel = await CareOffering.findById(offeringId);
    expect(afterCancel?.availableQuantity).toBe(3);
  });

  it('walks a home-visit service request (no inventory) through confirm -> fulfill -> completed', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, equipmentProviderPayload());

    const offeringRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'Physiotherapy Session', category: 'physio', offeringType: 'home_visit_service', price: 800 });
    const offeringId = offeringRes.body.data.offering.id as string;

    const requestRes = await request(app)
      .post(`${base}/care-requests`)
      .set(authHeader(patient.accessToken))
      .send({ offeringId, preferredDate: new Date().toISOString(), deliveryAddress });
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.data.request.id as string;

    for (const action of ['confirm', 'fulfill', 'mark_completed']) {
      const res = await request(app)
        .post(`${base}/care-requests/${requestId}/transition`)
        .set(authHeader(owner.accessToken))
        .send({ action });
      expect(res.status).toBe(200);
    }

    const finalRes = await request(app).get(`${base}/care-requests/${requestId}`).set(authHeader(patient.accessToken));
    expect(finalRes.body.data.request.status).toBe('completed');
  });

  it('prevents overbooking under concurrent requests for the last unit of equipment', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, equipmentProviderPayload());

    const offeringRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/offerings`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'BiPAP Machine', category: 'respiratory', offeringType: 'equipment_rental', price: 1000, availableQuantity: 1 });
    const offeringId = offeringRes.body.data.offering.id as string;

    const patients = await Promise.all(Array.from({ length: 4 }, () => registerAndLogin(app)));
    const results = await Promise.all(
      patients.map((patient) =>
        request(app)
          .post(`${base}/care-requests`)
          .set(authHeader(patient.accessToken))
          .send({ offeringId, preferredDate: new Date().toISOString(), deliveryAddress }),
      ),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);

    const finalOffering = await CareOffering.findById(offeringId);
    expect(finalOffering?.availableQuantity).toBe(0);
  });
});
