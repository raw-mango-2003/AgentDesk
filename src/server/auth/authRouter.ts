import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { 
  getUserByEmail, 
  getUserByEmailAsync,
  getUserById, 
  getUserByIdAsync,
  createUser, 
  updateUser, 
  updateUserEmail,
  updateUserPassword,
  updateUserStatus,
  getAllUsers,
  getUsersByTenantId,
  findUserByResetToken,
  findUserByVerificationToken,
  validateVerificationToken,
  createPasswordResetToken,
  createEmailVerificationToken,
  createAccountSetupToken,
  findUserBySetupToken,
  UserRecord 
} from './userRegistry.js';
import { 
  verifyPassword, 
  generateSecureToken, 
  hashPassword 
} from './passwordUtils.js';
import { 
  createSession, 
  getSession, 
  destroySession,
  destroyAllUserSessions,
  getUserSessions,
  destroyOtherUserSessions
} from './sessionStore.js';
import { 
  logCredentialAction,
  getCredentialAuditLogs
} from './auditRegistry.js';
import { 
  serverBusinessesStore, 
  getTenant,
  getAllTenants,
  setTenant,
  PUBLIC_DEMO_TENANT_ID,
  serverAgentsStore,
  serverKnowledgeStore,
  serverTenantUsageStore
} from '../tenantRegistry.js';
import {
  saveTwoFactorChallenge,
  consumeTwoFactorChallenge
} from './twoFactorChallengeStore.js';
import {
  emailService,
  otpService,
  notificationService,
  analyticsService,
  auditLogService,
  automationEngine,
  authRateLimiter,
  passwordResetRateLimiter
} from '../integrations/index.js';

export const authRouter = Router();

// Re-export PendingTwoFactorChallenge for backward compatibility
export type { PendingTwoFactorChallenge } from './twoFactorChallengeStore.js';

export function isAccountLocked(user: UserRecord): boolean {
  if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
    return true;
  }
  return false;
}

export function recordFailedLogin(user: UserRecord): { locked: boolean; remainingAttempts: number } {
  const attempts = (user.failedLoginAttempts || 0) + 1;
  if (attempts >= 5) {
    const lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 minute lock
    updateUser(user.id, {
      failedLoginAttempts: attempts,
      lockoutUntil
    });
    notificationService.dispatchEvent('ACCOUNT_LOCKED', {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      category: 'security'
    });
    return { locked: true, remainingAttempts: 0 };
  }
  updateUser(user.id, { failedLoginAttempts: attempts });
  return { locked: false, remainingAttempts: 5 - attempts };
}

export function resetFailedLogins(user: UserRecord) {
  if (user.failedLoginAttempts || user.lockoutUntil) {
    updateUser(user.id, { failedLoginAttempts: 0, lockoutUntil: undefined });
  }
}


/**
 * Helper to generate high-entropy secure temporary passwords
 */
export function generateStrongPassword(length: number = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()-_=+';
  const all = upper + lower + digits + symbols;

  let pwd = '';
  // Ensure at least one of each class
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += digits[crypto.randomInt(0, digits.length)];
  pwd += symbols[crypto.randomInt(0, symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[crypto.randomInt(0, all.length)];
  }

  // Shuffle the password
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Extract named cookie from standard Cookie header
 */
export function extractCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Helper to determine if the connection or environment is HTTPS/Secure
 */
export function isRequestSecure(req?: Request): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (!req) {
    return (process.env.APP_URL || '').startsWith('https');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto) {
    return String(forwardedProto).includes('https');
  }
  if (req.secure) return true;
  const host = req.headers.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return false;
  }
  return (process.env.APP_URL || '').startsWith('https');
}

/**
 * Set session token as an HttpOnly, secure (production) cookie
 */
