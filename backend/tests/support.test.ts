import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/modules/users/user.model';
import { registerAndLogin, authHeader } from './helpers';

const base = env.API_PREFIX;

async function registerAndLoginSupport(app: ReturnType<typeof createApp>) {
  const identity = await registerAndLogin(app);
  await User.updateOne({ email: identity.email }, { $set: { roles: ['support'] } });
  const loginRes = await request(app).post(`${base}/auth/login`).send({ email: identity.email, password: identity.password });
  return { ...identity, accessToken: loginRes.body.data.accessToken as string };
}

describe('support tickets: creation, messaging, and staff-only lifecycle', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase(env.MONGO_URI);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets a patient create a ticket and message it, but only staff can change its status', async () => {
    const patient = await registerAndLogin(app);
    const stranger = await registerAndLogin(app);
    const support = await registerAndLoginSupport(app);

    const createRes = await request(app)
      .post(`${base}/support/tickets`)
      .set(authHeader(patient.accessToken))
      .send({ subject: 'Wrong medicine delivered', category: 'complaint', description: 'I received the wrong item in my pharmacy order.' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.ticket.status).toBe('open');
    const ticketId = createRes.body.data.ticket.id as string;

    const strangerView = await request(app).get(`${base}/support/tickets/${ticketId}`).set(authHeader(stranger.accessToken));
    expect(strangerView.status).toBe(403);

    const patientStatusAttempt = await request(app)
      .post(`${base}/support/tickets/${ticketId}/status`)
      .set(authHeader(patient.accessToken))
      .send({ action: 'resolve', resolutionNote: 'done' });
    expect(patientStatusAttempt.status).toBe(403);

    const messageRes = await request(app)
      .post(`${base}/support/tickets/${ticketId}/messages`)
      .set(authHeader(patient.accessToken))
      .send({ body: 'Also the box was damaged.' });
    expect(messageRes.status).toBe(200);
    expect(messageRes.body.data.ticket.messages).toHaveLength(1);

    const assignRes = await request(app)
      .post(`${base}/support/tickets/${ticketId}/status`)
      .set(authHeader(support.accessToken))
      .send({ action: 'assign_to_me' });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.ticket.assignedTo).toBe(support.userId);

    const progressRes = await request(app)
      .post(`${base}/support/tickets/${ticketId}/status`)
      .set(authHeader(support.accessToken))
      .send({ action: 'start_progress' });
    expect(progressRes.status).toBe(200);
    expect(progressRes.body.data.ticket.status).toBe('in_progress');

    const resolveRes = await request(app)
      .post(`${base}/support/tickets/${ticketId}/status`)
      .set(authHeader(support.accessToken))
      .send({ action: 'resolve', resolutionNote: 'Replacement dispatched.' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.ticket.status).toBe('resolved');
    expect(resolveRes.body.data.ticket.resolutionNote).toBe('Replacement dispatched.');

    const closeRes = await request(app)
      .post(`${base}/support/tickets/${ticketId}/status`)
      .set(authHeader(support.accessToken))
      .send({ action: 'close' });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.ticket.status).toBe('closed');

    const messageOnClosed = await request(app)
      .post(`${base}/support/tickets/${ticketId}/messages`)
      .set(authHeader(patient.accessToken))
      .send({ body: 'Still waiting' });
    expect(messageOnClosed.status).toBe(409);
  });

  it('lets support list all tickets across users but keeps patients scoped to their own', async () => {
    const patientA = await registerAndLogin(app);
    const patientB = await registerAndLogin(app);
    const support = await registerAndLoginSupport(app);

    await request(app)
      .post(`${base}/support/tickets`)
      .set(authHeader(patientA.accessToken))
      .send({ subject: 'Refund request', category: 'refund_request', description: 'Order was cancelled but I was charged.' });
    await request(app)
      .post(`${base}/support/tickets`)
      .set(authHeader(patientB.accessToken))
      .send({ subject: 'Dispute over appointment fee', category: 'dispute', description: 'The clinic charged more than the listed fee.' });

    const mineA = await request(app).get(`${base}/support/tickets/mine`).set(authHeader(patientA.accessToken));
    expect(mineA.body.data.tickets).toHaveLength(1);

    const patientAdminAttempt = await request(app)
      .get(`${base}/support/tickets/admin`)
      .set(authHeader(patientA.accessToken));
    expect(patientAdminAttempt.status).toBe(403);

    const allTickets = await request(app).get(`${base}/support/tickets/admin`).set(authHeader(support.accessToken));
    expect(allTickets.status).toBe(200);
    expect(allTickets.body.data.tickets.length).toBeGreaterThanOrEqual(2);
  });
});
