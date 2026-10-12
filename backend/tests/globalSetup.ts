import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function setup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-please-change';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-please-change';

  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  return async () => {
    await mongod.stop();
  };
}