export function setSessionCookie(res: Response, token: string, req?: Request) {
  const isHttps = isRequestSecure(req);
  const maxAge = 7 * 24 * 60 * 60;
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();

  // AgentDesk's production UI and API are same-origin at agentdesk.ai.studio.
  // Keep the session host-only and SameSite=Lax. Do not infer cross-site state
  // from Referer/Host strings, which can incorrectly turn ordinary same-origin
  // requests into partitioned third-party cookies.
  const sessionFlags = [
    `agentdesk_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    ...(isHttps ? ['SameSite=Lax', 'Secure'] : ['SameSite=Lax']),
    `Max-Age=${maxAge}`,
    `Expires=${expires}`
  ].join('; ');

  const csrfToken = crypto.randomBytes(32).toString('hex');
  const csrfFlags = [
    `agentdesk_csrf=${csrfToken}`,
    'Path=/',
    ...(isHttps ? ['SameSite=Lax', 'Secure'] : ['SameSite=Lax']),
    `Max-Age=${maxAge}`,
    `Expires=${expires}`
  ].join('; ');

  res.setHeader('Set-Cookie', [sessionFlags, csrfFlags]);
  return csrfToken;
}

export function clearSessionCookies(res: Response, req?: Request) {
  const isHttps = isRequestSecure(req);
  const secure = isHttps ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `agentdesk_session=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `agentdesk_csrf=; Path=/; SameSite=Lax${secure}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ]);
}

/**
 * Extract auth token from HttpOnly cookie or Authorization header
 * Primary authoritative source: HttpOnly cookie 'agentdesk_session'
 * Secondary fallback: Authorization: Bearer <token>
 */
export function extractTokenFromRequest(req: Request): string | undefined {
  if (req.headers.cookie) {
    const cookieToken = extractCookie(req.headers.cookie, 'agentdesk_session');
    if (cookieToken && cookieToken !== 'null' && cookieToken !== 'undefined') {
      return cookieToken;
    }
  }

  const authorization = typeof req.headers.authorization === 'string'
    ? req.headers.authorization.trim()
    : '';

  const match = authorization.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/i);
  if (match && match[1] && match[1] !== 'null' && match[1] !== 'undefined') {
    return match[1];
  }

  return undefined;
}

/**
 * Middleware: Extract authenticated user from session token
 */
export async function requireAuth(req: Request, res: Response, next: Function) {
  let session = null;

  // 1. Primary: HttpOnly session cookie
  if (req.headers.cookie) {
    const cookieToken = extractCookie(req.headers.cookie, 'agentdesk_session');
    if (cookieToken && cookieToken !== 'null' && cookieToken !== 'undefined') {
      session = await getSession(cookieToken);
    }
  }

  // 2. Secondary fallback: Authorization header
  if (!session) {
    const authorization = typeof req.headers.authorization === 'string'
      ? req.headers.authorization.trim()
      : '';
    const match = authorization.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/i);
    if (match && match[1] && match[1] !== 'null' && match[1] !== 'undefined') {
      session = await getSession(match[1]);
    }
  }

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid authentication session required.'
    });
  }

  const user = getUserById(session.userId) || await getUserByIdAsync(session.userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: User account no longer exists.'
    });
  }

  if (user.status === 'DISABLED') {
    await destroyAllUserSessions(user.id);
    return res.status(403).json({
      success: false,
      error: 'Your account has been disabled. Please contact platform support.'
    });
  }

  if (user.status === 'SUSPENDED') {
    await destroyAllUserSessions(user.id);
    return res.status(403).json({
      success: false,
      error: 'Your account has been suspended. Please contact platform support.'
    });
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

/**
 * Middleware: Enforce PLATFORM_ADMIN role
 */
export async function requirePlatformAdmin(req: Request, res: Response, next: Function) {
  try {
    await requireAuth(req, res, () => {
      const user = (req as any).user as UserRecord;
      if (!user || user.role !== 'PLATFORM_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Platform Administrator privileges required.'
        });
      }
      next();
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Middleware: Enforce strict tenant isolation
 */
export async function requireTenantAccess(req: Request, res: Response, next: Function) {
  try {
    await requireAuth(req, res, () => {
      const user = (req as any).user as UserRecord;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Valid authentication session required.'
        });
      }
      
      // Platform Admins have overarching multi-tenant visibility
      if (user.role === 'PLATFORM_ADMIN') {
        const explicitTenant = (
          req.params.tenantId ||
          req.params.businessId ||
          req.query.tenantId ||
          req.query.businessId ||
          (req.headers['x-tenant-id'] as string) ||
          req.body?.tenantId ||
          req.body?.businessId
        )?.toString().toLowerCase().trim();
        (req as any).tenantId = explicitTenant || user.tenantId;
        return next();
      }

      // Business Admins and Users belong strictly to their own tenant
      const targetTenantId = (
        req.params.tenantId || 
        req.params.businessId ||
        req.query.tenantId || 
        req.query.businessId ||
        req.query.tenant_id ||
        req.query.business_id ||
        (req.headers['x-tenant-id'] as string) ||
        (req.headers['x-business-id'] as string) ||
        req.body?.tenantId ||
        req.body?.businessId ||
        req.body?.tenant_id ||
        req.body?.business_id
      )?.toString().toLowerCase().trim();

      if (targetTenantId && targetTenantId !== user.tenantId.toLowerCase().trim()) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cross-tenant access is strictly prohibited.'
        });
      }

      // Always enforce the authenticated user's verified tenantId on the request
      (req as any).tenantId = user.tenantId;
      next();
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    uid: user.id,
    name: user.name,
    displayName: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    businessId: user.tenantId,
    status: user.status,
    mustChangePassword: !!user.mustChangePassword,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

// ----------------------------------------------------
// 1. PUBLIC AUTHENTICATION: SIGN UP
// ----------------------------------------------------
authRouter.post('/signup', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: Full Name, Work Email, and Password.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid work email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    const existing = getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.'
      });
    }

    const newUser = createUser({
      name: name.trim(),
      email: cleanEmail,
      passwordPlain: password,
      role: 'BUSINESS_ADMIN',
      status: 'PENDING',
      mustChangePassword: false,
      emailVerified: false
    });

    // Generate cryptographically secure token & store SHA-256 hash in DB (24-hour expiration)
    const verifyToken = createEmailVerificationToken(newUser.id);
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const verifyUrl = `${protocol}://${host}/verify-email?token=${verifyToken}`;

    // Emit event through internal Automation Engine -> NotificationService -> EmailService -> GmailService
    automationEngine.emit('EMAIL_VERIFICATION_REQUESTED', {
      userId: newUser.id,
      email: cleanEmail,
      name: newUser.name,
      verificationToken: verifyToken,
      verifyUrl
    }).catch(e => console.error('[SignupEmailError]', e.message));

    // PostHog analytics tracking
    analyticsService.track('user_signed_up', {
      email: cleanEmail,
      role: 'BUSINESS_ADMIN'
    }, newUser.id);

    // Option B: User must verify email before session creation. Do NOT issue token or create session.
    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      email: cleanEmail,
      verificationToken: process.env.NODE_ENV !== 'production' ? verifyToken : undefined,
      verificationUrl: process.env.NODE_ENV !== 'production' ? verifyUrl : undefined,
      message: 'Please check your email to verify your account.'
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during account creation.'
    });
  }
});

// ----------------------------------------------------
// 1B. CSRF TOKEN ENDPOINT (/csrf)
// ----------------------------------------------------
authRouter.get('/csrf', (req: Request, res: Response) => {
  let csrfToken = extractCookie(req.headers.cookie || '', 'agentdesk_csrf');
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    const isHttps = isRequestSecure(req);
    const csrfFlags = [
      `agentdesk_csrf=${csrfToken}`,
      'Path=/',
      ...(isHttps ? ['SameSite=None', 'Secure', 'Partitioned'] : ['SameSite=Lax']),
      `Max-Age=${7 * 24 * 60 * 60}`
    ].join('; ');
    res.setHeader('Set-Cookie', csrfFlags);
  }
  return res.json({ success: true, csrfToken });
});

