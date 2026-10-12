import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDatabase(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export function getConnectionState() {
  return mongoose.connection.readyState;
}
