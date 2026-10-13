import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { CaregiverAccess } from '../src/modules/medicalRecords/caregiverAccess.model';
import { registerAndLogin, authHeader } from './helpers';

const base = env.API_PREFIX;

describe('medical records: patient self-access', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets a patient manage their own profile, documents, and visits', async () => {
    const patient = await registerAndLogin(app);

    const emptyProfile = await request(app).get(`${base}/medical-records/me/profile`).set(authHeader(patient.accessToken));
    expect(emptyProfile.status).toBe(200);
    expect(emptyProfile.body.data.profile).toBeNull();

    const updateRes = await request(app)
      .patch(`${base}/medical-records/me/profile`)
      .set(authHeader(patient.accessToken))
      .send({ bloodType: 'O+', allergies: ['Penicillin'], currentMedications: ['Metformin'] });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.profile.allergies).toEqual(['Penicillin']);

    const uploadRes = await request(app)
      .post(`${base}/medical-records/me/documents`)
      .set(authHeader(patient.accessToken))
      .field('documentType', 'prescription')
      .field('title', 'Old prescription')
      .attach('document', Buffer.from('%PDF-1.4 rx'), { filename: 'rx.pdf', contentType: 'application/pdf' });
    expect(uploadRes.status).toBe(201);
    const documentId = uploadRes.body.data.document.id as string;

    const listDocsRes = await request(app).get(`${base}/medical-records/me/documents`).set(authHeader(patient.accessToken));
    expect(listDocsRes.body.data.documents).toHaveLength(1);

    const downloadRes = await request(app)
      .get(`${base}/medical-records/me/documents/${documentId}/download`)
      .set(authHeader(patient.accessToken));
    expect(downloadRes.status).toBe(200);

    const visitRes = await request(app)
      .post(`${base}/medical-records/me/visits`)
      .set(authHeader(patient.accessToken))
      .send({ visitDate: '2026-01-10', reasonForVisit: 'Annual checkup' });
    expect(visitRes.status).toBe(201);
    const visitId = visitRes.body.data.visit.id as string;

    const updateVisitRes = await request(app)
      .patch(`${base}/medical-records/me/visits/${visitId}`)
      .set(authHeader(patient.accessToken))
      .send({ notes: 'All normal' });
    expect(updateVisitRes.status).toBe(200);
    expect(updateVisitRes.body.data.visit.notes).toBe('All normal');

    const deleteVisitRes = await request(app)
      .delete(`${base}/medical-records/me/visits/${visitId}`)
      .set(authHeader(patient.accessToken));
    expect(deleteVisitRes.status).toBe(200);

    const deleteDocRes = await request(app)
      .delete(`${base}/medical-records/me/documents/${documentId}`)
      .set(authHeader(patient.accessToken));
    expect(deleteDocRes.status).toBe(200);
  });

  it('blocks a stranger with no caregiver grant from reading or writing another patient\'s records', async () => {
    const patient = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);

    const readRes = await request(app)
      .get(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(stranger.accessToken));
    expect(readRes.status).toBe(403);

    const writeRes = await request(app)
      .patch(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(stranger.accessToken))
      .send({ bloodType: 'A+' });
    expect(writeRes.status).toBe(403);
  });
});

