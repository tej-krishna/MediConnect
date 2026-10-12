import { env } from '../config/env';
import { LocalStorageAdapter } from './local.storage';
import type { StorageAdapter } from './storage.interface';

function createStorageAdapter(): StorageAdapter {
  switch (env.STORAGE_DRIVER) {
    case 'local':
      return new LocalStorageAdapter(env.STORAGE_PRIVATE_ROOT);
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

export const storage = createStorageAdapter();
export type { StorageAdapter, SaveFileInput, StoredFile } from './storage.interface';
