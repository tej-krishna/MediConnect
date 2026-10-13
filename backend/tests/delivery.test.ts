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
    organizationName: 'Delivery Test Pharmacy',
    registrationNumber: `DL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Drug Control',
    contactPhone: '9876522222',
    contactEmail: uniqueEmail('pharmacy-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    ...overrides,
  };
}

async function applyAndApprove(app: ReturnType<typeof createApp>, adminToken: string) {
  const partner = await registerAndLogin(app);
  const applyRes = await request(app)
    .post(`${base}/delivery-partners/apply`)
    .set(authHeader(partner.accessToken))
    .send({ contactPhone: '9000011111', vehicleType: 'two_wheeler', serviceCity: 'Pune' });
  const profileId = applyRes.body.data.profile.id as string;

  await request(app)
    .post(`${base}/delivery-partners/${profileId}/review`)
    .set(authHeader(adminToken))
    .send({ action: 'approve' });

  return partner;
}

describe('delivery partners: application, approval, and assignment', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('never grants delivery_partner on self-application — only after admin approval', async () => {
    const applicant = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);

    const applyRes = await request(app)
      .post(`${base}/delivery-partners/apply`)
      .set(authHeader(applicant.accessToken))
      .send({ contactPhone: '9000022222', vehicleType: 'bicycle', serviceCity: 'Mumbai' });
    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.profile.status).toBe('pending');

    const meRes = await request(app).get(`${base}/delivery-partners/me`).set(authHeader(applicant.accessToken));
    expect(meRes.body.data.profile.status).toBe('pending');

    const profileId = applyRes.body.data.profile.id as string;
    const approveRes = await request(app)
      .post(`${base}/delivery-partners/${profileId}/review`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'approve' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.profile.status).toBe('approved');
  });

  it('lets a pharmacy member assign an approved delivery partner, who can then confirm delivery', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());
    const deliveryPartner = await applyAndApprove(app, admin.accessToken);

    const medRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send({
        name: 'Paracip 500',
        genericName: 'Paracetamol',
        activeIngredient: 'Paracetamol',
        strength: '500mg',
        dosageForm: 'tablet',
        unitPrice: 20,
        stockQuantity: 10,
      });
    const medicineId = medRes.body.data.medicine.id as string;

    const orderRes = await request(app)
      .post(`${base}/orders`)
      .set(authHeader(patient.accessToken))
      .send({
        pharmacyId: pharmacy.appId,
        items: [{ medicineItemId: medicineId, quantity: 1 }],
        deliveryAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
      });
    const orderId = orderRes.body.data.order.id as string;

    await request(app).post(`${base}/orders/${orderId}/transition`).set(authHeader(owner.accessToken)).send({ action: 'confirm' });

    const unapprovedAssign = await request(app)
      .post(`${base}/orders/${orderId}/assign-delivery-partner`)
      .set(authHeader(owner.accessToken))
      .send({ deliveryPartnerUserId: patient.userId });
    expect(unapprovedAssign.status).toBe(400);

    const assignRes = await request(app)
      .post(`${base}/orders/${orderId}/assign-delivery-partner`)
      .set(authHeader(owner.accessToken))
      .send({ deliveryPartnerUserId: deliveryPartner.userId });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.order.assignedDeliveryPartnerId).toBe(deliveryPartner.userId);

    await request(app).post(`${base}/orders/${orderId}/transition`).set(authHeader(owner.accessToken)).send({ action: 'start_preparing' });
    await request(app).post(`${base}/orders/${orderId}/transition`).set(authHeader(owner.accessToken)).send({ action: 'out_for_delivery' });

    const strangerConfirm = await request(app)
      .post(`${base}/orders/${orderId}/transition`)
      .set(authHeader(patient.accessToken))
      .send({ action: 'deliver' });
    expect(strangerConfirm.status).toBe(403);

    const confirmRes = await request(app)
      .post(`${base}/orders/${orderId}/transition`)
      .set(authHeader(deliveryPartner.accessToken))
      .send({ action: 'deliver' });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.order.status).toBe('delivered');

    const myDeliveries = await request(app)
      .get(`${base}/orders/my-deliveries`)
      .set(authHeader(deliveryPartner.accessToken));
    expect(myDeliveries.status).toBe(200);
    expect(myDeliveries.body.data.orders.map((o: { id: string }) => o.id)).toContain(orderId);
  });

  it('revokes the delivery_partner role when an admin suspends the profile', async () => {
    const admin = await registerAdminAndLogin(app);
    const partner = await applyAndApprove(app, admin.accessToken);

    const meBefore = await request(app).get(`${base}/delivery-partners/me`).set(authHeader(partner.accessToken));
    expect(meBefore.body.data.profile.status).toBe('approved');

    const profileId = meBefore.body.data.profile.id as string;
    const suspendRes = await request(app)
      .post(`${base}/delivery-partners/${profileId}/review`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'suspend', reason: 'Multiple complaints' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.profile.status).toBe('suspended');
  });
});
