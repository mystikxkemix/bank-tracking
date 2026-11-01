import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH: number = 64;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error: Error | null, key: Buffer) => (error ? reject(error) : resolve(key)));
  });
}

/** Built-in scrypt: no native dependency to compile in the prod image. */
export async function hashPassword(password: string): Promise<string> {
  const salt: Buffer = randomBytes(16);
  const key: Buffer = await scryptAsync(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) {
    return false;
  }
  const expected: Buffer = Buffer.from(keyB64, 'base64');
  const actual: Buffer = await scryptAsync(password, Buffer.from(saltB64, 'base64'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
