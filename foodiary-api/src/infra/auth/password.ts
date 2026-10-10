import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const parameters = { N: 16384, r: 8, p: 5, maxmem: 64 * 1024 * 1024 };
const keyLength = 64;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, parameters, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key);
      }
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);

  return `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, n, r, p, encodedSalt, encodedHash] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !n || !r || !p || !encodedSalt || !encodedHash) {
    return false;
  }

  const N = Number(n);
  const blockSize = Number(r);
  const parallelism = Number(p);

  if (N !== parameters.N || blockSize !== parameters.r || parallelism !== parameters.p) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, 'base64url');
  const expected = Buffer.from(encodedHash, 'base64url');

  if (salt.length !== 16 || expected.length !== keyLength) {
    return false;
  }

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
