import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../../utils/response';

export const healthRouter = Router();

const CONNECTION_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

healthRouter.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    database: CONNECTION_STATES[mongoose.connection.readyState] ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
});
