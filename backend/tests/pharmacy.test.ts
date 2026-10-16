import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { MedicineItem } from '../src/modules/pharmacy/medicine.model';
import {
  registerAndLogin,
  registerAdminAndLogin,
  authHeader,
  createApprovedProvider,
  uniqueEmail,
  sampleTypeDetailsFor,
} from './helpers';

const base = env.API_PREFIX;

function pharmacyPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    providerType: 'pharmacy',
    organizationName: 'Test Pharmacy',
    registrationNumber: `DL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'Drug Control',
    contactPhone: '9876500000',
    contactEmail: uniqueEmail('pharmacy-contact'),
    address: { line1: '1 Main St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    typeDetails: sampleTypeDetailsFor('pharmacy'),
    ...overrides,
  };
}

function medicinePayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Paracip 500',
    genericName: 'Paracetamol',
    activeIngredient: 'Paracetamol',
    strength: '500mg',
    dosageForm: 'tablet',
    unitPrice: 20,
    stockQuantity: 10,
    requiresPrescription: false,
    ...overrides,
  };
}

describe('pharmacy: inventory management', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets a pharmacy member add and update inventory; blocks non-members', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const stranger = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const forbidden = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(stranger.accessToken))
      .send(medicinePayload());
    expect(forbidden.status).toBe(403);

    const createRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send(medicinePayload());
    expect(createRes.status).toBe(201);
    const medicineId = createRes.body.data.medicine.id as string;

    const updateRes = await request(app)
      .patch(`${base}/providers/applications/${pharmacy.appId}/medicines/${medicineId}`)
      .set(authHeader(owner.accessToken))
      .send({ unitPrice: 25, stockQuantity: 50 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.medicine.unitPrice).toBe(25);
    expect(updateRes.body.data.medicine.stockQuantity).toBe(50);

    const listRes = await request(app)
      .get(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.medicines).toHaveLength(1);
  });
});

describe('pharmacy: public search and generic alternatives', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('finds medicines by name and suggests cheaper generic alternatives from other pharmacies', async () => {
    const ownerA = await registerAndLogin(app);
    const ownerB = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);

    const pharmacyA = await createApprovedProvider(app, ownerA.accessToken, admin.accessToken, pharmacyPayload({ organizationName: 'Pharmacy A' }));
    const pharmacyB = await createApprovedProvider(app, ownerB.accessToken, admin.accessToken, pharmacyPayload({ organizationName: 'Pharmacy B' }));

    const expensiveRes = await request(app)
      .post(`${base}/providers/applications/${pharmacyA.appId}/medicines`)
      .set(authHeader(ownerA.accessToken))
      .send(medicinePayload({ name: 'BrandPara 500', unitPrice: 50 }));
    const cheapRes = await request(app)
      .post(`${base}/providers/applications/${pharmacyB.appId}/medicines`)
      .set(authHeader(ownerB.accessToken))
      .send(medicinePayload({ name: 'GenericPara 500', unitPrice: 15 }));

    const expensiveId = expensiveRes.body.data.medicine.id as string;
    const cheapId = cheapRes.body.data.medicine.id as string;

    // Both items share genericName "Paracetamol" (the medicinePayload default); MongoDB's $text
    // search matches whole words, not substrings, so this searches a word both actually contain.
    const searchRes = await request(app).get(`${base}/medicines/search`).query({ query: 'Paracetamol' });
    expect(searchRes.status).toBe(200);
    const foundIds = searchRes.body.data.medicines.map((m: { id: string }) => m.id);
    expect(foundIds).toContain(expensiveId);
    expect(foundIds).toContain(cheapId);

    const alternativesRes = await request(app).get(`${base}/medicines/${expensiveId}/alternatives`);
    expect(alternativesRes.status).toBe(200);
    expect(alternativesRes.body.data.alternatives[0].id).toBe(cheapId);
    expect(alternativesRes.body.data.alternatives[0].unitPrice).toBeLessThan(50);
    expect(alternativesRes.body.data.disclaimer).toMatch(/not an automatic substitution/i);
  });
});

describe('pharmacy: ordering with stock reservation and prescriptions', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('places a non-prescription order, reserves stock, and walks it to delivered', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const medRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send(medicinePayload({ stockQuantity: 10, unitPrice: 20 }));
    const medicineId = medRes.body.data.medicine.id as string;

    const orderRes = await request(app)
      .post(`${base}/orders`)
      .set(authHeader(patient.accessToken))
      .send({
        pharmacyId: pharmacy.appId,
        items: [{ medicineItemId: medicineId, quantity: 3 }],
        deliveryAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
      });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.order.status).toBe('placed');
    expect(orderRes.body.data.order.totalAmount).toBe(60);
    const orderId = orderRes.body.data.order.id as string;

    const stockAfterOrder = await MedicineItem.findById(medicineId);
    expect(stockAfterOrder?.stockQuantity).toBe(7);

    const nonMemberConfirm = await request(app)
      .post(`${base}/orders/${orderId}/transition`)
      .set(authHeader(patient.accessToken))
      .send({ action: 'confirm' });
    expect(nonMemberConfirm.status).toBe(403);

    for (const action of ['confirm', 'start_preparing', 'out_for_delivery', 'deliver']) {
      const res = await request(app)
        .post(`${base}/orders/${orderId}/transition`)
        .set(authHeader(owner.accessToken))
        .send({ action });
      expect(res.status).toBe(200);
    }

    const finalOrder = await request(app).get(`${base}/orders/${orderId}`).set(authHeader(patient.accessToken));
    expect(finalOrder.body.data.order.status).toBe('delivered');
  });

  it('holds a prescription-required order until the prescription is uploaded', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const medRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send(medicinePayload({ requiresPrescription: true, stockQuantity: 5 }));
    const medicineId = medRes.body.data.medicine.id as string;

    const orderRes = await request(app)
      .post(`${base}/orders`)
      .set(authHeader(patient.accessToken))
      .send({
        pharmacyId: pharmacy.appId,
        items: [{ medicineItemId: medicineId, quantity: 1 }],
        deliveryAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
      });
    expect(orderRes.body.data.order.status).toBe('pending_prescription');
    const orderId = orderRes.body.data.order.id as string;

    const confirmBeforePrescription = await request(app)
      .post(`${base}/orders/${orderId}/transition`)
      .set(authHeader(owner.accessToken))
      .send({ action: 'confirm' });
    expect(confirmBeforePrescription.status).toBe(409);

    const uploadRes = await request(app)
      .post(`${base}/orders/${orderId}/prescription`)
      .set(authHeader(patient.accessToken))
      .attach('prescription', Buffer.from('%PDF-1.4 rx'), { filename: 'rx.pdf', contentType: 'application/pdf' });
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.order.status).toBe('placed');
    expect(uploadRes.body.data.order.hasPrescription).toBe(true);

    const confirmAfterPrescription = await request(app)
      .post(`${base}/orders/${orderId}/transition`)
      .set(authHeader(owner.accessToken))
      .send({ action: 'confirm' });
    expect(confirmAfterPrescription.status).toBe(200);
  });

  it('rejects an order for more than available stock without reserving anything', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const medRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send(medicinePayload({ stockQuantity: 2 }));
    const medicineId = medRes.body.data.medicine.id as string;

    const orderRes = await request(app)
      .post(`${base}/orders`)
      .set(authHeader(patient.accessToken))
      .send({
        pharmacyId: pharmacy.appId,
        items: [{ medicineItemId: medicineId, quantity: 5 }],
        deliveryAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
      });
    expect(orderRes.status).toBe(409);

    const stock = await MedicineItem.findById(medicineId);
    expect(stock?.stockQuantity).toBe(2);
  });

  it('restores stock when an order is cancelled, by either the patient or the pharmacy', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const patient = await registerAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const medRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send(medicinePayload({ stockQuantity: 10 }));
    const medicineId = medRes.body.data.medicine.id as string;

    const orderRes = await request(app)
      .post(`${base}/orders`)
      .set(authHeader(patient.accessToken))
      .send({
        pharmacyId: pharmacy.appId,
        items: [{ medicineItemId: medicineId, quantity: 4 }],
        deliveryAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
      });
    const orderId = orderRes.body.data.order.id as string;

    const cancelRes = await request(app)
      .post(`${base}/orders/${orderId}/transition`)
      .set(authHeader(patient.accessToken))
      .send({ action: 'cancel' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.order.status).toBe('cancelled');

    const stockAfterCancel = await MedicineItem.findById(medicineId);
    expect(stockAfterCancel?.stockQuantity).toBe(10);
  });

  it('prevents overselling under concurrent orders for the last units of stock', async () => {
    const owner = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);
    const pharmacy = await createApprovedProvider(app, owner.accessToken, admin.accessToken, pharmacyPayload());

    const medRes = await request(app)
      .post(`${base}/providers/applications/${pharmacy.appId}/medicines`)
      .set(authHeader(owner.accessToken))
      .send(medicinePayload({ stockQuantity: 1 }));
    const medicineId = medRes.body.data.medicine.id as string;

    const patients = await Promise.all(Array.from({ length: 4 }, () => registerAndLogin(app)));
    const results = await Promise.all(
      patients.map((patient) =>
        request(app)
          .post(`${base}/orders`)
          .set(authHeader(patient.accessToken))
          .send({
            pharmacyId: pharmacy.appId,
            items: [{ medicineItemId: medicineId, quantity: 1 }],
            deliveryAddress: { line1: '9 Home St', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
          }),
      ),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);

    const finalStock = await MedicineItem.findById(medicineId);
    expect(finalStock?.stockQuantity).toBe(0);
  });
});
