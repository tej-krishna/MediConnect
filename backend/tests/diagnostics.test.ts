import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { HealthCamp } from '../src/modules/diagnostics/healthCamp.model';
import { registerAndLogin, registerAdminAndLogin, authHeader, createApprovedProvider, uniqueEmail } from './helpers';

const base = env.API_PREFIX;

function labPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    providerType: 'diagnostic_lab',
    organizationName: 'Test Diagnostics',
    registrationNumber: `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Health Dept',
    contactPhone: '9876500000',
    contactEmail: uniqueEmail('lab-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    ...overrides,
  };
}

function vanPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    providerType: 'mobile_van_operator',
    organizationName: 'Health Van Co',
    registrationNumber: `VAN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Health Dept',
    contactPhone: '9876500001',
    contactEmail: uniqueEmail('van-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    ...overrides,
  };
}

function inDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('diagnostics: test catalogue and lab orders', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets a lab member manage the test catalogue; blocks non-members', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const stranger = await registerAndLogin(app);
    const lab = await createApprovedProvider(app, owner.accessToken, admin.accessToken, labPayload());

    const forbidden = await request(app)
      .post(`${base}/providers/applications/${lab.appId}/diagnostic-tests`)
      .set(authHeader(stranger.accessToken))
      .send({ name: 'CBC', category: 'blood', sampleType: 'blood', price: 300, turnaroundHours: 24, homeCollectionAvailable: true });
    expect(forbidden.status).toBe(403);

    const createRes = await request(app)
      .post(`${base}/providers/applications/${lab.appId}/diagnostic-tests`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'CBC', category: 'blood', sampleType: 'blood', price: 300, turnaroundHours: 24, homeCollectionAvailable: true });
    expect(createRes.status).toBe(201);
    const testId = createRes.body.data.test.id as string;

    const updateRes = await request(app)
      .patch(`${base}/providers/applications/${lab.appId}/diagnostic-tests/${testId}`)
      .set(authHeader(owner.accessToken))
      .send({ price: 350 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.test.price).toBe(350);

    const searchRes = await request(app).get(`${base}/diagnostic-tests/search`).query({ query: 'CBC' });
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.tests.map((t: { id: string }) => t.id)).toContain(testId);
  });

  it('walks an order from request through report upload, blocking unauthorized actions', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);
    const lab = await createApprovedProvider(app, owner.accessToken, admin.accessToken, labPayload());

    const testRes = await request(app)
      .post(`${base}/providers/applications/${lab.appId}/diagnostic-tests`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'Lipid Profile', category: 'blood', sampleType: 'blood', price: 500, turnaroundHours: 48, homeCollectionAvailable: true });
    const testId = testRes.body.data.test.id as string;

    const orderRes = await request(app)
      .post(`${base}/diagnostic-orders`)
      .set(authHeader(patient.accessToken))
      .send({
        labId: lab.appId,
        testIds: [testId],
        collectionMethod: 'home_collection',
        homeAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
        preferredDateTime: inDays(1),
      });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.order.status).toBe('requested');
    expect(orderRes.body.data.order.totalAmount).toBe(500);
    expect(orderRes.body.data.order.hasReport).toBe(false);
    const orderId = orderRes.body.data.order.id as string;

    const downloadBeforeReport = await request(app)
      .get(`${base}/diagnostic-orders/${orderId}/report/download`)
      .set(authHeader(patient.accessToken));
    expect(downloadBeforeReport.status).toBe(404);

    const strangerSchedule = await request(app)
      .post(`${base}/diagnostic-orders/${orderId}/transition`)
      .set(authHeader(stranger.accessToken))
      .send({ action: 'schedule', confirmedDateTime: inDays(1) });
    expect(strangerSchedule.status).toBe(403);

    const schedule = await request(app)
      .post(`${base}/diagnostic-orders/${orderId}/transition`)
      .set(authHeader(owner.accessToken))
      .send({ action: 'schedule', confirmedDateTime: inDays(1) });
    expect(schedule.status).toBe(200);
    expect(schedule.body.data.order.status).toBe('scheduled');

    const collected = await request(app)
      .post(`${base}/diagnostic-orders/${orderId}/transition`)
      .set(authHeader(owner.accessToken))
      .send({ action: 'mark_collected' });
    expect(collected.status).toBe(200);

    const cancelAfterCollected = await request(app)
      .post(`${base}/diagnostic-orders/${orderId}/transition`)
      .set(authHeader(patient.accessToken))
      .send({ action: 'cancel' });
    expect(cancelAfterCollected.status).toBe(409);

    const processing = await request(app)
      .post(`${base}/diagnostic-orders/${orderId}/transition`)
      .set(authHeader(owner.accessToken))
      .send({ action: 'start_processing' });
    expect(processing.status).toBe(200);

    const reportTooEarly = await request(app)
      .post(`${base}/diagnostic-orders/${orderId}/report`)
      .set(authHeader(stranger.accessToken))
      .attach('report', Buffer.from('fake report'), { filename: 'r.pdf', contentType: 'application/pdf' });
    expect(reportTooEarly.status).toBe(403);

    const uploadReport = await request(app)
      .post(`${base}/diagnostic-orders/${orderId}/report`)
      .set(authHeader(owner.accessToken))
      .attach('report', Buffer.from('fake report'), { filename: 'r.pdf', contentType: 'application/pdf' });
    expect(uploadReport.status).toBe(200);
    expect(uploadReport.body.data.order.status).toBe('report_ready');
    expect(uploadReport.body.data.order.hasReport).toBe(true);

    const patientDownload = await request(app)
      .get(`${base}/diagnostic-orders/${orderId}/report/download`)
      .set(authHeader(patient.accessToken));
    expect(patientDownload.status).toBe(200);

    const strangerDownload = await request(app)
      .get(`${base}/diagnostic-orders/${orderId}/report/download`)
      .set(authHeader(stranger.accessToken));
    expect(strangerDownload.status).toBe(403);
  });

  it('rejects home collection for a test that does not support it, and rejects an invalid test id', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const lab = await createApprovedProvider(app, owner.accessToken, admin.accessToken, labPayload());

    const testRes = await request(app)
      .post(`${base}/providers/applications/${lab.appId}/diagnostic-tests`)
      .set(authHeader(owner.accessToken))
      .send({ name: 'X-Ray Chest', category: 'imaging', sampleType: 'none', price: 400, turnaroundHours: 4, homeCollectionAvailable: false });
    const testId = testRes.body.data.test.id as string;

    const homeOrder = await request(app)
      .post(`${base}/diagnostic-orders`)
      .set(authHeader(patient.accessToken))
      .send({
        labId: lab.appId,
        testIds: [testId],
        collectionMethod: 'home_collection',
        homeAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
        preferredDateTime: inDays(1),
      });
    expect(homeOrder.status).toBe(400);

    const invalidTestOrder = await request(app)
      .post(`${base}/diagnostic-orders`)
      .set(authHeader(patient.accessToken))
      .send({
        labId: lab.appId,
        testIds: ['000000000000000000000000'],
        collectionMethod: 'at_lab',
        preferredDateTime: inDays(1),
      });
    expect(invalidTestOrder.status).toBe(400);
  });
});

