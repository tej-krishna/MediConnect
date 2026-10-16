import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/modules/users/user.model';
import { registerAndLogin, registerAdminAndLogin, authHeader, uniqueEmail, sampleTypeDetailsFor } from './helpers';

const base = env.API_PREFIX;

function samplePayload(overrides: Partial<Record<string, unknown>> = {}) {
  const providerType = (overrides.providerType as string) ?? 'doctor';
  return {
    providerType,
    organizationName: 'Dr. Meera Clinic',
    registrationNumber: `MCI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issuingAuthority: 'State Medical Council',
    contactPhone: '9876500001',
    contactEmail: uniqueEmail('provider-contact'),
    address: { line1: '12 MG Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    typeDetails: sampleTypeDetailsFor(providerType),
    ...overrides,
  };
}

describe('provider applications: full lifecycle', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('walks an application from draft through approval and grants the provider role', async () => {
    const applicant = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(applicant.accessToken))
      .send(samplePayload());
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.application.status).toBe('draft');
    const appId = createRes.body.data.application.id as string;

    const submitBeforeDocs = await request(app)
      .post(`${base}/providers/applications/${appId}/submit`)
      .set(authHeader(applicant.accessToken));
    expect(submitBeforeDocs.status).toBe(400);

    const uploadRes = await request(app)
      .post(`${base}/providers/applications/${appId}/documents`)
      .set(authHeader(applicant.accessToken))
      .field('documentType', 'medical_license')
      .attach('document', Buffer.from('%PDF-1.4 fake license'), {
        filename: 'license.pdf',
        contentType: 'application/pdf',
      });
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.application.documents).toHaveLength(1);

    const submitRes = await request(app)
      .post(`${base}/providers/applications/${appId}/submit`)
      .set(authHeader(applicant.accessToken));
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.application.status).toBe('submitted');

    const nonAdminTransition = await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(applicant.accessToken))
      .send({ action: 'start_review' });
    expect(nonAdminTransition.status).toBe(403);

    const startReview = await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'start_review' });
    expect(startReview.status).toBe(200);
    expect(startReview.body.data.application.status).toBe('under_review');

    const approve = await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'approve' });
    expect(approve.status).toBe(200);
    expect(approve.body.data.application.status).toBe('approved');
    expect(approve.body.data.application.isActivelyVerified).toBe(true);
    expect(approve.body.data.application.expiresAt).toBeTruthy();

    const applicantUser = await User.findById(applicant.userId);
    expect(applicantUser?.roles).toContain('doctor');

    const suspend = await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'suspend', reason: 'Licence under investigation' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.application.status).toBe('suspended');
    expect(suspend.body.data.application.isActivelyVerified).toBe(false);

    const reinstate = await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'reinstate' });
    expect(reinstate.status).toBe(200);
    expect(reinstate.body.data.application.status).toBe('approved');
  });

  it('rejects an application and records the reason', async () => {
    const applicant = await registerAndLogin(app);
    const admin = await registerAdminAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(applicant.accessToken))
      .send(samplePayload({ providerType: 'pharmacy' }));
    const appId = createRes.body.data.application.id as string;

    await request(app)
      .post(`${base}/providers/applications/${appId}/documents`)
      .set(authHeader(applicant.accessToken))
      .field('documentType', 'drug_license')
      .attach('document', Buffer.from('fake'), { filename: 'license.pdf', contentType: 'application/pdf' });
    await request(app).post(`${base}/providers/applications/${appId}/submit`).set(authHeader(applicant.accessToken));
    await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'start_review' });

    const reject = await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'reject', reason: 'Registration number could not be confirmed' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.application.status).toBe('rejected');
    expect(reject.body.data.application.rejectionReason).toBe('Registration number could not be confirmed');

    const furtherTransition = await request(app)
      .post(`${base}/providers/admin/${appId}/transition`)
      .set(authHeader(admin.accessToken))
      .send({ action: 'start_review' });
    expect(furtherTransition.status).toBe(409);
  });

  it('rejects uploads with a disallowed file type', async () => {
    const applicant = await registerAndLogin(app);
    const createRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(applicant.accessToken))
      .send(samplePayload({ providerType: 'clinic' }));
    const appId = createRes.body.data.application.id as string;

    const res = await request(app)
      .post(`${base}/providers/applications/${appId}/documents`)
      .set(authHeader(applicant.accessToken))
      .field('documentType', 'license')
      .attach('document', Buffer.from('bad'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });

    expect(res.status).toBe(400);
  });

  it('prevents a non-owner from viewing or downloading another applicant\'s application', async () => {
    const owner = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);

    const createRes = await request(app)
      .post(`${base}/providers/applications`)
      .set(authHeader(owner.accessToken))
      .send(samplePayload({ providerType: 'hospital' }));
    const appId = createRes.body.data.application.id as string;

    const res = await request(app).get(`${base}/providers/applications/${appId}`).set(authHeader(stranger.accessToken));
    expect(res.status).toBe(403);
  });

  it('keeps non-admins out of the admin review queue', async () => {
    const applicant = await registerAndLogin(app);
    const res = await request(app).get(`${base}/providers/admin`).set(authHeader(applicant.accessToken));
    expect(res.status).toBe(403);
  });
});
