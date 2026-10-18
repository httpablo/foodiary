import { File } from 'expo-file-system';

export type MealFileMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'audio/m4a'
  | 'audio/mp4'
  | 'audio/webm'
  | 'audio/ogg'
  | 'audio/wav';

export interface IMealFileInfo {
  size: number;
  filename: string;
  type: MealFileMimeType;
  blob?: Blob;
}

const EXTENSION_TO_MIME: Record<string, MealFileMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  m4a: 'audio/m4a',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

const MIME_TO_EXTENSION: Record<MealFileMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/m4a': 'm4a',
  'audio/mp4': 'mp4',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
};

function normalizeMimeType(rawMime?: string): MealFileMimeType | undefined {
  if (!rawMime) {
    return undefined;
  }

  const baseMime = rawMime.split(';')[0]?.trim().toLowerCase();
  if (!baseMime) {
    return undefined;
  }

  switch (baseMime) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'image/jpeg';
    case 'image/png':
      return 'image/png';
    case 'image/webp':
      return 'image/webp';
    case 'audio/m4a':
    case 'audio/x-m4a':
      return 'audio/m4a';
    case 'audio/mp4':
    case 'video/mp4':
      return 'audio/mp4';
    case 'audio/webm':
    case 'video/webm':
      return 'audio/webm';
    case 'audio/ogg':
    case 'application/ogg':
      return 'audio/ogg';
    case 'audio/wav':
    case 'audio/x-wav':
    case 'audio/wave':
      return 'audio/wav';
    default:
      return undefined;
  }
}

function extractExtensionFromUri(fileUri: string): string | undefined {
  const cleanUri = fileUri.split(/[?#]/)[0] ?? fileUri;
  const basename = cleanUri.split('/').at(-1);
  if (!basename || !basename.includes('.')) {
    return undefined;
  }
  return basename.split('.').at(-1)?.toLowerCase();
}

function decodeDataUriToBlob(dataUri: string): Blob {
  const commaIndex = dataUri.indexOf(',');
  if (commaIndex === -1) {
    throw new Error(`${dataUri}: invalid data URI`);
  }

  const header = dataUri.slice(5, commaIndex);
  const body = dataUri.slice(commaIndex + 1);
  const parts = header.split(';');
  const mimeType = parts[0] || '';
  const isBase64 = parts.includes('base64');

  if (isBase64) {
    const binary = atob(body.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index) & 0xff;
    }
    return new Blob([bytes], { type: mimeType });
  }

  return new Blob([decodeURIComponent(body)], { type: mimeType });
}

async function getBlobFileInfo(fileUri: string): Promise<IMealFileInfo> {
  const blob = fileUri.startsWith('data:')
    ? decodeDataUriToBlob(fileUri)
    : await fetch(fileUri).then((response) => {
      if (!response.ok) {
        throw new Error(`${fileUri}: this file does not exists`);
      }
      return response.blob();
    });

  if (!blob || !blob.size) {
    throw new Error(`${fileUri}: this file does not exists`);
  }

  const rawMime = blob.type.split(';')[0]?.trim().toLowerCase() ?? '';
  const extensionFromUri = extractExtensionFromUri(fileUri);
  let type = normalizeMimeType(rawMime);

  if (!type) {
    if (rawMime && rawMime !== 'application/octet-stream') {
      throw new Error(`Unsupported meal file type: ${rawMime}`);
    }
    if (extensionFromUri && EXTENSION_TO_MIME[extensionFromUri]) {
      type = EXTENSION_TO_MIME[extensionFromUri];
    } else if (fileUri.toLowerCase().includes('audio')) {
      type = 'audio/m4a';
    } else {
      type = 'image/jpeg';
    }
  }

  const ext = MIME_TO_EXTENSION[type];
  const filename = `meal.${ext}`;
  const normalizedBlob = blob.type === type
    ? blob
    : new Blob([await blob.arrayBuffer()], { type });

  return {
    size: normalizedBlob.size,
    filename,
    type,
    blob: normalizedBlob,
  };
}

export async function getFileInfo(fileUri: string): Promise<IMealFileInfo> {
  if (
    fileUri.startsWith('data:')
    || fileUri.startsWith('blob:')
    || fileUri.startsWith('http://')
    || fileUri.startsWith('https://')
  ) {
    return getBlobFileInfo(fileUri);
  }

  let fileInfo: { exists?: boolean; size?: number } | null = null;
  try {
    const fileInstance = new File(fileUri) as { info?: () => { exists?: boolean; size?: number } };
    if (typeof fileInstance.info === 'function') {
      fileInfo = fileInstance.info();
    }
  } catch {
    fileInfo = null;
  }

  if (!fileInfo) {
    return getBlobFileInfo(fileUri);
  }

  const cleanUri = fileUri.split(/[?#]/)[0] ?? fileUri;
  const filename = cleanUri.split('/').at(-1);

  if (!fileInfo.exists || !fileInfo.size || !filename) {
    throw new Error(`${fileUri}: this file does not exists`);
  }

  const extension = extractExtensionFromUri(cleanUri);
  const type = extension ? EXTENSION_TO_MIME[extension] : undefined;
  if (!type) {
    throw new Error(`Unsupported meal file type: ${filename}`);
  }

  return {
    size: fileInfo.size,
    filename,
    type,
  };
}