// ----------------------------------------------------
// 2. PUBLIC AUTHENTICATION: BUSINESS LOGIN (/login)
// ----------------------------------------------------
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required.'
        }
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    // Check Account Lockout
    if (isAccountLocked(user)) {
      const minutesRemaining = Math.ceil(((user.lockoutUntil || 0) - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to consecutive failed attempts. Please try again in ${minutesRemaining} minute(s) or reset your password.`
        }
      });
    }

    // Verify Password Hash using timing-safe scrypt verification
    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const lockInfo = recordFailedLogin(user);
      if (lockInfo.locked) {
        return res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account locked for 15 minutes due to 5 consecutive failed sign-in attempts.'
          }
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: `Invalid email or password. ${lockInfo.remainingAttempts} attempts remaining before temporary lockout.`
        }
      });
    }

    // Successful password: reset failed login counters
    resetFailedLogins(user);

    // Platform Administrator credentials MUST NOT be valid for business logins (portal isolation)
    if (user.role === 'PLATFORM_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PORTAL',
          message: 'Platform Administrator accounts must sign in via the dedicated Platform Admin portal (/platform/login).'
        }
      });
    }

    // Account state checks
    if (user.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Please contact platform support.'
        }
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact platform support.'
        }
      });
    }

    // Mandatory Email Verification Check (Option B)
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
        message: 'Please verify your email before logging in.',
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in.'
        }
      });
    }

    // Two-Factor Authentication Challenge
    if (user.twoFactorEnabled && user.twoFactorPhone) {
      if (!otpService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SMS_SERVICE_UNAVAILABLE',
            message: 'SMS verification is not configured on the platform. Please contact platform support.'
          }
        });
      }

      const twoFactorToken = `2fa_${generateSecureToken(32)}`;
      await saveTwoFactorChallenge(twoFactorToken, {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        phone: user.twoFactorPhone,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      await otpService.sendOTP(user.twoFactorPhone, 'sms');
      const maskedPhone = `${user.twoFactorPhone.slice(0, 3)}***${user.twoFactorPhone.slice(-4)}`;

      return res.json({
        success: true,
        requiresTwoFactor: true,
        twoFactorToken,
        phoneMasked: maskedPhone,
        message: `A 6-digit verification code has been dispatched to ${maskedPhone}.`
      });
    }

    // Check Tenant Status if user is bound to a tenant
    let tenant = null;
    if (user.tenantId) {
      tenant = getTenant(user.tenantId);
    }

    const session = await createSession(user.id, user.email, user.role, user.tenantId);
    const csrfToken = setSessionCookie(res, session.token, req);

    analyticsService.track('login_success', { email: user.email, role: user.role }, user.id);

    // Requirement 4 & 15: If mustChangePassword, return mustChangePassword flag
    return res.json({
      success: true,
      csrfToken,
      user: sanitizeUser(user),
      mustChangePassword: !!user.mustChangePassword,
      redirectUrl: user.mustChangePassword ? '/change-password' : '/business/dashboard',
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status || tenant.planStatus,
        plan: tenant.plan,
        subscriptionState: tenant.subscriptionState
      } : null,
      onboardingPending: user.status === 'PENDING' || !user.tenantId || (tenant && tenant.status === 'ONBOARDING')
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during authentication.'
      }
    });
  }
});

// ----------------------------------------------------
// 2B. VERIFY TWO-FACTOR LOGIN CHALLENGE
// ----------------------------------------------------
authRouter.post('/verify-2fa-login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { twoFactorToken, code } = req.body;

    if (!twoFactorToken || !code) {
      return res.status(400).json({
        success: false,
        error: 'Challenge token and 6-digit verification code are required.'
      });
    }

    const pending = await consumeTwoFactorChallenge(twoFactorToken);
    if (!pending || pending.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Two-factor session has expired. Please sign in again.'
      });
    }

    const verifyResult = await otpService.verifyOTP(pending.phone, code.trim());
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        error: verifyResult.error || 'Invalid verification code.'
      });
    }

    const user = getUserById(pending.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found.' });
    }

    const session = await createSession(user.id, user.email, user.role, user.tenantId);
    setSessionCookie(res, session.token);
    let tenant = user.tenantId ? getTenant(user.tenantId) : null;

    analyticsService.track('login_success_2fa', { email: user.email }, user.id);

    return res.json({
      success: true,
      user: sanitizeUser(user),
      mustChangePassword: !!user.mustChangePassword,
      redirectUrl: user.role === 'PLATFORM_ADMIN' ? '/platform/dashboard' : (user.mustChangePassword ? '/change-password' : '/business/dashboard'),
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status || tenant.planStatus,
        plan: tenant.plan,
        subscriptionState: tenant.subscriptionState
      } : null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 3. PLATFORM ADMIN LOGIN (/platform/login)
// ----------------------------------------------------
authRouter.post(['/platform-login', '/platform/login'], authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Administrator email and password are required.'
        }
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getUserByEmailAsync(cleanEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid administrator credentials.'
        }
      });
    }

    // Check Lockout
    if (isAccountLocked(user)) {
      const minutesRemaining = Math.ceil(((user.lockoutUntil || 0) - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked. Please try again in ${minutesRemaining} minute(s).`
        }
      });
    }

    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const lockInfo = recordFailedLogin(user);
      if (lockInfo.locked) {
        return res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Administrator account locked for 15 minutes due to consecutive failed attempts.'
          }
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: `Invalid administrator credentials. ${lockInfo.remainingAttempts} attempts remaining.`
        }
      });
    }

    resetFailedLogins(user);

    // Strictly enforce PLATFORM_ADMIN role
    if (user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PORTAL',
          message: 'Access denied: You do not possess Platform Administrator permissions.'
        }
      });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Platform administrator account has been disabled.'
        }
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Platform administrator account has been suspended.'
        }
      });
    }

    // Two-Factor Challenge for Platform Admin
    if (user.twoFactorEnabled && user.twoFactorPhone) {
      if (!otpService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SMS_SERVICE_UNAVAILABLE',
            message: 'SMS verification is not configured on the platform. Please contact platform support.'
          }
        });
      }

      const twoFactorToken = `2fa_${generateSecureToken(32)}`;
      await saveTwoFactorChallenge(twoFactorToken, {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        phone: user.twoFactorPhone,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      await otpService.sendOTP(user.twoFactorPhone, 'sms');
      const maskedPhone = `${user.twoFactorPhone.slice(0, 3)}***${user.twoFactorPhone.slice(-4)}`;

      return res.json({
        success: true,
        requiresTwoFactor: true,
        twoFactorToken,
        phoneMasked: maskedPhone,
        message: `Admin security code sent to ${maskedPhone}.`
      });
    }

    const session = await createSession(user.id, user.email, 'PLATFORM_ADMIN', 'platform');
    const csrfToken = setSessionCookie(res, session.token, req);

    logCredentialAction({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PLATFORM_ADMIN_LOGIN',
      targetUserId: user.id,
      targetUserEmail: user.email,
      targetTenantId: 'platform',
      metadata: {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.socket.remoteAddress
      }
    });

    analyticsService.track('platform_admin_login', { email: user.email }, user.id);

    const redirectTarget = user.mustChangePassword ? '/change-password' : '/platform/dashboard';

    return res.json({
      success: true,
      csrfToken,
      user: sanitizeUser(user),
      mustChangePassword: !!user.mustChangePassword,
      redirect: redirectTarget,
      redirectUrl: redirectTarget
    });
  } catch (err: any) {
    console.error('Platform login error:', err);
    if (err?.message?.includes('Database') || err?.message?.includes('PostgreSQL') || err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_UNAVAILABLE',
          message: 'Authentication service is temporarily unavailable.'
        }
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err?.message || 'Server error during platform administrator authentication.'
      }
    });
  }
});