describe('diagnostics: mobile van / NGO health camps', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets a van operator schedule a camp and a patient register, with duplicate registration blocked', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const van = await createApprovedProvider(app, owner.accessToken, admin.accessToken, vanPayload());

    const campRes = await request(app)
      .post(`${base}/providers/applications/${van.appId}/health-camps`)
      .set(authHeader(owner.accessToken))
      .send({
        title: 'Free Checkup Camp',
        locationDescription: 'Village Square, Wagholi',
        scheduledDate: inDays(3),
        startTime: '09:00',
        endTime: '13:00',
        servicesOffered: ['General checkup', 'BP screening'],
        capacity: 2,
      });
    expect(campRes.status).toBe(201);
    const campId = campRes.body.data.camp.id as string;

    const searchRes = await request(app).get(`${base}/health-camps/search`).query({ city: 'Wagholi' });
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.camps.map((c: { id: string }) => c.id)).toContain(campId);

    const registerRes = await request(app)
      .post(`${base}/health-camps/${campId}/register`)
      .set(authHeader(patient.accessToken));
    expect(registerRes.status).toBe(201);

    const duplicateRegister = await request(app)
      .post(`${base}/health-camps/${campId}/register`)
      .set(authHeader(patient.accessToken));
    expect(duplicateRegister.status).toBe(409);

    const myRegs = await request(app)
      .get(`${base}/health-camps/registrations/mine`)
      .set(authHeader(patient.accessToken));
    expect(myRegs.body.data.registrations).toHaveLength(1);

    const cancelRes = await request(app)
      .post(`${base}/health-camps/${campId}/cancel-registration`)
      .set(authHeader(patient.accessToken));
    expect(cancelRes.status).toBe(200);

    const campAfterCancel = await HealthCamp.findById(campId);
    expect(campAfterCancel?.registeredCount).toBe(0);

    const reregister = await request(app)
      .post(`${base}/health-camps/${campId}/register`)
      .set(authHeader(patient.accessToken));
    expect(reregister.status).toBe(201);
  });

  it('prevents overbooking a camp under concurrent registrations', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const van = await createApprovedProvider(app, owner.accessToken, admin.accessToken, vanPayload());

    const campRes = await request(app)
      .post(`${base}/providers/applications/${van.appId}/health-camps`)
      .set(authHeader(owner.accessToken))
      .send({
        title: 'Small Camp',
        locationDescription: 'Community Hall',
        scheduledDate: inDays(2),
        startTime: '10:00',
        endTime: '12:00',
        capacity: 1,
      });
    const campId = campRes.body.data.camp.id as string;

    const patients = await Promise.all(Array.from({ length: 5 }, () => registerAndLogin(app)));
    const results = await Promise.all(
      patients.map((p) => request(app).post(`${base}/health-camps/${campId}/register`).set(authHeader(p.accessToken))),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);

    const finalCamp = await HealthCamp.findById(campId);
    expect(finalCamp?.registeredCount).toBe(1);
  });
});
