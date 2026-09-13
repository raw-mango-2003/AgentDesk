import crypto from 'crypto';

/**
 * Hash password using Node.js native crypto scrypt with random salt
 * Format: salt:derivedKeyHex
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Timing-safe password verification
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) return false;
    
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedBuffer = crypto.scryptSync(password, salt, 64);
    
    if (keyBuffer.length !== derivedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  } catch (err) {
    console.error('Error verifying password:', err);
    return false;
  }
}

/**
 * Generate cryptographically secure random token (e.g. for sessions or password resets)
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
