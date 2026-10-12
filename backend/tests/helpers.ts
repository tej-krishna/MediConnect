import type { Express } from 'express';
import request from 'supertest';
import { env } from '../src/config/env';
import { User } from '../src/modules/users/user.model';

const base = env.API_PREFIX;

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export async function registerAndLogin(app: Express, overrides: Partial<{ email: string; password: string; fullName: string }> = {}) {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? 'correct-horse-1';
  const fullName = overrides.fullName ?? 'Test User';

  await request(app).post(`${base}/auth/register`).send({ email, password, fullName });
  const loginRes = await request(app).post(`${base}/auth/login`).send({ email, password });

  return {
    email,
    password,
    userId: loginRes.body.data.user.id as string,
    accessToken: loginRes.body.data.accessToken as string,
  };
}

export async function promoteToSuperAdmin(email: string) {
  await User.updateOne({ email }, { $set: { roles: ['super_admin'] } });
}

export async function registerAdminAndLogin(app: Express) {
  const identity = await registerAndLogin(app, { fullName: 'Admin User' });
  await promoteToSuperAdmin(identity.email);
  const loginRes = await request(app)
    .post(`${base}/auth/login`)
    .send({ email: identity.email, password: identity.password });
  return { ...identity, accessToken: loginRes.body.data.accessToken as string };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createApprovedProvider(
  app: Express,
  ownerToken: string,
  adminToken: string,
  payload: Record<string, unknown>,
) {
  const createRes = await request(app)
    .post(`${base}/providers/applications`)
    .set(authHeader(ownerToken))
    .send(payload);
  const appId = createRes.body.data.application.id as string;

  await request(app)
    .post(`${base}/providers/applications/${appId}/documents`)
    .set(authHeader(ownerToken))
    .field('documentType', 'license')
    .attach('document', Buffer.from('fake'), { filename: 'license.pdf', contentType: 'application/pdf' });
  await request(app).post(`${base}/providers/applications/${appId}/submit`).set(authHeader(ownerToken));
  await request(app)
    .post(`${base}/providers/admin/${appId}/transition`)
    .set(authHeader(adminToken))
    .send({ action: 'start_review' });
  const approveRes = await request(app)
    .post(`${base}/providers/admin/${appId}/transition`)
    .set(authHeader(adminToken))
    .send({ action: 'approve' });

  return { appId, application: approveRes.body.data.application };
}
