import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { SaveFileInput, StorageAdapter, StoredFile } from './storage.interface';

/**
 * Stores files on local disk under a private root that is never served statically. Storage keys
 * are server-generated random UUIDs (not derived from the original filename) so a file can never
 * be guessed or requested by a predictable URL — access always goes through an authorized download
 * endpoint that resolves the key to a path.
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly rootDir: string) {}

  private resolvePath(storageKey: string): string {
    const resolved = path.resolve(this.rootDir, storageKey);
    if (!resolved.startsWith(path.resolve(this.rootDir))) {
      throw new Error('Resolved storage path escapes the storage root');
    }
    return resolved;
  }

  async save(input: SaveFileInput): Promise<StoredFile> {
    await fs.mkdir(this.rootDir, { recursive: true });
    const extension = path.extname(input.originalFilename).slice(0, 10);
    const storageKey = `${randomUUID()}${extension}`;
    await fs.writeFile(this.resolvePath(storageKey), input.buffer);
    return { storageKey, size: input.buffer.length };
  }

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(this.resolvePath(storageKey), { force: true });
  }
}
