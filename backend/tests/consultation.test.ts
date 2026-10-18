import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import {
  registerAndLogin,
  registerAdminAndLogin,
  authHeader,
  createApprovedProvider,
  uniqueEmail,
  sampleTypeDetailsFor,
} from './helpers';

const base = env.API_PREFIX;

function samplePayload(overrides: Partial<Record<string, unknown>> = {}) {
  const providerType = (overrides.providerType as string) ?? 'doctor';
  return {
    providerType,
    organizationName: 'Consultation Test Clinic',
    registrationNumber: `CONSULT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Test Authority',
    contactPhone: '9876500001',
    contactEmail: uniqueEmail('consult-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    typeDetails: sampleTypeDetailsFor(providerType),
    ...overrides,
  };
}

function inHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe('doctor availability toggles', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('only doctors/clinics can set, and a patient cannot request before the toggle is on', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const doctor = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());

    const pharmacyOwner = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(
      app,
      pharmacyOwner.accessToken,
      admin.accessToken,
      samplePayload({ providerType: 'pharmacy' }),
    );
    const rejected = await request(app)
      .patch(`${base}/providers/applications/${pharmacy.appId}/consultation-availability`)
      .set(authHeader(pharmacyOwner.accessToken))
      .send({ acceptsOnlineConsultations: true });
    expect(rejected.status).toBe(400);

    const requestBeforeToggle = await request(app)
      .post(`${base}/consultations`)
      .set(authHeader(patient.accessToken))
      .send({ doctorId: doctor.appId, visitType: 'online', preferredDateTime: inHours(24) });
    expect(requestBeforeToggle.status).toBe(409);

    const toggleRes = await request(app)
      .patch(`${base}/providers/applications/${doctor.appId}/consultation-availability`)
      .set(authHeader(owner.accessToken))
      .send({ acceptsOnlineConsultations: true, acceptsHomeVisits: true });
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.application.acceptsOnlineConsultations).toBe(true);
    expect(toggleRes.body.data.application.acceptsHomeVisits).toBe(true);

    const requestAfterToggle = await request(app)
      .post(`${base}/consultations`)
      .set(authHeader(patient.accessToken))
      .send({ doctorId: doctor.appId, visitType: 'online', preferredDateTime: inHours(24) });
    expect(requestAfterToggle.status).toBe(201);
    expect(requestAfterToggle.body.data.consultation.status).toBe('requested');
  });
});

describe('consultation request/confirm flow', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  async function setUpConfirmedDoctor() {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const doctor = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());
    await request(app)
      .patch(`${base}/providers/applications/${doctor.appId}/consultation-availability`)
      .set(authHeader(owner.accessToken))
      .send({ acceptsOnlineConsultations: true, acceptsHomeVisits: true });
    return { owner, admin, patient, doctor };
  }

  it('lets the doctor accept and assign a time, and a stranger cannot act on it', async () => {
    const { owner, patient, doctor } = await setUpConfirmedDoctor();
    const stranger = await registerAndLogin(app);

    const reqRes = await request(app)
      .post(`${base}/consultations`)
      .set(authHeader(patient.accessToken))
      .send({ doctorId: doctor.appId, visitType: 'online', preferredDateTime: inHours(24) });
    expect(reqRes.status).toBe(201);
    const consultationId = reqRes.body.data.consultation.id as string;

    const strangerConfirm = await request(app)
      .post(`${base}/consultations/${consultationId}/transition`)
      .set(authHeader(stranger.accessToken))
      .send({ action: 'confirm', confirmedDateTime: inHours(25) });
    expect(strangerConfirm.status).toBe(403);

    const patientConfirm = await request(app)
      .post(`${base}/consultations/${consultationId}/transition`)
      .set(authHeader(patient.accessToken))
      .send({ action: 'confirm', confirmedDateTime: inHours(25) });
    expect(patientConfirm.status).toBe(403);

    const confirmRes = await request(app)
      .post(`${base}/consultations/${consultationId}/transition`)
      .set(authHeader(owner.accessToken))
      .send({ action: 'confirm', confirmedDateTime: inHours(25) });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.consultation.status).toBe('confirmed');
    expect(confirmRes.body.data.consultation.confirmedDateTime).toBeTruthy();

    const mineRes = await request(app).get(`${base}/consultations/mine`).set(authHeader(patient.accessToken));
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.data.consultations[0].doctor.organizationName).toBe(doctor.application.organizationName);
  });

  it('requires a homeVisitAddress for home_visit requests', async () => {
    const { patient, doctor } = await setUpConfirmedDoctor();
    const res = await request(app)
      .post(`${base}/consultations`)
      .set(authHeader(patient.accessToken))
      .send({ doctorId: doctor.appId, visitType: 'home_visit', preferredDateTime: inHours(24) });
    expect(res.status).toBe(400);
  });
});

describe('no-show warnings and rating penalty', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('applies a 0.85x rating penalty on every 2nd reported no-show and resets the warning count', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const doctor = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());
    await request(app)
      .patch(`${base}/providers/applications/${doctor.appId}/consultation-availability`)
      .set(authHeader(owner.accessToken))
      .send({ acceptsOnlineConsultations: true });

    async function requestConfirmAndMissOnce() {
      const reqRes = await request(app)
        .post(`${base}/consultations`)
        .set(authHeader(patient.accessToken))
        .send({ doctorId: doctor.appId, visitType: 'online', preferredDateTime: inHours(24) });
      const consultationId = reqRes.body.data.consultation.id as string;

      const tooEarly = await request(app)
        .post(`${base}/consultations/${consultationId}/transition`)
        .set(authHeader(patient.accessToken))
        .send({ action: 'report_no_show' });
      expect(tooEarly.status).toBe(409);

      await request(app)
        .post(`${base}/consultations/${consultationId}/transition`)
        .set(authHeader(owner.accessToken))
        .send({ action: 'confirm', confirmedDateTime: inHours(-1) });

      const noShowRes = await request(app)
        .post(`${base}/consultations/${consultationId}/transition`)
        .set(authHeader(patient.accessToken))
        .send({ action: 'report_no_show' });
      expect(noShowRes.status).toBe(200);
      expect(noShowRes.body.data.consultation.status).toBe('no_show');

      const docConfirmNoShow = await request(app)
        .post(`${base}/consultations/${consultationId}/transition`)
        .set(authHeader(owner.accessToken))
        .send({ action: 'report_no_show' });
      expect(docConfirmNoShow.status).toBe(403);
    }

    const ratingBefore = (await request(app).get(`${base}/providers/search/${doctor.appId}`)).body.data.provider
      .reliabilityRating;
    expect(ratingBefore).toBe(100);

    await requestConfirmAndMissOnce();
    const ratingAfterFirst = (await request(app).get(`${base}/providers/search/${doctor.appId}`)).body.data.provider
      .reliabilityRating;
    expect(ratingAfterFirst).toBe(100);

    await requestConfirmAndMissOnce();
    const ratingAfterSecond = (await request(app).get(`${base}/providers/search/${doctor.appId}`)).body.data.provider
      .reliabilityRating;
    expect(ratingAfterSecond).toBe(85);

    const ownerAppView = await request(app)
      .get(`${base}/providers/applications/${doctor.appId}`)
      .set(authHeader(owner.accessToken));
    expect(ownerAppView.body.data.application.noShowWarningCount).toBe(0);
  });
});

describe('home-visit geofenced check-in', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  async function setUpConfirmedHomeVisit() {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const doctor = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());
    await request(app)
      .patch(`${base}/providers/applications/${doctor.appId}/consultation-availability`)
      .set(authHeader(owner.accessToken))
      .send({ acceptsHomeVisits: true });

    const reqRes = await request(app)
      .post(`${base}/consultations`)
      .set(authHeader(patient.accessToken))
      .send({
        doctorId: doctor.appId,
        visitType: 'home_visit',
        preferredDateTime: inHours(24),
        homeVisitAddress: { line1: '12 Patient Lane', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
      });
    const consultationId = reqRes.body.data.consultation.id as string;
    await request(app)
      .post(`${base}/consultations/${consultationId}/transition`)
      .set(authHeader(owner.accessToken))
      .send({ action: 'confirm', confirmedDateTime: inHours(25) });

    return { owner, patient, consultationId };
  }

  it('accepts check-in within 30m and rejects it when the two sides are further apart', async () => {
    const { owner, patient, consultationId } = await setUpConfirmedHomeVisit();
    const baseLat = 12.9716;
    const baseLng = 77.5946;

    await request(app)
      .post(`${base}/consultations/${consultationId}/check-in`)
      .set(authHeader(owner.accessToken))
      .send({ lat: baseLat, lng: baseLng });

    const closeRes = await request(app)
      .post(`${base}/consultations/${consultationId}/check-in`)
      .set(authHeader(patient.accessToken))
      .send({ lat: baseLat + 0.0002, lng: baseLng }); // ~22m away
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.withinRange).toBe(true);
    expect(closeRes.body.data.distanceMeters).toBeLessThanOrEqual(30);
  });

  it('reports out-of-range when the two check-ins are far apart', async () => {
    const { owner, patient, consultationId } = await setUpConfirmedHomeVisit();
    const baseLat = 12.9716;
    const baseLng = 77.5946;

    await request(app)
      .post(`${base}/consultations/${consultationId}/check-in`)
      .set(authHeader(owner.accessToken))
      .send({ lat: baseLat, lng: baseLng });

    const farRes = await request(app)
      .post(`${base}/consultations/${consultationId}/check-in`)
      .set(authHeader(patient.accessToken))
      .send({ lat: baseLat + 0.001, lng: baseLng }); // ~111m away
    expect(farRes.status).toBe(200);
    expect(farRes.body.data.withinRange).toBe(false);
    expect(farRes.body.data.distanceMeters).toBeGreaterThan(30);
  });
});