// ----------------------------------------------------
// 3B. EMAIL VERIFICATION ENDPOINTS (GET & POST)
// ----------------------------------------------------
// GET: Browser link directly clicked from email
authRouter.get(['/verify-email', '/api/auth/verify-email', '/api/verify-email'], async (req: Request, res: Response) => {
  try {
    const token = (req.query.token as string || '').trim();
    if (!token) {
      return res.redirect('/verify-email?status=error&message=' + encodeURIComponent('Missing verification token.'));
    }

    const check = validateVerificationToken(token);
    if (!check.valid) {
      if (check.reason === 'expired') {
        return res.redirect('/verify-email?status=error&message=' + encodeURIComponent('Verification link has expired. Please request a new verification email.'));
      }
      return res.redirect('/verify-email?status=error&message=' + encodeURIComponent('Verification link is invalid or has already been used.'));
    }

    const user = check.user!;
    updateUser(user.id, {
      emailVerified: true,
      verificationToken: undefined,
      verificationTokenHash: undefined,
      verificationTokenExpires: undefined
    });

    // Emit EMAIL_VERIFIED event through automation engine
    automationEngine.emit('EMAIL_VERIFIED', {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name
    }).catch(e => console.error('[EmailVerifiedAutomationError]', e.message));

    // Redirect to frontend verification-success page (no session created automatically)
    return res.redirect('/verify-email?status=success');
  } catch (err: any) {
    return res.redirect('/verify-email?status=error&message=' + encodeURIComponent('An error occurred while verifying your email.'));
  }
});

// POST: API call from SPA frontend
authRouter.post(['/verify-email', '/api/auth/verify-email', '/api/verify-email'], async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Verification token is required.' });
    }

    const check = validateVerificationToken(token.trim());
    if (!check.valid) {
      if (check.reason === 'expired') {
        return res.status(400).json({
          success: false,
          error: 'Verification link has expired. Please request a new verification email.'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Verification link is invalid or has already been used.'
      });
    }

    const user = check.user!;
    updateUser(user.id, {
      emailVerified: true,
      verificationToken: undefined,
      verificationTokenHash: undefined,
      verificationTokenExpires: undefined
    });

    // Emit EMAIL_VERIFIED event through automation engine
    automationEngine.emit('EMAIL_VERIFIED', {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name
    }).catch(e => console.error('[EmailVerifiedAutomationError]', e.message));

    return res.json({
      success: true,
      message: 'Your email address has been verified successfully. You can now log in.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'An error occurred during verification.' });
  }
});

authRouter.post('/resend-verification', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const user = getUserByEmail(email.toLowerCase().trim());
    if (user && !user.emailVerified) {
      const newToken = createEmailVerificationToken(user.id);
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const verifyUrl = `${protocol}://${host}/verify-email?token=${newToken}`;

      automationEngine.emit('EMAIL_VERIFICATION_REQUESTED', {
        userId: user.id,
        email: user.email,
        name: user.name,
        verificationToken: newToken,
        verifyUrl
      }).catch(e => console.error('[ResendVerifyEmailError]', e.message));
    }

    return res.json({
      success: true,
      message: 'If an unverified account exists, a new verification link has been sent.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 4. GET CURRENT SESSION (/me)
// ----------------------------------------------------
authRouter.get('/me', async (req: Request, res: Response) => {
  const token = extractTokenFromRequest(req);
  const session = await getSession(token);

  if (!session) {
    return res.status(401).json({
      authenticated: false,
      user: null
    });
  }

  const user = getUserById(session.userId) || await getUserByIdAsync(session.userId);
  if (!user || user.status === 'DISABLED' || user.status === 'SUSPENDED') {
    await destroySession(session.token);
    return res.status(401).json({
      success: false,
      authenticated: false,
      user: null,
      error: 'Session invalid or account inactive.'
    });
  }

  let tenant = null;
  if (user.tenantId && user.tenantId !== 'platform') {
    tenant = getTenant(user.tenantId);
  }

  return res.json({
    success: true,
    authenticated: true,
    user: sanitizeUser(user),
    mustChangePassword: !!user.mustChangePassword,
    tenant: tenant ? {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status || tenant.planStatus,
      plan: tenant.plan,
      currency: tenant.currency,
      subscriptionState: tenant.subscriptionState
    } : null
  });
});

// ----------------------------------------------------
// 5. LOGOUT (/logout)
// ----------------------------------------------------
authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = extractTokenFromRequest(req);
  if (token) {
    await destroySession(token);
  }
  clearSessionCookies(res, req);
  return res.json({
    success: true,
    message: 'Successfully logged out and session invalidated.'
  });
});

// ----------------------------------------------------
// 6. FORCED PASSWORD CHANGE & USER PASSWORD UPDATE
// ----------------------------------------------------
authRouter.post('/change-password', requireAuth, authRateLimiter, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password and confirmation do not match.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long.'
      });
    }

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect.'
      });
    }

    const wasTemporary = !!user.mustChangePassword;

    // Update password and clear mustChangePassword
    const updated = updateUserPassword(user.id, newPassword, false);

    // If account was in PENDING or MUST_CHANGE_PASSWORD, activate it
    if (user.status === 'PENDING') {
      updateUserStatus(user.id, 'ACTIVE');
    }

    // Send transactional security notification
    emailService.sendTemplate('password_changed', user.email, {
      name: user.name,
      email: user.email,
      timestamp: new Date().toISOString()
    }, { userId: user.id, tenantId: user.tenantId }).catch(e => console.error('[PasswordChangeEmailError]', e.message));

    const auditAction = user.role === 'PLATFORM_ADMIN'
      ? (wasTemporary ? 'PLATFORM_ADMIN_FIRST_LOGIN_PASSWORD_CHANGED' : 'PLATFORM_ADMIN_PASSWORD_CHANGED')
      : (wasTemporary ? 'FIRST_LOGIN_PASSWORD_CHANGED' : 'PASSWORD_CHANGED');

    logCredentialAction({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: auditAction,
      targetUserId: user.id,
      targetUserEmail: user.email,
      targetTenantId: user.tenantId,
      metadata: { wasTemporary }
    });

    return res.json({
      success: true,
      message: 'Password successfully updated. Your account is secured.',
      user: sanitizeUser(updated)
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to update password.'
    });
  }
});

// ----------------------------------------------------
// 7. USER PROFILE & EMAIL UPDATE (Business Admin Settings)
// ----------------------------------------------------
authRouter.post('/update-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { name, email } = req.body;

    let updatedUser = user;

    if (email && email.toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address.'
        });
      }

      const oldEmail = user.email;
      updatedUser = updateUserEmail(user.id, cleanEmail);

      emailService.sendTemplate('email_changed', oldEmail, {
        name: user.name,
        oldEmail,
        newEmail: cleanEmail
      }, { userId: user.id, tenantId: user.tenantId }).catch(e => console.error('[EmailChangedAlertError]', e.message));

      logCredentialAction({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'EMAIL_CHANGED',
        targetUserId: user.id,
        targetUserEmail: cleanEmail,
        targetTenantId: user.tenantId,
        metadata: { oldEmail: user.email, newEmail: cleanEmail }
      });
    }

    if (name && name.trim()) {
      const u = updateUser(user.id, { name: name.trim() });
      if (u) updatedUser = u;
    }

    return res.json({
      success: true,
      message: 'Account profile updated successfully.',
      user: sanitizeUser(updatedUser)
    });
  } catch (err: any) {
    console.error('Profile update error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to update profile.'
    });
  }
});