describe('medical records: caregiver access', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('full flow: invite requires an existing account, accept grants exactly the chosen scopes, revoke removes it', async () => {
    const patient = await registerAndLogin(app);
    const caregiver = await registerAndLogin(app);

    const inviteNonexistent = await request(app)
      .post(`${base}/medical-records/caregivers`)
      .set(authHeader(patient.accessToken))
      .send({ caregiverEmail: 'nobody-registered@example.com', scopes: ['view_profile'] });
    expect(inviteNonexistent.status).toBe(404);

    const selfInvite = await request(app)
      .post(`${base}/medical-records/caregivers`)
      .set(authHeader(patient.accessToken))
      .send({ caregiverEmail: patient.email, scopes: ['view_profile'] });
    expect(selfInvite.status).toBe(400);

    const inviteRes = await request(app)
      .post(`${base}/medical-records/caregivers`)
      .set(authHeader(patient.accessToken))
      .send({ caregiverEmail: caregiver.email, scopes: ['view_profile', 'view_visits'] });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.data.grant.status).toBe('pending');
    const grantId = inviteRes.body.data.grant.id as string;

    const duplicateInvite = await request(app)
      .post(`${base}/medical-records/caregivers`)
      .set(authHeader(patient.accessToken))
      .send({ caregiverEmail: caregiver.email, scopes: ['view_profile'] });
    expect(duplicateInvite.status).toBe(409);

    // Before accepting, the caregiver has no access at all.
    const beforeAccept = await request(app)
      .get(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(caregiver.accessToken));
    expect(beforeAccept.status).toBe(403);

    const invitesToMe = await request(app)
      .get(`${base}/medical-records/caregiver-invites`)
      .set(authHeader(caregiver.accessToken));
    expect(invitesToMe.body.data.grants.map((g: { id: string }) => g.id)).toContain(grantId);

    const acceptRes = await request(app)
      .post(`${base}/medical-records/caregiver-invites/${grantId}/accept`)
      .set(authHeader(caregiver.accessToken));
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.grant.status).toBe('active');

    // Granted scope: view_profile works.
    const profileRes = await request(app)
      .get(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(caregiver.accessToken));
    expect(profileRes.status).toBe(200);

    // Granted scope: view_visits works.
    const visitsRes = await request(app)
      .get(`${base}/medical-records/${patient.userId}/visits`)
      .set(authHeader(caregiver.accessToken));
    expect(visitsRes.status).toBe(200);

    // NOT granted: view_documents and manage_profile must still be forbidden.
    const documentsRes = await request(app)
      .get(`${base}/medical-records/${patient.userId}/documents`)
      .set(authHeader(caregiver.accessToken));
    expect(documentsRes.status).toBe(403);

    const editRes = await request(app)
      .patch(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(caregiver.accessToken))
      .send({ bloodType: 'B+' });
    expect(editRes.status).toBe(403);

    // The caregiver can never see the patient's audit log, even with full access.
    const auditAsCaregiver = await request(app)
      .get(`${base}/medical-records/${patient.userId}/access-log`)
      .set(authHeader(caregiver.accessToken));
    expect(auditAsCaregiver.status).toBe(403);

    // The patient can see it, and the caregiver's profile view above should appear in it.
    const auditAsPatient = await request(app)
      .get(`${base}/medical-records/me/access-log`)
      .set(authHeader(patient.accessToken));
    expect(auditAsPatient.status).toBe(200);
    const actions = auditAsPatient.body.data.logs.map((l: { action: string }) => l.action);
    expect(actions).toContain('view_profile');
    expect(actions).toContain('view_visits');

    // Revoke, then confirm access is gone.
    const revokeRes = await request(app)
      .post(`${base}/medical-records/caregivers/${grantId}/revoke`)
      .set(authHeader(patient.accessToken));
    expect(revokeRes.status).toBe(200);

    const afterRevoke = await request(app)
      .get(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(caregiver.accessToken));
    expect(afterRevoke.status).toBe(403);
  });

  it('treats an expired grant as inactive even though its status is still "active"', async () => {
    const patient = await registerAndLogin(app);
    const caregiver = await registerAndLogin(app);

    const inviteRes = await request(app)
      .post(`${base}/medical-records/caregivers`)
      .set(authHeader(patient.accessToken))
      .send({ caregiverEmail: caregiver.email, scopes: ['view_profile'] });
    const grantId = inviteRes.body.data.grant.id as string;

    await request(app).post(`${base}/medical-records/caregiver-invites/${grantId}/accept`).set(authHeader(caregiver.accessToken));

    const workingRes = await request(app)
      .get(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(caregiver.accessToken));
    expect(workingRes.status).toBe(200);

    await CaregiverAccess.updateOne({ _id: grantId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const expiredRes = await request(app)
      .get(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(caregiver.accessToken));
    expect(expiredRes.status).toBe(403);
  });

  it('lets a caregiver decline an invite, which grants no access', async () => {
    const patient = await registerAndLogin(app);
    const caregiver = await registerAndLogin(app);

    const inviteRes = await request(app)
      .post(`${base}/medical-records/caregivers`)
      .set(authHeader(patient.accessToken))
      .send({ caregiverEmail: caregiver.email, scopes: ['view_profile'] });
    const grantId = inviteRes.body.data.grant.id as string;

    const declineRes = await request(app)
      .post(`${base}/medical-records/caregiver-invites/${grantId}/decline`)
      .set(authHeader(caregiver.accessToken));
    expect(declineRes.status).toBe(200);
    expect(declineRes.body.data.grant.status).toBe('declined');

    const accessRes = await request(app)
      .get(`${base}/medical-records/${patient.userId}/profile`)
      .set(authHeader(caregiver.accessToken));
    expect(accessRes.status).toBe(403);
  });

  it('never lets a caregiver delete records, even with manage_profile scope', async () => {
    const patient = await registerAndLogin(app);
    const caregiver = await registerAndLogin(app);

    const uploadRes = await request(app)
      .post(`${base}/medical-records/me/documents`)
      .set(authHeader(patient.accessToken))
      .field('documentType', 'other')
      .field('title', 'Some document')
      .attach('document', Buffer.from('fake'), { filename: 'd.pdf', contentType: 'application/pdf' });
    const documentId = uploadRes.body.data.document.id as string;

    const inviteRes = await request(app)
      .post(`${base}/medical-records/caregivers`)
      .set(authHeader(patient.accessToken))
      .send({ caregiverEmail: caregiver.email, scopes: ['view_documents', 'manage_profile'] });
    const grantId = inviteRes.body.data.grant.id as string;
    await request(app).post(`${base}/medical-records/caregiver-invites/${grantId}/accept`).set(authHeader(caregiver.accessToken));

    const deleteRes = await request(app)
      .delete(`${base}/medical-records/${patient.userId}/documents/${documentId}`)
      .set(authHeader(caregiver.accessToken));
    expect(deleteRes.status).toBe(403);
  });
});
