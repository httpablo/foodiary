import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import KSUID from 'ksuid';

import { BadRequest } from '@application/errors/http/BadRequest';
import { Injectable } from '@kernel/decorators/Injectable';
import {
  openSignedStorageFile,
  resolveSafeStoragePath,
  signStorageFileKey,
} from './shared/signedFileStorage';

const fileKeyPattern = /^[a-zA-Z0-9]+\/[a-zA-Z0-9]+\.jpeg$/;
const maxFileBytes = 10 * 1024 * 1024;
const namespace = 'profile-photo';

@Injectable()
export class LocalProfilePhotoStorageGateway {
  generateFileKey(accountId: string): string {
    return `${accountId}/${KSUID.randomSync().string}.jpeg`;
  }

  getFileURL(fileKey: string): string {
    this.filePath(fileKey);
    const expires = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const signature = signStorageFileKey({ fileKey, expires, namespace });
    return `/profile-photos/${fileKey}?expires=${expires}&signature=${signature}`;
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
    return openSignedStorageFile({
      destination,
      fileKey,
      expiresValue,
      signature,
      namespace,
    });
  }

  private filePath(fileKey: string): string {
    return resolveSafeStoragePath({
      baseDir: process.env.LOCAL_PROFILE_PHOTOS_DIR ?? path.resolve(process.cwd(), 'data/profile-photos'),
      fileKey,
      pattern: fileKeyPattern,
      invalidMessage: 'Invalid photo file key.',
    });
  }
}
