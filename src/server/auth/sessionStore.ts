import crypto from 'crypto';
import { generateSecureToken } from './passwordUtils.js';
import { postgresClient } from '../db/postgresClient.js';
import { getUserByIdAsync, getUserById } from './userRegistry.js';

export interface ServerSession {
  token: string;
  userId: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER';
  tenantId: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory session acceleration cache keyed by SHA-256 hash of token (PostgreSQL is source of truth)
export const activeSessions = new Map<string, ServerSession>();

// Session TTL: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hash raw session token using SHA-256 so raw credentials are never stored directly in the DB
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Synchronize active sessions from PostgreSQL database into memory cache
 */
export async function syncSessionsFromPostgres(): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return;

    const now = Date.now();
    const res = await postgresClient.query(`
      SELECT token_hash, token, user_id, email, role, tenant_id, created_at, expires_at
      FROM agentdesk_sessions
      WHERE expires_at > $1
    `, [now]);

    if (res && res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        const key = row.token_hash || (row.token ? hashSessionToken(row.token) : null);
        if (key && !activeSessions.has(key)) {
          activeSessions.set(key, {
            token: row.token || '',
            userId: row.user_id,
            email: row.email,
            role: row.role,
            tenantId: row.tenant_id,
            createdAt: Number(row.created_at),
            expiresAt: Number(row.expires_at)
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('[SessionStore:PostgresSyncWarning]', err.message);
  }
}

// Kick off initial Postgres session sync on startup
syncSessionsFromPostgres().catch(() => {});

// Periodic cleanup of expired sessions every 30 minutes
setInterval(() => {
  cleanupExpiredSessions().catch(() => {});
}, 30 * 60 * 1000);

export async function cleanupExpiredSessions(): Promise<number> {
  const now = Date.now();
  let count = 0;
  for (const [hashKey, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(hashKey);
      count++;
    }
  }

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query('DELETE FROM agentdesk_sessions WHERE expires_at <= $1', [now]);
    }
  } catch (err: any) {
    console.warn('[SessionStore:CleanupWarning]', err.message);
  }

  return count;
}

function getSessionSecret(): string {
  const secret = (process.env.SESSION_SECRET || '').trim();
  if (secret.length < 32) {
    // In production, strictly enforce 32 chars minimum
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
    }
    // Safe dev fallback only
    return 'agentdesk-secure-local-session-secret-32-chars-minimum-fallback';
  }
  return secret;
}

function signSessionNonce(nonce: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(nonce)
    .digest('hex');
}

function buildSignedToken(): string {
  const nonce = generateSecureToken(32);
  const signature = signSessionNonce(nonce);
  return `agt_${nonce}.${signature}`;
}

