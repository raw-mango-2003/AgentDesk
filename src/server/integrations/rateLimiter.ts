import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { postgresClient } from '../db/postgresClient.js';
import { getSession } from '../auth/sessionStore.js';
import { getUserById } from '../auth/userRegistry.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

export async function checkSharedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; currentCount: number; resetSeconds: number }> {
  try {
    if (await postgresClient.initialize()) {
      const now = Date.now();
      const resetAt = now + windowMs;
      const result = await postgresClient.query(
        `INSERT INTO agentdesk_rate_limits (key, count, reset_at)
         VALUES ($1, 1, $2)
         ON CONFLICT (key) DO UPDATE SET
           count = CASE
             WHEN agentdesk_rate_limits.reset_at <= $3 THEN 1
             ELSE agentdesk_rate_limits.count + 1
           END,
           reset_at = CASE
             WHEN agentdesk_rate_limits.reset_at <= $3 THEN $2
             ELSE agentdesk_rate_limits.reset_at
           END
         RETURNING count, reset_at`,
        [key, resetAt, now]
      );
      if (result.rows && result.rows.length > 0) {
        const count = Number(result.rows[0].count || 1);
        const rowReset = Number(result.rows[0].reset_at || resetAt);
        const resetSeconds = Math.max(1, Math.ceil((rowReset - now) / 1000));
        return { allowed: count <= limit, currentCount: count, resetSeconds };
      }
    }
  } catch {
    // Fall through to the local non-authoritative fallback.
  }

  const now = Date.now();
  let record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, record);
  } else {
    record.count += 1;
  }
  const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return { allowed: record.count <= limit, currentCount: record.count, resetSeconds };
}

export function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
  if (cfConnectingIp) return cfConnectingIp.trim();
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}

function extractSessionToken(req: Request): string | undefined {
  const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)agentdesk_session=([^;]+)/);
  if (cookieMatch?.[1]) return decodeURIComponent(cookieMatch[1]);
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  const match = authorization.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/i);
  return match?.[1];
}

async function enforcePlatformAdminIntegrationAccess(req: Request, res: Response): Promise<boolean> {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (!path.includes('/api/tenant/integrations/')) return true;

  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: Platform Administrator authentication required.' });
    return false;
  }

  const session = await getSession(token);
  const user = session ? getUserById(session.userId) : null;
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized: Valid authentication session required.' });
    return false;
  }

  if (user.role !== 'PLATFORM_ADMIN') {
    res.status(403).json({ success: false, error: 'Forbidden: Tenant integrations are managed by the Platform Administrator.' });
    return false;
  }

  return true;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    keyPrefix = 'global'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (keyPrefix === 'api' && !(await enforcePlatformAdminIntegrationAccess(req, res))) return;

      const ip = getClientIp(req);
      const isPublicLeadEndpoint = keyPrefix === 'api' && (
        req.path === '/widget/lead' ||
        req.originalUrl.split('?')[0].endsWith('/api/widget/lead')
      );
      const effectiveLimit = isPublicLeadEndpoint ? 10 : maxRequests;
      const effectiveKeyPrefix = isPublicLeadEndpoint ? 'lead_shared' : keyPrefix;

      // Authenticated API traffic should not share one rate-limit bucket with
      // every user behind the same NAT/proxy IP. Use a one-way hash of the
      // session token for authenticated sessions, while keeping IP limiting
      // for anonymous traffic.
      let identityKey = ip;
      if (keyPrefix === 'api' && !isPublicLeadEndpoint) {
        const sessionToken = extractSessionToken(req);
        if (sessionToken) {
          identityKey = `session:${crypto.createHash('sha256').update(sessionToken).digest('hex').slice(0, 24)}`;
        }
      }

      const key = `${effectiveKeyPrefix}:${identityKey}`;

      const { allowed, currentCount, resetSeconds } = await checkSharedRateLimit(key, effectiveLimit, windowMs);
      const remaining = Math.max(0, effectiveLimit - currentCount);
      res.setHeader('X-RateLimit-Limit', effectiveLimit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

      if (!allowed) {
        res.setHeader('Retry-After', resetSeconds.toString());
        return res.status(429).json({
          success: false,
          error: isPublicLeadEndpoint ? 'Lead submission rate limit exceeded. Please wait a moment.' : message,
          retryAfter: resetSeconds
        });
      }

      next();
    } catch (err: any) {
      console.warn('[RateLimiter] Error during rate check, failing open to proceed:', err?.message);
      next();
    }
  };
}

export const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 15, message: 'Too many authentication attempts. For security reasons, please try again in a few minutes.', keyPrefix: 'auth' });
export const passwordResetRateLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5, message: 'Too many password reset requests. Please check your inbox or try again in an hour.', keyPrefix: 'pw_reset' });
export const otpRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 5, message: 'Too many verification code requests. Please wait a few minutes before trying again.', keyPrefix: 'otp' });
export const paymentRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 20, message: 'Payment requests are currently rate-limited. Please retry shortly.', keyPrefix: 'pay' });
export const generalApiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 120, message: 'API rate limit exceeded.', keyPrefix: 'api' });
export const clientErrorRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10, message: 'Client error telemetry rate limit exceeded.', keyPrefix: 'client_error' });
export const embedApiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 60, message: 'Embed assistant query rate limit exceeded. Please wait a moment before sending another message.', keyPrefix: 'embed' });
export const aiGenerationRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 40, message: 'AI generation capacity reached. Please wait a moment.', keyPrefix: 'ai_gen' });
export const exportRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 10, message: 'Data export rate limit reached. Please wait before generating another export.', keyPrefix: 'export' });
