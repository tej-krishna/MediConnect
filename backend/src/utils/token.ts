import { randomBytes, createHash } from 'crypto';

export function generateOpaqueToken(): string {
  return randomBytes(40).toString('hex');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
