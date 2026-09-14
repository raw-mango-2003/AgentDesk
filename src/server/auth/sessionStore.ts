import crypto from 'crypto';
import { generateSecureToken } from './passwordUtils.js';
import { postgresClient } from '../db/postgresClient.js';
import { getUserById } from './userRegistry.js';

export interface ServerSession {
  token: string;
  userId: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER';
  tenantId: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory session acceleration cache (PostgreSQL is the source of truth)
export const activeSessions = new Map<string, ServerSession>();

// Session TTL: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Synchronize active sessions from PostgreSQL database into memory cache
 */
export async function syncSessionsFromPostgres(): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return;

    const now = Date.now();
    const res = await postgresClient.query(`
      SELECT token, user_id, email, role, tenant_id, created_at, expires_at
      FROM agentdesk_sessions
      WHERE expires_at > $1
    `, [now]);

    if (res && res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        if (!activeSessions.has(row.token)) {
          activeSessions.set(row.token, {
            token: row.token,
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
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(token);
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
    throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
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

export async function createSession(
  userId: string,
  email: string,
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER',
  tenantId: string
): Promise<ServerSession> {
  const token = buildSignedToken();
  const now = Date.now();
  const session: ServerSession = {
    token,
    userId,
    email: email.toLowerCase().trim(),
    role,
    tenantId: (tenantId || '').toLowerCase().trim(),
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  };

  // Immediate in-memory cache update
  activeSessions.set(token, session);

  // PostgreSQL is source of truth - write immediately
  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query(`
        INSERT INTO agentdesk_sessions (token, user_id, email, role, tenant_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (token) DO UPDATE SET
          expires_at = EXCLUDED.expires_at,
          role = EXCLUDED.role,
          tenant_id = EXCLUDED.tenant_id
      `, [session.token, session.userId, session.email, session.role, session.tenantId, session.createdAt, session.expiresAt]);
    }
  } catch (err: any) {
    console.warn('[SessionStore:PostgresInsertWarning]', err.message);
  }

  return session;
}

/**
 * Validates and retrieves an authenticated session.
 * Workflow:
 * 1. Validate session token / HMAC signature
 * 2. Check in-memory acceleration cache
 * 3. If cache hit, validate expiration, user status, and tenant match
 * 4. If cache miss, query PostgreSQL (real source of truth)
 * 5. Validate database record (expiration, user ID, user status, tenant match)
 * 6. Restore valid session into in-memory cache
 * 7. Return session
 */
export async function getSession(token: string | undefined): Promise<ServerSession | null> {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!isValidSignedToken(cleanToken)) return null;

  const now = Date.now();

  // 1. Check in-memory cache
  const cached = activeSessions.get(cleanToken);
  if (cached) {
    if (now > cached.expiresAt) {
      await destroySession(cleanToken);
      return null;
    }
    const user = getUserById(cached.userId);
    if (!user || user.status === 'DISABLED' || user.status === 'SUSPENDED') {
      await destroySession(cleanToken);
      return null;
    }
    if ((cached.tenantId || '').toLowerCase().trim() !== (user.tenantId || '').toLowerCase().trim()) {
      await destroySession(cleanToken);
      return null;
    }
    return cached;
  }

  // 2. Query PostgreSQL if not in memory
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return null;

    const res = await postgresClient.query(`
      SELECT token, user_id, email, role, tenant_id, created_at, expires_at
      FROM agentdesk_sessions
      WHERE token = $1
    `, [cleanToken]);

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

    // Validate user existence and status
    const user = getUserById(row.user_id);
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
      token: row.token,
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: Number(row.created_at),
      expiresAt: expiresAt
    };

    // Restore to in-memory acceleration cache
    activeSessions.set(cleanToken, validSession);

    return validSession;
  } catch (err: any) {
    console.warn('[SessionStore:PostgresLookupError]', err.message);
    return null;
  }
}

export async function destroySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const removed = activeSessions.delete(cleanToken);

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query('DELETE FROM agentdesk_sessions WHERE token = $1', [cleanToken]);
    }
  } catch (err: any) {
    console.warn('[SessionStore:DestroyWarning]', err.message);
  }

  return removed;
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(token);
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
        SELECT token, user_id, email, role, tenant_id, created_at, expires_at
        FROM agentdesk_sessions
        WHERE user_id = $1 AND expires_at > $2
      `, [userId, now]);

      if (res && res.rows) {
        for (const row of res.rows) {
          sessions.push({
            token: row.token,
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
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      if (now > session.expiresAt) {
        activeSessions.delete(token);
      } else {
        sessions.push(session);
      }
    }
  }
  return sessions;
}

export async function destroyOtherUserSessions(userId: string, currentToken: string): Promise<number> {
  const cleanCurrent = currentToken.replace(/^Bearer\s+/i, '').trim();
  let destroyedCount = 0;
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId && token !== cleanCurrent) {
      activeSessions.delete(token);
      destroyedCount++;
    }
  }

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query('DELETE FROM agentdesk_sessions WHERE user_id = $1 AND token != $2', [userId, cleanCurrent]);
    }
  } catch (err: any) {
    console.warn('[SessionStore:DestroyOtherWarning]', err.message);
  }

  return destroyedCount;
}
