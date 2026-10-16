import { randomUUID } from 'crypto';
import path from 'path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { SaveFileInput, StorageAdapter, StoredFile } from './storage.interface';

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  // The SDK's Body is a Node Readable in this runtime (not a browser ReadableStream/Blob), since
  // this adapter only ever runs server-side.
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Same seam as LocalStorageAdapter (storage.interface.ts), backed by S3-compatible object storage
 * instead of local disk. Storage keys are still server-generated random UUIDs, never derived from
 * the client-supplied filename — the bucket should be private (no public read) since every
 * download still goes through the app's own authorization check, not a direct object URL.
 */
export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    region: string,
    credentials: { accessKeyId: string; secretAccessKey: string },
    options: { endpoint?: string; forcePathStyle?: boolean } = {},
  ) {
    this.client = new S3Client({
      region,
      credentials,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
    });
  }

  async save(input: SaveFileInput): Promise<StoredFile> {
    const extension = path.extname(input.originalFilename).slice(0, 10);
    const storageKey = `${randomUUID()}${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return { storageKey, size: input.buffer.length };
  }

  async read(storageKey: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    return streamToBuffer(result.Body);
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}
