import { generateSecureToken } from './passwordUtils.js';

export interface ServerSession {
  token: string;
  userId: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER';
  tenantId: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory token store (Token -> Session)
export const activeSessions = new Map<string, ServerSession>();

// Session TTL: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createSession(
  userId: string,
  email: string,
  role: 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_USER' | 'BUSINESS_OWNER',
  tenantId: string
): ServerSession {
  const token = `agt_${generateSecureToken(32)}`;
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
  return session;
}

export function getSession(token: string | undefined): ServerSession | null {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const session = activeSessions.get(cleanToken);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(cleanToken);
    return null;
  }

  return session;
}

export function destroySession(token: string | undefined): boolean {
  if (!token) return false;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  return activeSessions.delete(cleanToken);
}

export function destroyAllUserSessions(userId: string): void {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(token);
    }
  }
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
  return destroyedCount;
}
