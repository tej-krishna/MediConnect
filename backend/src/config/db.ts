import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDatabase(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  // Index creation (e.g. the 2dsphere index providers are searched by) happens asynchronously
  // after connect() — without waiting for it here, a query that depends on an index (like
  // $geoNear) can run before the index exists, especially against a freshly created database.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));
  logger.info('MongoDB connected');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export function getConnectionState() {
  return mongoose.connection.readyState;
}
