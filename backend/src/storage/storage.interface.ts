export interface StoredFile {
  storageKey: string;
  size: number;
}

export interface SaveFileInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

/**
 * Seam between the rest of the backend and wherever uploaded files actually live. Local disk
 * today; swapping to S3-compatible storage later means writing a new class that implements this
 * interface, not touching any calling code.
 */
export interface StorageAdapter {
  save(input: SaveFileInput): Promise<StoredFile>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}