// ----------------------------------------------------
// 8. FORGOT PASSWORD (PUBLIC)
// ----------------------------------------------------
authRouter.post('/forgot-password', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = getUserByEmail(cleanEmail);

    let generatedResetToken: string | undefined;

    if (user) {
      // Store SHA-256 hash in database, expiration: 1 hour, single use only
      generatedResetToken = createPasswordResetToken(user.id);

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const resetUrl = `${protocol}://${host}/reset-password?token=${generatedResetToken}`;

      // Dispatch reset email using Gmail API via Automation Engine
      // Never store raw token in DB. Never email user passwords.
      automationEngine.emit('PASSWORD_RESET_REQUESTED', {
        userId: user.id,
        tenantId: user.tenantId,
        email: cleanEmail,
        name: user.name,
        token: generatedResetToken,
        resetToken: generatedResetToken,
        resetUrl,
        expiryTime: '1 hour'
      }).catch(e => console.error('[PasswordResetEmailError]', e.message));

      logCredentialAction({
        actorId: 'anonymous',
        actorEmail: cleanEmail,
        actorRole: 'ANONYMOUS',
        action: 'PASSWORD_RESET_REQUESTED',
        targetUserId: user.id,
        targetUserEmail: user.email,
        targetTenantId: user.tenantId
      });
    }

    return res.json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been dispatched.'
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.'
    });
  }
});

// ----------------------------------------------------
// 9. RESET PASSWORD (PUBLIC TOKEN VERIFICATION)
// ----------------------------------------------------
authRouter.post('/reset-password', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Reset token and new password are required.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    // Lookup user by hashing provided raw token and comparing to SHA-256 hash in DB
    const matchingUser = findUserByResetToken(token.trim());
    if (!matchingUser) {
      return res.status(400).json({
        success: false,
        error: 'Password reset token is invalid, already used, or has expired.'
      });
    }

    // Invalidate token upon use (single use only)
    updateUser(matchingUser.id, {
      resetToken: undefined,
      resetTokenHash: undefined,
      resetTokenExpires: undefined
    });

    // Update password
    updateUserPassword(matchingUser.id, newPassword, false);

    // Invalidate existing user sessions
    destroyAllUserSessions(matchingUser.id);

    // Send confirmation email via Automation Engine
    automationEngine.emit('PASSWORD_RESET_COMPLETED', {
      userId: matchingUser.id,
      tenantId: matchingUser.tenantId,
      email: matchingUser.email,
      name: matchingUser.name
    }).catch(e => console.error('[ResetCompletedEmailError]', e.message));

    logCredentialAction({
      actorId: matchingUser.id,
      actorEmail: matchingUser.email,
      actorRole: matchingUser.role,
      action: 'PASSWORD_RESET_COMPLETED',
      targetUserId: matchingUser.id,
      targetUserEmail: matchingUser.email,
      targetTenantId: matchingUser.tenantId
    });

    return res.json({
      success: true,
      message: 'Password successfully updated. You may now sign in with your new credentials.'
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password.'
    });
  }
});

// ----------------------------------------------------
// 10. PLATFORM ADMIN: CREDENTIAL MANAGEMENT API
// ----------------------------------------------------

/**
 * List all businesses and their owner credentials
 */
authRouter.get('/platform/credentials', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const allTenants = Array.from(serverBusinessesStore.values());
    const allUsers = getAllUsers();

    const results = allTenants.map((biz) => {
      const bizUsers = allUsers.filter(u => u.tenantId === biz.id);
      const ownerUser = bizUsers.find(u => u.role === 'BUSINESS_ADMIN') || bizUsers[0] || null;

      return {
        tenantId: biz.id,
        businessName: biz.name,
        industry: biz.industry || 'Professional Services',
        plan: biz.plan || 'growth',
        planStatus: biz.planStatus || 'ACTIVE',
        subscriptionState: biz.subscriptionState || 'ACTIVE',
        hasLoginCredentials: !!ownerUser,
        owner: ownerUser ? sanitizeUser(ownerUser) : null,
        usersCount: bizUsers.length
      };
    });

    return res.json({
      success: true,
      tenants: results
    });
  } catch (err: any) {
    console.error('Platform credentials fetch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve credentials list.'
    });
  }
});

/**
 * Create or provision Business Owner login credentials
 */
authRouter.post('/platform/credentials/create', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user as UserRecord;
    const { tenantId, ownerName, ownerEmail, temporaryPassword: customTempPassword } = req.body;

    if (!tenantId || !ownerName || !ownerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID, Owner Name, and Login Email are required.'
      });
    }

    const cleanEmail = ownerEmail.toLowerCase().trim();
    const cleanTenantId = tenantId.toLowerCase().trim();

    // Verify tenant exists
    const tenant = getTenant(cleanTenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: `Tenant "${cleanTenantId}" was not found.`
      });
    }

    // Generate strong password if not supplied
    const plainTempPassword = customTempPassword && customTempPassword.trim().length >= 8
      ? customTempPassword.trim()
      : generateStrongPassword(14);

    const existingUser = getUserByEmail(cleanEmail);

    let user: UserRecord;
    if (existingUser) {
      // If user exists and belongs to this tenant, update credentials
      if (existingUser.tenantId === cleanTenantId) {
        user = updateUserPassword(existingUser.id, plainTempPassword, true);
        updateUser(user.id, {
          name: ownerName.trim(),
          role: 'BUSINESS_ADMIN',
          status: 'ACTIVE'
        });
      } else {
        return res.status(409).json({
          success: false,
          error: `An account with email "${cleanEmail}" already exists under tenant "${existingUser.tenantId}".`
        });
      }
    } else {
      user = createUser({
        name: ownerName.trim(),
        email: cleanEmail,
        passwordPlain: plainTempPassword,
        role: 'BUSINESS_ADMIN',
        tenantId: cleanTenantId,
        status: 'ACTIVE',
        mustChangePassword: true,
        emailVerified: true
      });
    }

    // Invalidate prior sessions
    destroyAllUserSessions(user.id);

    logCredentialAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'BUSINESS_LOGIN_CREATED',
      targetUserId: user.id,
      targetUserEmail: user.email,
      targetTenantId: cleanTenantId,
      metadata: {
        businessName: tenant.name,
        mustChangePassword: true
      }
    });

    // Return plainTempPassword ONCE for the admin to copy and securely provide
    return res.status(201).json({
      success: true,
      message: 'Business Owner login credentials generated successfully.',
      temporaryPassword: plainTempPassword,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    console.error('Create credentials error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to create business credentials.'
    });
  }
});

