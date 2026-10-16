import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../src/app';
import { connectDatabase, getConnectionState } from '../src/config/db';
import { env } from '../src/config/env';

// Built once per warm serverless container and reused across invocations, instead of per request.
const app = createApp();

let connecting: Promise<void> | null = null;

async function ensureDatabaseConnection() {
  if (getConnectionState() === 1) return;
  if (!connecting) {
    connecting = connectDatabase(env.MONGO_URI).catch((error) => {
      connecting = null;
      throw error;
    });
  }
  await connecting;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureDatabaseConnection();
  app(req, res);
}
