import { mkdirSync } from 'fs';
import path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function setup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-please-change';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-please-change';

  // mongodb-memory-server writes its data files under the OS temp dir by default (os.tmpdir(),
  // which reads TEMP/TMP). On this machine that's the system (C:) drive, which can run critically
  // low on free space independently of this project — WiredTiger refuses to even create an index
  // below ~500MB free. Pointing it at a folder on this project's own drive instead keeps test runs
  // working regardless of how full C: is.
  const localTmpDir = path.resolve(__dirname, '..', '.tmp-mongodb-memory-server');
  mkdirSync(localTmpDir, { recursive: true });
  process.env.TEMP = localTmpDir;
  process.env.TMP = localTmpDir;

  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  return async () => {
    await mongod.stop();
  };
}