/**
 * GET /api/tenants - Returns list of accessible tenants
 */
authRouter.get(['/api/tenants', '/tenants'], async (req: Request, res: Response) => {
  try {
    const token = extractTokenFromRequest(req);
    const session = await getSession(token);
    const user = session ? getUserById(session.userId) : null;

    if (!user || user.status === 'DISABLED') {
      const demoTenant = getTenant(PUBLIC_DEMO_TENANT_ID);
      return res.json({
        success: true,
        tenants: demoTenant ? [demoTenant] : []
      });
    }

    if (user.role === 'PLATFORM_ADMIN') {
      const all = getAllTenants();
      return res.json({
        success: true,
        tenants: all
      });
    }

    const userTenant = getTenant(user.tenantId);
    return res.json({
      success: true,
      tenants: userTenant ? [userTenant] : []
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tenants/:tenantId - Returns individual business record
 */
authRouter.get(['/api/tenants/:tenantId', '/tenants/:tenantId'], async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }
    const norm = tenantId.trim().toLowerCase();

    if (norm === PUBLIC_DEMO_TENANT_ID.toLowerCase()) {
      const demo = getTenant(PUBLIC_DEMO_TENANT_ID);
      return res.json({ success: true, tenant: demo });
    }

    const token = extractTokenFromRequest(req);
    const session = await getSession(token);
    const user = session ? getUserById(session.userId) : null;

    if (!user || user.status === 'DISABLED') {
      // If unauthenticated, allow public check for demo or return 401
      return res.status(401).json({ success: false, error: 'Authentication required to access tenant details' });
    }

    if (user.role !== 'PLATFORM_ADMIN' && (user.tenantId || '').toLowerCase() !== norm) {
      return res.status(403).json({ success: false, error: 'Access denied to this tenant' });
    }

    const biz = getTenant(norm);
    if (!biz) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    return res.json({ success: true, tenant: biz });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/tenants/:tenantId - Update business settings
 */
authRouter.put(['/api/tenants/:tenantId', '/tenants/:tenantId'], requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { tenantId } = req.params;
    const norm = tenantId.trim().toLowerCase();

    if (user.role !== 'PLATFORM_ADMIN' && (user.tenantId || '').toLowerCase() !== norm) {
      return res.status(403).json({ success: false, error: 'Access denied: cannot modify other tenants' });
    }

    const updated = setTenant(norm, req.body);
    return res.json({ success: true, tenant: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Platform Admin Creates Business with Owner Invitation
 * Inputs: Business Name, Business Type, Owner Email, Owner Name
 * Action:
 * 1. Create business record
 * 2. Create user record with role: BUSINESS_OWNER, status: INVITED
 * 3. Generate secure setup token (stored as SHA-256 hash)
 * 4. Send setup email using Gmail API:
 *    To: owner email
 *    From: hello.agentdesktech@gmail.com
 *    Subject: Set up your AgentDesk business account
 *    Link: https://[domain]/setup-account?token=[TOKEN]
 * Do NOT email user password.
 */
authRouter.post(['/platform/businesses', '/platform/businesses/create'], requirePlatformAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user as UserRecord;
    const { businessName, businessType, ownerEmail, ownerName } = req.body;

    if (!businessName || !ownerEmail || !ownerName) {
      return res.status(400).json({
        success: false,
        error: 'Business Name, Owner Email, and Owner Name are required.'
      });
    }

    const cleanEmail = ownerEmail.toLowerCase().trim();
    const cleanName = ownerName.trim();
    const cleanBizName = businessName.trim();
    const cleanType = (businessType || 'Professional Services').trim();

    // Check if email already registered
    const existingUser = getUserByEmail(cleanEmail);
    if (existingUser && existingUser.status === 'ACTIVE') {
      return res.status(409).json({
        success: false,
        error: `An active account with email "${cleanEmail}" already exists.`
      });
    }

    // 1. Generate unique Tenant ID and create business record
    const baseSlug = cleanBizName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `biz-${Date.now()}`;
    let tenantId = baseSlug;
    let counter = 1;
    while (serverBusinessesStore.has(tenantId)) {
      tenantId = `${baseSlug}-${counter++}`;
    }

    const newBusiness = {
      id: tenantId,
      name: cleanBizName,
      type: cleanType,
      industry: cleanType,
      status: 'active',
      plan: 'growth',
      planStatus: 'ACTIVE',
      subscriptionState: 'ACTIVE',
      ownerEmail: cleanEmail,
      ownerName: cleanName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    serverBusinessesStore.set(tenantId, newBusiness);

    // 2. Create user record with role: BUSINESS_OWNER, status: INVITED
    let user: UserRecord;
    if (existingUser) {
      updateUser(existingUser.id, {
        name: cleanName,
        tenantId,
        role: 'BUSINESS_OWNER',
        status: 'INVITED',
        emailVerified: false
      });
      user = existingUser;
    } else {
      user = createUser({
        name: cleanName,
        email: cleanEmail,
        passwordPlain: crypto.randomBytes(24).toString('hex') + 'A1!', // temporary random hash until owner sets password
        role: 'BUSINESS_OWNER',
        tenantId,
        status: 'INVITED',
        mustChangePassword: false,
        emailVerified: false
      });
    }

    // 3. Generate secure setup token (stored as SHA-256 hash in DB, 7-day expiration)
    const rawSetupToken = createAccountSetupToken(user.id);

    // 4. Send setup email using Gmail API
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const setupUrl = `${protocol}://${host}/setup-account?token=${rawSetupToken}`;

    await automationEngine.emit('BUSINESS_OWNER_INVITED', {
      userId: user.id,
      tenantId,
      email: cleanEmail,
      name: cleanName,
      businessName: cleanBizName,
      setupToken: rawSetupToken,
      setupUrl,
      expiryTime: '7 days'
    }).catch(e => console.error('[BusinessOwnerInviteEmailError]', e.message));

    logCredentialAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'BUSINESS_OWNER_INVITED',
      targetUserId: user.id,
      targetUserEmail: cleanEmail,
      targetTenantId: tenantId,
      metadata: { businessName: cleanBizName }
    });

    return res.status(201).json({
      success: true,
      message: `Business "${cleanBizName}" created. Account setup instructions have been sent to ${cleanEmail}.`,
      business: newBusiness,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId
      },
      setupUrl
    });
  } catch (err: any) {
    console.error('Create business error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create business.'
    });
  }
});

/**
 * Public Account Setup Token Verification
 */
authRouter.get('/setup-account/verify', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, valid: false, error: 'Setup token is required.' });
    }

    const user = findUserBySetupToken(token.trim());
    if (!user) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Setup token is invalid, already used, or has expired.'
      });
    }

    const business = getTenant(user.tenantId);

    return res.json({
      success: true,
      valid: true,
      businessName: business?.name || 'AgentDesk Business',
      ownerName: user.name,
      ownerEmail: user.email,
      role: user.role
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Public Account Setup Completion: Owner sets password -> status becomes ACTIVE -> workspace initialized
 * Do NOT email user password.
 */
authRouter.post('/setup-account', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Setup token and password are required.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    const user = findUserBySetupToken(token.trim());
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Setup token is invalid, already used, or has expired.'
      });
    }

    // Set new password, activate account, mark email verified, clear setup tokens
    updateUserPassword(user.id, password, false);
    const updatedUser = updateUser(user.id, {
      status: 'ACTIVE',
      emailVerified: true,
      setupTokenHash: undefined,
      setupTokenExpires: undefined
    })!;

    // Initialize Workspace (dedicated AI agent and knowledge base)
    const normTenant = user.tenantId;
    const business = getTenant(normTenant);
    const businessName = business?.name || 'AgentDesk Business';

    if (!serverAgentsStore.has(`agt-${normTenant}-primary`)) {
      serverAgentsStore.set(`agt-${normTenant}-primary`, {
        id: `agt-${normTenant}-primary`,
        publicId: `agt-${normTenant}-public`,
        tenantId: normTenant,
        name: `${businessName} AI FrontDesk`,
        status: 'active',
        systemPrompt: `You are the official receptionist and assistant for ${businessName}. Assist clients with consultations and booking.`,
        voiceConfig: { provider: 'gemini_multimodal_live', voiceName: 'Puck', speed: 1.0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (!serverKnowledgeStore.has(normTenant)) {
      serverKnowledgeStore.set(normTenant, [
        {
          id: `k-${normTenant}-welcome`,
          tenantId: normTenant,
          businessId: normTenant,
          title: `Welcome & Services for ${businessName}`,
          type: 'text',
          content: `${businessName} provides premium solutions. Reach our office for inquiries and appointment bookings.`,
          category: 'Overview',
          status: 'active',
          active: true,
          tags: ['overview', 'services'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    }

    if (!serverTenantUsageStore.has(normTenant)) {
      serverTenantUsageStore.set(normTenant, {
        tenantId: normTenant,
        aiUsage: 0,
        voiceMinutes: 0,
        knowledgeDocuments: 1,
        contacts: 0,
        lastReset: new Date().toISOString()
      });
    }

    // Create active session cookie so owner is logged in seamlessly
    const session = await createSession(updatedUser.id, updatedUser.email, updatedUser.role, updatedUser.tenantId);
    setSessionCookie(res, session.token);

    // Emit BUSINESS_CREATED event
    automationEngine.emit('BUSINESS_CREATED', {
      userId: updatedUser.id,
      tenantId: normTenant,
      email: updatedUser.email,
      name: updatedUser.name,
      businessName
    }).catch(e => console.error('[BusinessCreatedAutomationError]', e.message));

    logCredentialAction({
      actorId: updatedUser.id,
      actorEmail: updatedUser.email,
      actorRole: updatedUser.role,
      action: 'ACCOUNT_SETUP_COMPLETED',
      targetUserId: updatedUser.id,
      targetUserEmail: updatedUser.email,
      targetTenantId: normTenant
    });

    return res.json({
      success: true,
      token: session.token,
      sessionToken: session.token,
      message: 'Account successfully set up! Your business workspace is initialized.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        tenantId: updatedUser.tenantId,
        emailVerified: true
      },
      redirectUrl: '/business/dashboard'
    });
  } catch (err: any) {
    console.error('Account setup error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to complete account setup.'
    });
  }
});

/**
 * Reset / Regenerate credentials for a business owner
 */
authRouter.post('/platform/credentials/reset-password', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user as UserRecord;
    const { userId, temporaryPassword: customTempPassword } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required.'
      });
    }

    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const plainTempPassword = customTempPassword && customTempPassword.trim().length >= 8
      ? customTempPassword.trim()
      : generateStrongPassword(14);

    const updated = updateUserPassword(user.id, plainTempPassword, true);
    destroyAllUserSessions(user.id);

    logCredentialAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'BUSINESS_LOGIN_REGENERATED',
      targetUserId: user.id,
      targetUserEmail: user.email,
      targetTenantId: user.tenantId,
      metadata: {
        mustChangePassword: true
      }
    });

    return res.json({
      success: true,
      message: 'Temporary password generated. Business owner will be required to change it on next login.',
      temporaryPassword: plainTempPassword,
      user: sanitizeUser(updated)
    });
  } catch (err: any) {
    console.error('Reset credentials error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to reset password.'
    });
  }
});