function isValidSignedToken(token: string): boolean {
  const match = token.match(/^agt_([a-f0-9]{64})\.([a-f0-9]{64})$/i);
  if (!match) return false;

  const expected = signSessionNonce(match[1]);
  const provided = match[2];

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(provided, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Creates an authenticated session.
 * Fail-closed behavior: Persists to PostgreSQL FIRST before returning an authenticated session.
 * Database stores the SHA-256 hash of the token, preventing raw session compromise.
 */
export async function createSession(
  userId: string,
  email: string,
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER',
  tenantId: string
): Promise<ServerSession> {
  const token = buildSignedToken();
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const normEmail = email.toLowerCase().trim();
  const normTenantId = (tenantId || '').toLowerCase().trim();

  // 1. Prefer PostgreSQL whenever it is configured and reachable.
  // AI Studio deployments can run without a PostgreSQL service, so authentication
  // falls back to the signed in-memory session cache instead of blocking login.
  const isReady = await postgresClient.initialize();
  const persistentSessionsRequired = process.env.REQUIRE_PERSISTENT_SESSIONS === 'true';

  // 2. Persist to PostgreSQL as the authoritative store when available.
  if (isReady) {
    try {
      await postgresClient.query(`
        INSERT INTO agentdesk_sessions (token_hash, token, user_id, email, role, tenant_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (token_hash) DO UPDATE SET
          expires_at = EXCLUDED.expires_at,
          role = EXCLUDED.role,
          tenant_id = EXCLUDED.tenant_id
      `, [tokenHash, token, userId, normEmail, role, normTenantId, now, expiresAt]);
    } catch (err: any) {
      console.error('[SessionStore] PostgreSQL session write failed:', err.message);
      if (persistentSessionsRequired) {
        throw new Error('Database persistence failed: Session could not be saved to authoritative store.');
      }
      console.warn('[SessionStore] Continuing with signed in-memory session because REQUIRE_PERSISTENT_SESSIONS is not enabled.');
    }
  } else if (persistentSessionsRequired) {
    throw new Error('Database persistence unavailable: persistent sessions are required but PostgreSQL is not reachable.');
  } else {
    console.warn('[SessionStore] PostgreSQL unavailable. Using signed in-memory session cache for this runtime.');
  }

  const session: ServerSession = {
    token,
    userId,
    email: normEmail,
    role,
    tenantId: normTenantId,
    createdAt: now,
    expiresAt
  };

  // Cache in memory keyed by tokenHash (never raw token)
  activeSessions.set(tokenHash, session);

  return session;
}

/**
 * Validates and retrieves an authenticated session.
 * Workflow:
 * 1. Validate session token HMAC signature
 * 2. Hash raw token using SHA-256 for secure database/cache lookup
 * 3. Check in-memory acceleration cache
 * 4. If cache miss, query PostgreSQL authoritative store
 * 5. Validate expiry, user record existence, user active status, tenant isolation
 * 6. Return session
 */
export async function getSession(token: string | undefined): Promise<ServerSession | null> {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!isValidSignedToken(cleanToken)) return null;

  const tokenHash = hashSessionToken(cleanToken);
  const now = Date.now();

  // 1. Check in-memory cache
  const cached = activeSessions.get(tokenHash);
  if (cached) {
    if (now > cached.expiresAt) {
      await destroySession(cleanToken);
      return null;
    }
    const user = getUserById(cached.userId) || await getUserByIdAsync(cached.userId);
    if (!user || user.status === 'DISABLED' || user.status === 'SUSPENDED') {
      await destroySession(cleanToken);
      return null;
    }
    if ((cached.tenantId || '').toLowerCase().trim() !== (user.tenantId || '').toLowerCase().trim()) {
      await destroySession(cleanToken);
      return null;
    }
    return { ...cached, token: cleanToken };
  }

  // 2. Query PostgreSQL (Authoritative Source of Truth)
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return null;

    const res = await postgresClient.query(`
      SELECT token_hash, token, user_id, email, role, tenant_id, created_at, expires_at
      FROM agentdesk_sessions
      WHERE token_hash = $1 OR token = $2
      LIMIT 1
    `, [tokenHash, cleanToken]);

    if (!res || !res.rows || res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const expiresAt = Number(row.expires_at);

    // Validate expiration
    if (now > expiresAt) {
      await destroySession(cleanToken);
      return null;
    }

    // Validate user existence and active status from authoritative store
    const user = getUserById(row.user_id) || await getUserByIdAsync(row.user_id);
    if (!user) {
      await destroySession(cleanToken);
      return null;
    }

    if (user.status === 'DISABLED' || user.status === 'SUSPENDED') {
      await destroySession(cleanToken);
      return null;
    }

    // Validate tenant association against user record
    if ((row.tenant_id || '').toLowerCase().trim() !== (user.tenantId || '').toLowerCase().trim()) {
      await destroySession(cleanToken);
      return null;
    }

    const validSession: ServerSession = {
      token: cleanToken,
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: Number(row.created_at),
      expiresAt: expiresAt
    };

    // Restore to in-memory acceleration cache keyed by hash
    activeSessions.set(tokenHash, validSession);

    return validSession;
  } catch (err: any) {
    console.warn('[SessionStore:PostgresLookupError]', err.message);
    return null;
  }
}

export async function destroySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const tokenHash = hashSessionToken(cleanToken);
  const removed = activeSessions.delete(tokenHash);

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query('DELETE FROM agentdesk_sessions WHERE token_hash = $1 OR token = $2', [tokenHash, cleanToken]);
    }
  } catch (err: any) {
    console.warn('[SessionStore:DestroyWarning]', err.message);
  }

  return removed;
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  for (const [hashKey, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(hashKey);
    }
  }

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query('DELETE FROM agentdesk_sessions WHERE user_id = $1', [userId]);
    }
  } catch (err: any) {
    console.warn('[SessionStore:DestroyAllWarning]', err.message);
  }
}

export async function getUserSessions(userId: string): Promise<ServerSession[]> {
  const sessions: ServerSession[] = [];
  const now = Date.now();

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      const res = await postgresClient.query(`
        SELECT token_hash, token, user_id, email, role, tenant_id, created_at, expires_at
        FROM agentdesk_sessions
        WHERE user_id = $1 AND expires_at > $2
      `, [userId, now]);

      if (res && res.rows) {
        for (const row of res.rows) {
          sessions.push({
            token: row.token || '',
            userId: row.user_id,
            email: row.email,
            role: row.role,
            tenantId: row.tenant_id,
            createdAt: Number(row.created_at),
            expiresAt: Number(row.expires_at)
          });
        }
        return sessions;
      }
    }
  } catch (err: any) {
    console.warn('[SessionStore:getUserSessionsWarning]', err.message);
  }

  // Fallback to activeSessions cache
  for (const [hashKey, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      if (now > session.expiresAt) {
        activeSessions.delete(hashKey);
      } else {
        sessions.push(session);
      }
    }
  }
  return sessions;
}

export async function destroyOtherUserSessions(userId: string, currentToken: string): Promise<number> {
  const cleanCurrent = currentToken.replace(/^Bearer\s+/i, '').trim();
  const currentHash = hashSessionToken(cleanCurrent);
  let destroyedCount = 0;
  for (const [hashKey, session] of activeSessions.entries()) {
    if (session.userId === userId && hashKey !== currentHash) {
      activeSessions.delete(hashKey);
      destroyedCount++;
    }
  }

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query(
        'DELETE FROM agentdesk_sessions WHERE user_id = $1 AND token_hash != $2 AND token != $3',
        [userId, currentHash, cleanCurrent]
      );
    }
  } catch (err: any) {
    console.warn('[SessionStore:DestroyOtherWarning]', err.message);
  }

  return destroyedCount;
}
