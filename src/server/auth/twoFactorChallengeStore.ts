import crypto from 'crypto';
import { postgresClient } from '../db/postgresClient.js';

export interface PendingTwoFactorChallenge {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  phone: string;
  expiresAt: number;
}

// In-memory cache for fast local access
const localChallengeCache = new Map<string, PendingTwoFactorChallenge>();

function hashChallengeToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Save a 2FA challenge into PostgreSQL and local cache
 */
export async function saveTwoFactorChallenge(
  token: string,
  challenge: PendingTwoFactorChallenge
): Promise<void> {
  const tokenHash = hashChallengeToken(token);
  localChallengeCache.set(tokenHash, challenge);

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query(`
        INSERT INTO agentdesk_2fa_challenges (
          token_hash, user_id, email, role, tenant_id, phone, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (token_hash) DO UPDATE SET
          expires_at = EXCLUDED.expires_at,
          phone = EXCLUDED.phone
      `, [
        tokenHash,
        challenge.userId,
        challenge.email,
        challenge.role,
        challenge.tenantId || '',
        challenge.phone,
        challenge.expiresAt,
        Date.now()
      ]);
    }
  } catch (err: any) {
    console.warn('[TwoFactorChallengeStore] Warning: Failed to persist challenge to DB:', err.message);
  }
}

/**
 * Retrieve and consume (single-use) a 2FA challenge
 */
export async function consumeTwoFactorChallenge(
  token: string
): Promise<PendingTwoFactorChallenge | null> {
  const tokenHash = hashChallengeToken(token);
  const now = Date.now();

  // Check local cache first
  const cached = localChallengeCache.get(tokenHash);
  if (cached) {
    localChallengeCache.delete(tokenHash);
    // Delete from DB asynchronously
    deleteChallengeFromDb(tokenHash).catch(() => {});
    if (cached.expiresAt >= now) {
      return cached;
    }
    return null;
  }

  // Check PostgreSQL
  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      const res = await postgresClient.query(`
        SELECT token_hash, user_id, email, role, tenant_id, phone, expires_at
        FROM agentdesk_2fa_challenges
        WHERE token_hash = $1
      `, [tokenHash]);

      if (res && res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        // Delete challenge so it is strictly single-use
        await postgresClient.query(`
          DELETE FROM agentdesk_2fa_challenges WHERE token_hash = $1
        `, [tokenHash]);

        const expiresAt = Number(row.expires_at);
        if (expiresAt >= now) {
          return {
            userId: row.user_id,
            email: row.email,
            role: row.role,
            tenantId: row.tenant_id,
            phone: row.phone,
            expiresAt
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('[TwoFactorChallengeStore] Warning querying DB for challenge:', err.message);
  }

  return null;
}

async function deleteChallengeFromDb(tokenHash: string): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query(`
        DELETE FROM agentdesk_2fa_challenges WHERE token_hash = $1
      `, [tokenHash]);
    }
  } catch {
    // Ignore cleanup error
  }
}

/**
 * Periodically purge expired challenges from DB and memory
 */
export async function cleanupExpiredChallenges(): Promise<void> {
  const now = Date.now();
  for (const [key, val] of localChallengeCache.entries()) {
    if (val.expiresAt < now) {
      localChallengeCache.delete(key);
    }
  }

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query(`
        DELETE FROM agentdesk_2fa_challenges WHERE expires_at < $1
      `, [now]);
    }
  } catch {
    // Silent
  }
}

// Cleanup every 10 minutes
setInterval(() => {
  cleanupExpiredChallenges().catch(() => {});
}, 10 * 60 * 1000);