/**
 * Change Login Email for a business owner
 */
authRouter.post('/platform/credentials/change-email', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user as UserRecord;
    const { userId, newEmail } = req.body;

    if (!userId || !newEmail) {
      return res.status(400).json({
        success: false,
        error: 'User ID and new email are required.'
      });
    }

    const oldUser = getUserById(userId);
    if (!oldUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const updated = updateUserEmail(userId, newEmail);
    destroyAllUserSessions(userId);

    logCredentialAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'EMAIL_CHANGED',
      targetUserId: userId,
      targetUserEmail: newEmail.toLowerCase().trim(),
      targetTenantId: oldUser.tenantId,
      metadata: {
        oldEmail: oldUser.email,
        newEmail: newEmail.toLowerCase().trim()
      }
    });

    return res.json({
      success: true,
      message: `Login email updated to ${newEmail}.`,
      user: sanitizeUser(updated)
    });
  } catch (err: any) {
    console.error('Change email error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to change login email.'
    });
  }
});

/**
 * Toggle Account Status: Disable or Enable Account
 */
authRouter.post('/platform/credentials/toggle-status', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user as UserRecord;
    const { userId, status } = req.body;

    if (!userId || !status) {
      return res.status(400).json({
        success: false,
        error: 'User ID and status are required.'
      });
    }

    if (!['ACTIVE', 'DISABLED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be ACTIVE, DISABLED, or SUSPENDED.'
      });
    }

    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const updated = updateUserStatus(userId, status);

    if (status !== 'ACTIVE') {
      destroyAllUserSessions(userId);
    }

    logCredentialAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: status === 'DISABLED' ? 'ACCOUNT_DISABLED' : 'ACCOUNT_ENABLED',
      targetUserId: user.id,
      targetUserEmail: user.email,
      targetTenantId: user.tenantId,
      metadata: {
        newStatus: status
      }
    });

    return res.json({
      success: true,
      message: `Account status updated to ${status}.`,
      user: sanitizeUser(updated)
    });
  } catch (err: any) {
    console.error('Toggle status error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to toggle account status.'
    });
  }
});

/**
 * Fetch credential audit logs
 */
