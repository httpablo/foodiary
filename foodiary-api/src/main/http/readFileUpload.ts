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
        limits: { fileSize: maxFileBytes + 1, files: 1, fields: 0, parts: 2 },
      });
    } catch {
      reject(new BadRequest('Expected a multipart file upload.'));
      return;
    }

    let chunks: Buffer[] = [];
    let totalBytes = 0;
    let contentType = '';
    let count = 0;
    let invalid = false;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      chunks = [];
      request.unpipe(parser);
      request.resume();
      reject(error);
    };

    parser.on('file', (name, stream, info) => {
      count += 1;
      contentType = info.mimeType;
      if (name !== 'file' || count > 1) {
        invalid = true;
        stream.resume();
      }
      stream.on('data', (chunk: Buffer) => {
        if (invalid || settled) {
          return;
        }
        totalBytes += chunk.length;
        if (totalBytes > maxFileBytes) {
          invalid = true;
          chunks = [];
          stream.resume();
          return;
        }
        chunks.push(chunk);
      });
      stream.on('limit', () => {
        invalid = true;
        chunks = [];
        stream.resume();
      });
      stream.on('error', () => {
        stream.resume();
        fail(new BadRequest('Malformed multipart upload.'));
      });
    });
    parser.on('filesLimit', () => { invalid = true; });
    parser.on('fieldsLimit', () => { invalid = true; });
    parser.on('partsLimit', () => { invalid = true; });
    parser.on('error', () => fail(new BadRequest('Malformed multipart upload.')));
    request.on('error', error => fail(error));
    request.on('aborted', () => fail(new BadRequest('Upload was interrupted.')));
    parser.on('close', () => {
      if (settled) {
        return;
      }
      settled = true;
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
