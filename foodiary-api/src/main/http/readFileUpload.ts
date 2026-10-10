import Busboy from 'busboy';
import { IncomingMessage } from 'node:http';

import { BadRequest } from '@application/errors/http/BadRequest';

const maxFileBytes = 10 * 1024 * 1024;

export function readFileUpload(request: IncomingMessage): Promise<{ bytes: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    let parser: ReturnType<typeof Busboy>;
    try {
      parser = Busboy({
        headers: request.headers,
        limits: { fileSize: maxFileBytes, files: 1, fields: 0, parts: 2 },
      });
    } catch {
      reject(new BadRequest('Expected a multipart file upload.'));
      return;
    }

    let chunks: Buffer[] = [];
    let contentType = '';
    let count = 0;
    let invalid = false;

    parser.on('file', (name, stream, info) => {
      count += 1;
      contentType = info.mimeType;
      if (name !== 'file') {
        invalid = true;
      }
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('limit', () => { invalid = true; });
    });
    parser.on('filesLimit', () => { invalid = true; });
    parser.on('fieldsLimit', () => { invalid = true; });
    parser.on('partsLimit', () => { invalid = true; });
    parser.on('error', () => reject(new BadRequest('Malformed multipart upload.')));
    request.on('error', reject);
    request.on('aborted', () => reject(new BadRequest('Upload was interrupted.')));
    parser.on('close', () => {
      const bytes = Buffer.concat(chunks);
      chunks = [];
      if (invalid || count !== 1 || bytes.length < 1 || bytes.length > maxFileBytes) {
        reject(new BadRequest('Upload must contain one file of up to 10 MB.'));
      } else {
        resolve({ bytes, contentType });
      }
    });
    request.pipe(parser);
  });
}
