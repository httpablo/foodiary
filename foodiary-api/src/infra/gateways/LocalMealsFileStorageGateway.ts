import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import KSUID from 'ksuid';

import { Meal } from '@application/entities/Meal';
import { BadRequest } from '@application/errors/http/BadRequest';
import { Injectable } from '@kernel/decorators/Injectable';
import {
  openSignedStorageFile,
  resolveSafeStoragePath,
  signStorageFileKey,
} from './shared/signedFileStorage';

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
    const signature = signStorageFileKey({ fileKey, expires });
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
    const opened = await openSignedStorageFile({
      destination,
      fileKey,
      expiresValue,
      signature,
    });
    if (!opened) {
      return null;
    }

    return {
      ...opened,
      contentType: LocalMealsFileStorageGateway.getMimeTypeFromFileKey(fileKey),
    };
  }

  private filePath(fileKey: string): string {
    return resolveSafeStoragePath({
      baseDir: process.env.LOCAL_MEALS_DIR ?? path.resolve(process.cwd(), 'data/meals'),
      fileKey,
      pattern: fileKeyPattern,
      invalidMessage: 'Invalid file key.',
    });
  }
}
