import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateSecureToken } from './passwordUtils.js';
import { postgresClient } from '../db/postgresClient.js';

export interface ServerSession {
  token: string;
  userId: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER';
  tenantId: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory session index, backed by PostgreSQL and persistent disk cache
export const activeSessions = new Map<string, ServerSession>();

const sessionsFilePath = path.join(process.cwd(), 'data', 'sessions_store.json');

// Session TTL: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function loadSessionsFromDisk(): void {
  try {
    if (fs.existsSync(sessionsFilePath)) {
      const raw = fs.readFileSync(sessionsFilePath, 'utf-8');
      const list = JSON.parse(raw) as ServerSession[];
      const now = Date.now();
      for (const s of list) {
        if (s.expiresAt > now) {
          activeSessions.set(s.token, s);
        }
      }
    }
  } catch (err) {
    console.warn('[SessionStore:LoadWarning] Could not load sessions from disk:', err);
  }
}

function persistSessionsToDisk(): void {
  try {
    const dir = path.dirname(sessionsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const now = Date.now();
    const valid = Array.from(activeSessions.values()).filter(s => s.expiresAt > now);
    fs.writeFileSync(sessionsFilePath, JSON.stringify(valid, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SessionStore:PersistWarning] Could not save sessions to disk:', err);
  }
}

// Initial disk load
loadSessionsFromDisk();

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

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(provided, 'hex')
  );
}

export function createSession(
  userId: string,
  email: string,
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER',
  tenantId: string
): ServerSession {
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

  activeSessions.set(token, session);
  persistSessionsToDisk();

  // Asynchronously insert into PostgreSQL
  postgresClient.initialize().then(connected => {
    if (connected) {
      postgresClient.query(`
        INSERT INTO agentdesk_sessions (token, user_id, email, role, tenant_id, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (token) DO NOTHING
      `, [session.token, session.userId, session.email, session.role, session.tenantId, session.createdAt, session.expiresAt]).catch(() => {});
    }
  }).catch(() => {});

  return session;
}

export function getSession(token: string | undefined): ServerSession | null {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!isValidSignedToken(cleanToken)) return null;

  const session = activeSessions.get(cleanToken);
  if (session) {
    if (Date.now() > session.expiresAt) {
      destroySession(cleanToken);
      return null;
    }
    return session;
  }

  return null;
}

export function destroySession(token: string | undefined): boolean {
  if (!token) return false;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const removed = activeSessions.delete(cleanToken);
  persistSessionsToDisk();

  // Remove from PostgreSQL
  postgresClient.initialize().then(connected => {
    if (connected) {
      postgresClient.query('DELETE FROM agentdesk_sessions WHERE token = $1', [cleanToken]).catch(() => {});
    }
  }).catch(() => {});

  return removed;
}

export function destroyAllUserSessions(userId: string): void {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(token);
    }
  }
  persistSessionsToDisk();

  postgresClient.initialize().then(connected => {
    if (connected) {
      postgresClient.query('DELETE FROM agentdesk_sessions WHERE user_id = $1', [userId]).catch(() => {});
    }
  }).catch(() => {});
}

export function getUserSessions(userId: string): ServerSession[] {
  const sessions: ServerSession[] = [];
  const now = Date.now();
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

export function destroyOtherUserSessions(userId: string, currentToken: string): number {
  const cleanCurrent = currentToken.replace(/^Bearer\s+/i, '').trim();
  let destroyedCount = 0;
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId && token !== cleanCurrent) {
      activeSessions.delete(token);
      destroyedCount++;
    }
  }
  persistSessionsToDisk();

  postgresClient.initialize().then(connected => {
    if (connected) {
      postgresClient.query('DELETE FROM agentdesk_sessions WHERE user_id = $1 AND token != $2', [userId, cleanCurrent]).catch(() => {});
    }
  }).catch(() => {});

  return destroyedCount;
}
