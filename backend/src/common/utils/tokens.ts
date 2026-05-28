import { randomBytes, createHash } from 'node:crypto';

export function generateOpaqueToken(size = 32) {
  return randomBytes(size).toString('hex');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
