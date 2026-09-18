import { Request, Response, NextFunction } from 'express';
import { postgresClient } from '../db/postgresClient.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic local memory cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
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
        return {
          allowed: count <= limit,
          currentCount: count,
          resetSeconds
        };
      }
    }
  } catch (err: any) {
    // Non-fatal warning; fall back to local in-memory store
  }

  // Local fallback (in-memory non-authoritative fallback for dev or transient PG disconnects)
  const now = Date.now();
  let record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, record);
  } else {
    record.count += 1;
  }
  const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return {
    allowed: record.count <= limit,
    currentCount: record.count,
    resetSeconds
  };
}

export function getClientIp(req: Request): string {
  // Cloudflare header takes highest priority
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Standard reverse proxy forwarded header
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    keyPrefix = 'global'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;

    try {
      const { allowed, currentCount, resetSeconds } = await checkSharedRateLimit(key, maxRequests, windowMs);
      const remaining = Math.max(0, maxRequests - currentCount);

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

      if (!allowed) {
        res.setHeader('Retry-After', resetSeconds.toString());
        return res.status(429).json({
          success: false,
          error: message,
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

// Preset rate limiters for production security
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 15, // 15 attempts per 15 min
  message: 'Too many authentication attempts. For security reasons, please try again in a few minutes.',
  keyPrefix: 'auth'
});

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 requests per hour
  message: 'Too many password reset requests. Please check your inbox or try again in an hour.',
  keyPrefix: 'pw_reset'
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
  message: 'Too many verification code requests. Please wait a few minutes before trying again.',
  keyPrefix: 'otp'
});

export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: 'Payment requests are currently rate-limited. Please retry shortly.',
  keyPrefix: 'pay'
});

export const generalApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120, // 120 requests per minute
  message: 'API rate limit exceeded.',
  keyPrefix: 'api'
});

export const clientErrorRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Client error telemetry rate limit exceeded.',
  keyPrefix: 'client_error'
});

export const embedApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 queries per minute per IP for public chat embed
  message: 'Embed assistant query rate limit exceeded. Please wait a moment before sending another message.',
  keyPrefix: 'embed'
});

export const aiGenerationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 40, // 40 AI responses per minute
  message: 'AI generation capacity reached. Please wait a moment.',
  keyPrefix: 'ai_gen'
});

export const exportRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10, // 10 exports per 10 minutes
  message: 'Data export rate limit reached. Please wait before generating another export.',
  keyPrefix: 'export'
});
