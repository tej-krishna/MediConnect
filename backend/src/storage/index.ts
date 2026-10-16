import { env } from '../config/env';
import { LocalStorageAdapter } from './local.storage';
import { S3StorageAdapter } from './s3.storage';
import type { StorageAdapter } from './storage.interface';

function requireEnv(name: 'AWS_S3_BUCKET' | 'AWS_REGION' | 'AWS_ACCESS_KEY_ID' | 'AWS_SECRET_ACCESS_KEY'): string {
  const value = env[name];
  if (!value) {
    throw new Error(`STORAGE_DRIVER=s3 requires ${name} to be set`);
  }
  return value;
}

function createStorageAdapter(): StorageAdapter {
  switch (env.STORAGE_DRIVER) {
    case 'local':
      return new LocalStorageAdapter(env.STORAGE_PRIVATE_ROOT);
    case 's3':
      return new S3StorageAdapter(
        requireEnv('AWS_S3_BUCKET'),
        requireEnv('AWS_REGION'),
        {
          accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
          secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
        },
        { endpoint: env.AWS_S3_ENDPOINT, forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE },
      );
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

export const storage = createStorageAdapter();
export type { StorageAdapter, SaveFileInput, StoredFile } from './storage.interface';
