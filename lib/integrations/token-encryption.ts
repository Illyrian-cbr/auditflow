import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Retrieves and validates the 32-byte encryption key from environment variables.
 * The key must be a 64-character hex string (32 bytes).
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate a 32-byte hex key with: openssl rand -hex 32'
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        `Current length: ${keyHex.length}`
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Returns a string in the format: `iv:encrypted:tag` (all hex-encoded).
 * - iv: 16-byte random initialization vector
 * - encrypted: the ciphertext
 * - tag: 16-byte GCM authentication tag
 *
 * @param plaintext - The string to encrypt (e.g., an OAuth access token)
 * @returns The encrypted string in `iv:encrypted:tag` format
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Decrypts a ciphertext string that was encrypted with `encrypt()`.
 *
 * Expects input in the format: `iv:encrypted:tag` (all hex-encoded).
 *
 * @param ciphertext - The encrypted string in `iv:encrypted:tag` format
 * @returns The decrypted plaintext string
 * @throws Error if the format is invalid or decryption/authentication fails
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted token format. Expected iv:encrypted:tag'
    );
  }

  const [ivHex, encryptedHex, tagHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${TAG_LENGTH}, got ${tag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
