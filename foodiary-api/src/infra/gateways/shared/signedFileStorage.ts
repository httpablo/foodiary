import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, ReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import { BadRequest } from '@application/errors/http/BadRequest';

export function getJwtSecretOrThrow(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes.');
  }
  return secret;
}

export function resolveSafeStoragePath({
  baseDir,
  fileKey,
  pattern,
  invalidMessage,
}: {
  baseDir: string;
  fileKey: string;
  pattern: RegExp;
  invalidMessage: string;
}): string {
  if (!pattern.test(fileKey)) {
    throw new BadRequest(invalidMessage);
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, fileKey);
  const relative = path.relative(resolvedBase, resolvedTarget);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new BadRequest(invalidMessage);
  }

  return resolvedTarget;
}

export function signStorageFileKey({
  fileKey,
  expires,
  namespace,
}: {
  fileKey: string;
  expires: number;
  namespace?: string;
}): string {
  const secret = getJwtSecretOrThrow();
  const payload = namespace ? `${namespace}:${fileKey}:${expires}` : `${fileKey}:${expires}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySignedStorageAccess({
  fileKey,
  expiresValue,
  signature,
  namespace,
}: {
  fileKey: string;
  expiresValue: string | null;
  signature: string | null;
  namespace?: string;
}): boolean {
  const expires = Number(expiresValue);
  if (!expiresValue || !Number.isSafeInteger(expires) || expires < Date.now() / 1000
    || !signature || !/^[a-f0-9]{64}$/.test(signature)) {
    return false;
  }

  const expected = signStorageFileKey({ fileKey, expires, namespace });
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

export async function openSignedStorageFile({
  destination,
  fileKey,
  expiresValue,
  signature,
  namespace,
}: {
  destination: string;
  fileKey: string;
  expiresValue: string | null;
  signature: string | null;
  namespace?: string;
}): Promise<{ stream: ReadStream; size: number } | null> {
  if (!verifySignedStorageAccess({ fileKey, expiresValue, signature, namespace })) {
    return null;
  }

  try {
    const metadata = await stat(destination);
    if (!metadata.isFile()) {
      return null;
    }
    return {
      stream: createReadStream(destination),
      size: metadata.size,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
