import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import KSUID from 'ksuid';

import { Meal } from '@application/entities/Meal';
import { BadRequest } from '@application/errors/http/BadRequest';
import { Injectable } from '@kernel/decorators/Injectable';

const fileKeyPattern = /^[a-zA-Z0-9]+\/[a-zA-Z0-9]+\.(?:jpeg|png|webp|m4a|mp4|webm|ogg|wav)$/;
const maxFileBytes = 10 * 1024 * 1024;

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/m4a': 'm4a',
  'audio/mp4': 'mp4',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
};

const mimeTypeByExtension: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  m4a: 'audio/m4a',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

@Injectable()
export class LocalMealsFileStorageGateway {
  static generateInputFileKey({ accountId, inputType, mimeType }: {
    accountId: string;
    inputType: Exclude<Meal.InputType, Meal.InputType.MANUAL>;
    mimeType?: string;
  }): string {
    const normalizedMime = mimeType?.split(';')[0].trim().toLowerCase();
    const mappedExtension = normalizedMime ? extensionByMimeType[normalizedMime] : undefined;
    const defaultExtension = inputType === Meal.InputType.AUDIO ? 'm4a' : 'jpeg';
    const extension = mappedExtension
      && ((inputType === Meal.InputType.AUDIO && normalizedMime?.startsWith('audio/'))
        || (inputType === Meal.InputType.PICTURE && normalizedMime?.startsWith('image/')))
      ? mappedExtension
      : defaultExtension;
    return `${accountId}/${KSUID.randomSync().string}.${extension}`;
  }

  static getFileExtension(fileKey: string): string {
    return fileKey.split('.').pop()?.toLowerCase() ?? '';
  }

  static getMimeTypeFromFileKey(fileKey: string, fallbackInputType?: Meal.InputType): string {
    const ext = LocalMealsFileStorageGateway.getFileExtension(fileKey);
    return mimeTypeByExtension[ext]
      ?? (fallbackInputType === Meal.InputType.AUDIO ? 'audio/m4a' : 'image/jpeg');
  }

  createPOST({ mealId }: { mealId: string }): { uploadSignature: string } {
    return {
      uploadSignature: Buffer.from(JSON.stringify({
        url: `/meal-uploads/${mealId}`,
        fields: {},
      })).toString('base64'),
    };
  }

  getFileURL(fileKey: string): string {
    this.filePath(fileKey);
    const expires = Math.floor(Date.now() / 1000) + 60 * 60;
    const signature = this.sign(fileKey, expires);
    return `/meal-files/${fileKey}?expires=${expires}&signature=${signature}`;
  }

  async write(fileKey: string, bytes: Buffer): Promise<void> {
    if (bytes.length < 1 || bytes.length > maxFileBytes) {
      throw new BadRequest('File must be between 1 byte and 10 MB.');
    }

    const destination = this.filePath(fileKey);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx' });
  }

  async remove(fileKey: string): Promise<void> {
    await unlink(this.filePath(fileKey));
  }

  async read(fileKey: string): Promise<Buffer> {
    return readFile(this.filePath(fileKey));
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
      return {
        stream: createReadStream(destination),
        size: metadata.size,
        contentType: LocalMealsFileStorageGateway.getMimeTypeFromFileKey(fileKey),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private filePath(fileKey: string): string {
    if (!fileKeyPattern.test(fileKey)) {
      throw new BadRequest('Invalid file key.');
    }
    return path.join(process.env.LOCAL_MEALS_DIR ?? path.resolve(process.cwd(), 'data/meals'), fileKey);
  }

  private sign(fileKey: string, expires: number): string {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes.');
    }
    return createHmac('sha256', secret).update(`${fileKey}:${expires}`).digest('hex');
  }
}
