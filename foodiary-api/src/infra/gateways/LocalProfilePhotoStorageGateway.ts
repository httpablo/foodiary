import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import KSUID from 'ksuid';

import { BadRequest } from '@application/errors/http/BadRequest';
import { Injectable } from '@kernel/decorators/Injectable';

const fileKeyPattern = /^[a-zA-Z0-9]+\/[a-zA-Z0-9]+\.jpeg$/;
const maxFileBytes = 10 * 1024 * 1024;

@Injectable()
export class LocalProfilePhotoStorageGateway {
  generateFileKey(accountId: string): string {
    return `${accountId}/${KSUID.randomSync().string}.jpeg`;
  }

  getFileURL(fileKey: string): string {
    this.filePath(fileKey);
    const expires = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    return `/profile-photos/${fileKey}?expires=${expires}&signature=${this.sign(fileKey, expires)}`;
  }

  async write(fileKey: string, bytes: Buffer): Promise<void> {
    if (bytes.length < 1 || bytes.length > maxFileBytes) {
      throw new BadRequest('Photo must be between 1 byte and 10 MB.');
    }
    const destination = this.filePath(fileKey);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx' });
  }

  async remove(fileKey: string): Promise<void> {
    try {
      await unlink(this.filePath(fileKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async open(fileKey: string, expiresValue: string | null, signature: string | null) {
    const destination = this.filePath(fileKey);
    const expires = Number(expiresValue);
    if (!expiresValue || !Number.isSafeInteger(expires) || expires < Date.now() / 1000
      || !signature || !/^[a-f0-9]{64}$/.test(signature)) {
      return null;
    }
    const expected = this.sign(fileKey, expires);
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return null;
    }
    try {
      const metadata = await stat(destination);
      if (!metadata.isFile()) {
        return null;
      }
      return { stream: createReadStream(destination), size: metadata.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private filePath(fileKey: string): string {
    if (!fileKeyPattern.test(fileKey)) {
      throw new BadRequest('Invalid photo file key.');
    }
    return path.join(
      process.env.LOCAL_PROFILE_PHOTOS_DIR ?? path.resolve(process.cwd(), 'data/profile-photos'),
      fileKey,
    );
  }

  private sign(fileKey: string, expires: number): string {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes.');
    }
    return createHmac('sha256', secret).update(`profile-photo:${fileKey}:${expires}`).digest('hex');
  }
}
