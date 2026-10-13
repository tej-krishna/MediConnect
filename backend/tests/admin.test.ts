import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { registerAndLogin, registerAdminAndLogin, authHeader, createApprovedProvider, uniqueEmail } from './helpers';

const base = env.API_PREFIX;

function pharmacyPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    providerType: 'pharmacy',
    organizationName: 'Admin Test Pharmacy',
    registrationNumber: `DL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Drug Control',
    contactPhone: '9876555555',
    contactEmail: uniqueEmail('pharmacy-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    ...overrides,
  };
}

describe('admin: user moderation', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('blocks non-admins from listing or moderating users', async () => {
    const stranger = await registerAndLogin(app);
    const listRes = await request(app).get(`${base}/admin/users`).set(authHeader(stranger.accessToken));
    expect(listRes.status).toBe(403);
  });

  it('lets an admin list and suspend a user, immediately revoking their session', async () => {
    const admin = await registerAdminAndLogin(app);
    const target = await registerAndLogin(app);

    const listRes = await request(app).get(`${base}/admin/users`).set(authHeader(admin.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.users.map((u: { id: string }) => u.id)).toContain(target.userId);

    const suspendRes = await request(app)
      .patch(`${base}/admin/users/${target.userId}/status`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'suspended' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.status).toBe('suspended');

    const loginAttempt = await request(app).post(`${base}/auth/login`).send({ email: target.email, password: target.password });
    expect(loginAttempt.status).toBe(403);
  });

  it('refuses to let an admin suspend themselves or another super admin', async () => {
    const admin = await registerAdminAndLogin(app);
    const otherAdmin = await registerAdminAndLogin(app);

    const selfSuspend = await request(app)
      .patch(`${base}/admin/users/${admin.userId}/status`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'suspended' });
    expect(selfSuspend.status).toBe(403);

    const crossAdminSuspend = await request(app)
      .patch(`${base}/admin/users/${otherAdmin.userId}/status`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'suspended' });
    expect(crossAdminSuspend.status).toBe(403);
  });
});

describe('admin: commission rules and analytics', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('sets a commission rule and reflects it in the revenue analytics for that provider type', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const ruleRes = await request(app)
      .patch(`${base}/admin/commission-rules/pharmacy`)
      .set(authHeader(admin.accessToken))
      .send({ percentage: 10 });
    expect(ruleRes.status).toBe(200);
    expect(ruleRes.body.data.rule.percentage).toBe(10);

    const medRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send({
        name: 'Paracip 500',
        genericName: 'Paracetamol',
        activeIngredient: 'Paracetamol',
        strength: '500mg',
        dosageForm: 'tablet',
        unitPrice: 100,
        stockQuantity: 10,
      });
    const medicineId = medRes.body.data.medicine.id as string;

    await request(app)
      .post(`${base}/orders`)
      .set(authHeader(patient.accessToken))
      .send({
        pharmacyId: pharmacy.appId,
        items: [{ medicineItemId: medicineId, quantity: 2 }],
        deliveryAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
      });

    const overviewRes = await request(app).get(`${base}/admin/analytics/overview`).set(authHeader(admin.accessToken));
    expect(overviewRes.status).toBe(200);
    const pharmacyRevenue = overviewRes.body.data.revenue.find((r: { providerType: string }) => r.providerType === 'pharmacy');
    expect(pharmacyRevenue).toBeDefined();
    expect(pharmacyRevenue.grossAmount).toBeGreaterThanOrEqual(200);
    expect(pharmacyRevenue.commissionPercentage).toBe(10);
    expect(pharmacyRevenue.commissionAmount).toBeCloseTo(pharmacyRevenue.grossAmount * 0.1, 2);
  });

  it('rejects a commission rule for an unknown provider type', async () => {
    const admin = await registerAdminAndLogin(app);
    const res = await request(app)
      .patch(`${base}/admin/commission-rules/not_a_real_type`)
      .set(authHeader(admin.accessToken))
      .send({ percentage: 5 });
    expect(res.status).toBe(400);
  });
});

describe('admin: audit log records key actions', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('records a provider verification decision in the audit log', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const auditRes = await request(app)
      .get(`${base}/admin/audit-log`)
      .set(authHeader(admin.accessToken))
      .query({ action: 'provider_application_transition' });
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.entries.length).toBeGreaterThan(0);
    expect(auditRes.body.data.entries[0].action).toBe('provider_application_transition');
  });
});

describe('refunds: support-ticket-driven manual refund workflow', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets staff open a refund against a refund_request ticket and settle it', async () => {
    const patient = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);

    const ticketRes = await request(app)
      .post(`${base}/support/tickets`)
      .set(authHeader(patient.accessToken))
      .send({ subject: 'Charged twice', category: 'refund_request', description: 'My card was charged twice for the same order.' });
    const ticketId = ticketRes.body.data.ticket.id as string;

    const wrongCategoryTicket = await request(app)
      .post(`${base}/support/tickets`)
      .set(authHeader(patient.accessToken))
      .send({ subject: 'General question', category: 'general', description: 'Just asking something unrelated to a refund.' });
    const generalTicketId = wrongCategoryTicket.body.data.ticket.id as string;

    const rejectedRefund = await request(app)
      .post(`${base}/support/tickets/${generalTicketId}/refund`)
      .set(authHeader(admin.accessToken))
      .send({ amount: 100 });
    expect(rejectedRefund.status).toBe(409);

    const patientAttempt = await request(app)
      .post(`${base}/support/tickets/${ticketId}/refund`)
      .set(authHeader(patient.accessToken))
      .send({ amount: 100 });
    expect(patientAttempt.status).toBe(403);

    const refundRes = await request(app)
      .post(`${base}/support/tickets/${ticketId}/refund`)
      .set(authHeader(admin.accessToken))
      .send({ amount: 150 });
    expect(refundRes.status).toBe(201);
    expect(refundRes.body.data.transaction.status).toBe('pending_manual_review');
    const transactionId = refundRes.body.data.transaction.id as string;

    const duplicateRefund = await request(app)
      .post(`${base}/support/tickets/${ticketId}/refund`)
      .set(authHeader(admin.accessToken))
      .send({ amount: 150 });
    expect(duplicateRefund.status).toBe(409);

    const settleRes = await request(app)
      .post(`${base}/admin/transactions/${transactionId}/settle`)
      .set(authHeader(admin.accessToken))
      .send({ outcome: 'completed', notes: 'Refunded via bank transfer outside the platform.' });
    expect(settleRes.status).toBe(200);
    expect(settleRes.body.data.transaction.status).toBe('completed');

    const resettleAttempt = await request(app)
      .post(`${base}/admin/transactions/${transactionId}/settle`)
      .set(authHeader(admin.accessToken))
      .send({ outcome: 'completed' });
    expect(resettleAttempt.status).toBe(409);
  });
});
