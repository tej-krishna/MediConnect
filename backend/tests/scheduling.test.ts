import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { Slot } from '../src/modules/scheduling/slot.model';
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
    organizationName: 'Scheduling Test Clinic',
    registrationNumber: `SCHED-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Test Authority',
    contactPhone: '9876500000',
    contactEmail: uniqueEmail('sched-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    typeDetails: sampleTypeDetailsFor(providerType),
    ...overrides,
  };
}

function inHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe('provider staff membership', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets the owner invite, list, and remove staff; the invitee must accept', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const invitee = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);

    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());

    const forbiddenInvite = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/staff`)
      .set(authHeader(stranger.accessToken))
      .send({ email: invitee.email });
    expect(forbiddenInvite.status).toBe(403);

    const inviteRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/staff`)
      .set(authHeader(owner.accessToken))
      .send({ email: invitee.email });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.data.staff.status).toBe('invited');
    const staffId = inviteRes.body.data.staff.id as string;

    const duplicateInvite = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/staff`)
      .set(authHeader(owner.accessToken))
      .send({ email: invitee.email });
    expect(duplicateInvite.status).toBe(409);

    const acceptByWrongUser = await request(app)
      .post(`${base}/providers/staff/${staffId}/accept`)
      .set(authHeader(stranger.accessToken));
    expect(acceptByWrongUser.status).toBe(404);

    const acceptRes = await request(app)
      .post(`${base}/providers/staff/${staffId}/accept`)
      .set(authHeader(invitee.accessToken));
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.staff.status).toBe('active');

    const listRes = await request(app)
      .get(`${base}/providers/applications/${provider.appId}/staff`)
      .set(authHeader(owner.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.staff).toHaveLength(1);

    const removeRes = await request(app)
      .delete(`${base}/providers/applications/${provider.appId}/staff/${staffId}`)
      .set(authHeader(owner.accessToken));
    expect(removeRes.status).toBe(200);
  });
});

describe('appointment slots', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets a provider member create and cancel slots, visible publicly only while open', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const stranger = await registerAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());

    const forbidden = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/slots`)
      .set(authHeader(stranger.accessToken))
      .send({ startTime: inHours(24), endTime: inHours(25), capacity: 1 });
    expect(forbidden.status).toBe(403);

    const createRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/slots`)
      .set(authHeader(owner.accessToken))
      .send({ startTime: inHours(24), endTime: inHours(25), capacity: 2 });
    expect(createRes.status).toBe(201);
    const slotId = createRes.body.data.slot.id as string;

    const pastSlot = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/slots`)
      .set(authHeader(owner.accessToken))
      .send({ startTime: inHours(-1), endTime: inHours(1), capacity: 1 });
    expect(pastSlot.status).toBe(400);

    const availableRes = await request(app)
      .get(`${base}/providers/applications/${provider.appId}/slots/available`)
      .set(authHeader(stranger.accessToken));
    expect(availableRes.status).toBe(200);
    expect(availableRes.body.data.slots.map((s: { id: string }) => s.id)).toContain(slotId);

    const cancelRes = await request(app)
      .delete(`${base}/providers/applications/${provider.appId}/slots/${slotId}`)
      .set(authHeader(owner.accessToken));
    expect(cancelRes.status).toBe(200);

    const availableAfterCancel = await request(app)
      .get(`${base}/providers/applications/${provider.appId}/slots/available`)
      .set(authHeader(stranger.accessToken));
    expect(availableAfterCancel.body.data.slots.map((s: { id: string }) => s.id)).not.toContain(slotId);
  });
});

describe('appointment booking', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('books an appointment, prevents double-booking the same slot, and supports cancellation', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());

    const slotRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/slots`)
      .set(authHeader(owner.accessToken))
      .send({ startTime: inHours(24), endTime: inHours(25), capacity: 1 });
    const slotId = slotRes.body.data.slot.id as string;

    const bookRes = await request(app)
      .post(`${base}/appointments`)
      .set(authHeader(patient.accessToken))
      .send({ slotId });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body.data.appointment.status).toBe('booked');
    const appointmentId = bookRes.body.data.appointment.id as string;

    const duplicateBook = await request(app)
      .post(`${base}/appointments`)
      .set(authHeader(patient.accessToken))
      .send({ slotId });
    expect(duplicateBook.status).toBe(409);

    const otherPatient = await registerAndLogin(app);
    const fullSlotBook = await request(app)
      .post(`${base}/appointments`)
      .set(authHeader(otherPatient.accessToken))
      .send({ slotId });
    expect(fullSlotBook.status).toBe(409);

    const unrelatedCancel = await request(app)
      .post(`${base}/appointments/${appointmentId}/cancel`)
      .set(authHeader(otherPatient.accessToken));
    expect(unrelatedCancel.status).toBe(403);

    const cancelRes = await request(app)
      .post(`${base}/appointments/${appointmentId}/cancel`)
      .set(authHeader(patient.accessToken));
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.appointment.status).toBe('cancelled');

    const slotAfterCancel = await Slot.findById(slotId);
    expect(slotAfterCancel?.bookedCount).toBe(0);

    const rebookAfterCancel = await request(app)
      .post(`${base}/appointments`)
      .set(authHeader(patient.accessToken))
      .send({ slotId });
    expect(rebookAfterCancel.status).toBe(201);

    const mineRes = await request(app).get(`${base}/appointments/mine`).set(authHeader(patient.accessToken));
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.data.appointments.length).toBeGreaterThanOrEqual(2);

    const providerViewRes = await request(app)
      .get(`${base}/providers/applications/${provider.appId}/appointments`)
      .set(authHeader(owner.accessToken));
    expect(providerViewRes.status).toBe(200);
    expect(providerViewRes.body.data.appointments.length).toBeGreaterThanOrEqual(2);
  });

  it('under concurrent requests, only as many bookings succeed as there is capacity', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const provider = await createApprovedProvider(app, owner.accessToken, admin.accessToken, samplePayload());

    const slotRes = await request(app)
      .post(`${base}/providers/applications/${provider.appId}/slots`)
      .set(authHeader(owner.accessToken))
      .send({ startTime: inHours(24), endTime: inHours(25), capacity: 1 });
    const slotId = slotRes.body.data.slot.id as string;

    const patients = await Promise.all(Array.from({ length: 5 }, () => registerAndLogin(app)));

    const results = await Promise.all(
      patients.map((patient) =>
        request(app).post(`${base}/appointments`).set(authHeader(patient.accessToken)).send({ slotId }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 201);
    const conflicted = results.filter((r) => r.status === 409);
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(4);

    const finalSlot = await Slot.findById(slotId);
    expect(finalSlot?.bookedCount).toBe(1);
  });
});