authRouter.get('/platform/audit-logs', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const logs = getCredentialAuditLogs({ tenantId, limit });

    return res.json({
      success: true,
      auditLogs: logs
    });
  } catch (err: any) {
    console.error('Audit logs fetch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs.'
    });
  }
});

// ----------------------------------------------------
// 11. ONBOARDING: RECORD BUSINESS DETAILS
// ----------------------------------------------------
authRouter.post('/onboarding/business-details', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { businessName, industry, teamSize, phone, website } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Business Name is required.'
      });
    }

    const tenantSlug = businessName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const tenantId = `tenant-${tenantSlug || Date.now()}`;

    const onboardingTenant: any = {
      id: tenantId,
      tenantId,
      name: businessName.trim(),
      industry: industry || 'Professional Services',
      teamSize: teamSize || '1-10',
      phone: phone || '',
      website: website || '',
      ownerId: user.id,
      ownerEmail: user.email,
      status: 'ONBOARDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    serverBusinessesStore.set(tenantId, onboardingTenant);

    updateUser(user.id, {
      tenantId
    });

    return res.json({
      success: true,
      tenantId,
      tenant: onboardingTenant,
      nextStep: 'choose_plan'
    });
  } catch (err: any) {
    console.error('Error saving business details:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to record business details.'
    });
  }
});

// ----------------------------------------------------
// 13. USER 2FA SELF-SERVICE MANAGEMENT
// ----------------------------------------------------
authRouter.post('/2fa/setup', requireAuth, authRateLimiter, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return res.status(400).json({ success: false, error: 'A valid mobile phone number is required for 2FA.' });
    }

    const cleanPhone = phone.trim();
    const otpRes = await otpService.sendOTP(cleanPhone, 'sms');

    // Create challenge for enabling 2FA
    const challengeId = `2fa_setup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await saveTwoFactorChallenge(challengeId, {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      phone: cleanPhone,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    return res.json({
      success: true,
      challengeId,
      phone: cleanPhone,
      message: 'Verification code dispatched via SMS.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post('/2fa/enable', requireAuth, authRateLimiter, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { challengeId, code } = req.body;
    if (!challengeId || !code) {
      return res.status(400).json({ success: false, error: 'Challenge ID and 6-digit code are required.' });
    }

    const challenge = await consumeTwoFactorChallenge(challengeId);
    if (!challenge || challenge.userId !== user.id || challenge.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: '2FA setup challenge is invalid or has expired.' });
    }

    const verifyRes = await otpService.verifyOTP(challenge.phone, code.trim());
    if (!verifyRes.success) {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please try again.' });
    }

    // Update user record
    updateUser(user.id, {
      twoFactorEnabled: true,
      twoFactorPhone: challenge.phone
    });

    // Notify user
    emailService.sendTemplate('2fa_enabled', user.email, {
      name: user.name,
      email: user.email,
      phone: challenge.phone,
      timestamp: new Date().toISOString()
    }, { userId: user.id, tenantId: user.tenantId }).catch(() => {});

    auditLogService.logAction({
      tenantId: user.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: '2FA_ENABLED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { phone: challenge.phone }
    });

    return res.json({
      success: true,
      message: 'Two-Factor Authentication is now active on your account.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post('/2fa/disable', requireAuth, authRateLimiter, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Your current account password is required to disable 2FA.' });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(400).json({ success: false, error: 'Incorrect password.' });
    }

    updateUser(user.id, {
      twoFactorEnabled: false,
      twoFactorPhone: undefined
    });

    auditLogService.logAction({
      tenantId: user.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: '2FA_DISABLED',
      entityType: 'USER',
      entityId: user.id
    });

    return res.json({
      success: true,
      message: 'Two-Factor Authentication has been disabled.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 14. ACTIVE SESSIONS MANAGEMENT
// ----------------------------------------------------
authRouter.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const currentSession = (req as any).session;
    const allSessions = await getUserSessions(user.id);

    const safeSessions = allSessions.map(s => ({
      id: s.token.slice(0, 16) + '...',
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === currentSession.token
    }));

    return res.json({
      success: true,
      sessions: safeSessions
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post('/sessions/revoke-others', requireAuth, authRateLimiter, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const currentSession = (req as any).session;
    const revokedCount = await destroyOtherUserSessions(user.id, currentSession.token);

    auditLogService.logAction({
      tenantId: user.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'SESSIONS_REVOKED_OTHERS',
      entityType: 'USER',
      entityId: user.id,
      metadata: { revokedCount }
    });

    return res.json({
      success: true,
      revokedCount,
      message: `Successfully terminated ${revokedCount} other active session(s).`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 15. DATA EXPORT & GDPR PRIVACY ARCHIVE
// ----------------------------------------------------
authRouter.post('/export-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const tenant = getTenant(user.tenantId);

    const exportArchive = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        formatVersion: '1.0.0-gdpr',
        tenantId: user.tenantId,
        requestedBy: user.email
      },
      userProfile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: !!user.twoFactorEnabled,
        createdAt: user.createdAt
      },
      tenantDetails: tenant || null
    };

    auditLogService.logAction({
      tenantId: user.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DATA_EXPORT_GENERATED',
      entityType: 'TENANT',
      entityId: user.tenantId
    });

    return res.json({
      success: true,
      archive: exportArchive,
      message: 'Full tenant archive prepared successfully.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 16. ACCOUNT DELETION & 7-DAY GRACE PERIOD REQUEST
// ----------------------------------------------------
authRouter.post('/request-deletion', requireAuth, authRateLimiter, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as UserRecord;
    const { password, confirmationText } = req.body;

    if (!password || confirmationText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: 'Password and exact confirmation text "DELETE MY ACCOUNT" are required.'
      });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(400).json({ success: false, error: 'Incorrect password.' });
    }

    const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    updateUser(user.id, {
      status: 'SUSPENDED'
    });

    // Invalidate sessions
    destroyAllUserSessions(user.id);

    // Dispatched confirmation email
    emailService.sendTemplate('account_deletion_requested', user.email, {
      name: user.name,
      email: user.email,
      scheduledDeletionDate: scheduledDate
    }, { userId: user.id, tenantId: user.tenantId }).catch(() => {});

    auditLogService.logAction({
      tenantId: user.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'ACCOUNT_DELETION_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { scheduledDeletionDate: scheduledDate }
    });

    return res.json({
      success: true,
      message: `Account scheduled for permanent erasure on ${scheduledDate}. All active sessions have been terminated.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback 404 handler for unknown auth routes (only when scoped to /api/auth)
authRouter.all('*', (req: Request, res: Response, next: Function) => {
  if (req.baseUrl === '/api/auth') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'AUTH_ROUTE_NOT_FOUND',
        message: `Auth route ${req.method} /api/auth${req.url} was not found.`
      }
    });
  }
  next();
});


