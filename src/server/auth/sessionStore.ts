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

// In-memory acceleration cache keyed by SHA-256 hash of token.
// PostgreSQL stores only the token hash; the raw token exists only in memory/browser cookie.
export const activeSessions = new Map<string, ServerSession>();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/** Remove any legacy plaintext session tokens left by older versions. */
async function purgeLegacyPlaintextTokens(): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      await postgresClient.query(
        'UPDATE agentdesk_sessions SET token = NULL WHERE token IS NOT NULL'
      );
    }
  } catch (err: any) {
    console.warn('[SessionStore:LegacyTokenCleanupWarning]', err.message);
  }
}

export async function syncSessionsFromPostgres(): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return;

    await purgeLegacyPlaintextTokens();
    const now = Date.now();
    const res = await postgresClient.query(`
      SELECT token_hash, user_id, email, role, tenant_id, created_at, expires_at
      FROM agentdesk_sessions
      WHERE expires_at > $1
    `, [now]);

    if (res?.rows) {
      for (const row of res.rows) {
        const key = row.token_hash;
        if (key && !activeSessions.has(key)) {
          activeSessions.set(key, {
            // Raw token cannot be reconstructed from a hash. It is intentionally blank
            // for sessions restored after a server restart.
            token: '',
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

syncSessionsFromPostgres().catch(() => {});

const cleanupTimer = setInterval(() => {
  cleanupExpiredSessions().catch(() => {});
}, 30 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

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
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
    }
    return 'agentdesk-secure-local-session-secret-32-chars-minimum-fallback';
  }
  return secret;
}

function signSessionNonce(nonce: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(nonce).digest('hex');
}

function buildSignedToken(): string {
  const nonce = generateSecureToken(32);
  return `agt_${nonce}.${signSessionNonce(nonce)}`;
}

function isValidSignedToken(token: string): boolean {
  const match = token.match(/^agt_([a-f0-9]{64})\.([a-f0-9]{64})$/i);
  if (!match) return false;

  const expected = signSessionNonce(match[1]);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(match[2], 'hex')
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
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const normEmail = email.toLowerCase().trim();
  const normTenantId = (tenantId || '').toLowerCase().trim();

  const isReady = await postgresClient.initialize();

  if (isReady) {
    try {
      // IMPORTANT: never persist the raw session token. token_hash is the only
      // credential representation stored in PostgreSQL.
      await postgresClient.query(`
        INSERT INTO agentdesk_sessions (token_hash, user_id, email, role, tenant_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (token_hash) DO UPDATE SET
          expires_at = EXCLUDED.expires_at,
          role = EXCLUDED.role,
          tenant_id = EXCLUDED.tenant_id
      `, [tokenHash, userId, normEmail, role, normTenantId, now, expiresAt]);
    } catch (err: any) {
      console.warn('[SessionStore] PostgreSQL session write failed, continuing with signed in-memory session:', err.message);
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Persistent PostgreSQL storage is required for production sessions. Configure DATABASE_URL and verify database connectivity.');
    }
    console.warn('[SessionStore] PostgreSQL unavailable. Using signed in-memory session cache for this development runtime.');
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

  activeSessions.set(tokenHash, session);
  return session;
}

export async function getSession(token: string | undefined): Promise<ServerSession | null> {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!isValidSignedToken(cleanToken)) return null;

  const tokenHash = hashSessionToken(cleanToken);
  const now = Date.now();
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

  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return null;

    const res = await postgresClient.query(`
      SELECT token_hash, user_id, email, role, tenant_id, created_at, expires_at
      FROM agentdesk_sessions
      WHERE token_hash = $1
      LIMIT 1
    `, [tokenHash]);

    if (!res?.rows?.length) return null;

    const row = res.rows[0];
    const expiresAt = Number(row.expires_at);
    if (now > expiresAt) {
      await destroySession(cleanToken);
      return null;
    }

    const user = getUserById(row.user_id) || await getUserByIdAsync(row.user_id);
    if (!user || user.status === 'DISABLED' || user.status === 'SUSPENDED') {
      await destroySession(cleanToken);
      return null;
    }

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
      expiresAt
    };

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
      await postgresClient.query('DELETE FROM agentdesk_sessions WHERE token_hash = $1', [tokenHash]);
    }
  } catch (err: any) {
    console.warn('[SessionStore:DestroyWarning]', err.message);
  }

  return removed;
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  for (const [hashKey, session] of activeSessions.entries()) {
    if (session.userId === userId) activeSessions.delete(hashKey);
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
        SELECT token_hash, user_id, email, role, tenant_id, created_at, expires_at
        FROM agentdesk_sessions
        WHERE user_id = $1 AND expires_at > $2
      `, [userId, now]);

      if (res?.rows) {
        for (const row of res.rows) {
          sessions.push({
            // Raw session tokens are never returned from PostgreSQL.
            token: '',
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

  for (const [hashKey, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      if (now > session.expiresAt) activeSessions.delete(hashKey);
      else sessions.push(session);
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
      const result = await postgresClient.query(
        'DELETE FROM agentdesk_sessions WHERE user_id = $1 AND token_hash != $2',
        [userId, currentHash]
      );
      if (typeof result?.rowCount === 'number') destroyedCount = Math.max(destroyedCount, result.rowCount);
    }
  } catch (err: any) {
    console.warn('[SessionStore:DestroyOtherWarning]', err.message);
  }

  return destroyedCount;
}
