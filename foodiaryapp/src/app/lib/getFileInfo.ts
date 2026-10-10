import { File } from 'expo-file-system';

export async function getFileInfo(fileUri: string) {
  const fileInfo = new File(fileUri).info();
  const filename = fileUri.split('/').at(-1);

  if (!fileInfo.exists || !fileInfo.size || !filename) {
    throw new Error(`${fileUri}: this file does not exists`);
  }

  const extension = filename.split('.').at(-1)?.toLowerCase();
  let type: 'image/jpeg' | 'audio/m4a';

  if (extension === 'jpg' || extension === 'jpeg') {
    type = 'image/jpeg';
  } else if (extension === 'm4a') {
    type = 'audio/m4a';
  } else {
    throw new Error(`Unsupported meal file type: ${filename}`);
  }

  return {
    size: fileInfo.size,
    filename,
    type,
  };
}
