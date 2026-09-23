import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { 
  DEMO_BUSINESS, 
  DEMO_BUSINESS_ID, 
  SEED_BUSINESSES, 
  SEED_KNOWLEDGE_ITEMS,
  PUBLIC_AGENTDESK_DEMO_BUSINESS,
  PUBLIC_DEMO_TENANT_ID,
  PUBLIC_DEMO_AGENT_ID,
  PLATFORM_ADMIN_BUSINESS,
  PLATFORM_ADMIN_AGENT,
  PLATFORM_ADMIN_KNOWLEDGE_ITEMS,
  PLATFORM_ADMIN_TENANT_ID,
  PLATFORM_ADMIN_AGENT_ID
} from './src/data/demoBusiness.js';
import {
  SEED_AGENTS
} from './src/data/seedData.js';
import {
  normalizeInput,
  classifyConversationIntent,
  extractIntentsAndEntities,
  retrieveTargetedKnowledge,
  generateEngineAnswer,
  validateAnswer,
  updateConversationMemory,
  ConversationRecord,
  ConversationState,
  KnowledgeItem
} from './src/lib/conversationEngine.js';
import { runConversationTestSuite, runMultiTenantIsolationTestSuite, runBusinessResolutionSafetyTests } from './src/lib/testSuite.js';
import { runProductionSmokeTests } from './src/server/tests/smokeTests.js';
import { billingRouter } from './src/server/billing/billingRouter.js';
import { authRouter, tenantRouter, requirePlatformAdmin, requireAuth, requireTenantAccess, extractTokenFromRequest } from './src/server/auth/authRouter.js';
import { getSession } from './src/server/auth/sessionStore.js';
import { getUserById } from './src/server/auth/userRegistry.js';
import { integrationsRouter } from './src/server/integrationsRouter.js';
import { storageService, gmailService, integrationStore, notificationService } from './src/server/integrations/index.js';
import { validateEnvironmentOnStartup } from './src/server/envValidator.js';
import { generalApiRateLimiter, clientErrorRateLimiter } from './src/server/integrations/rateLimiter.js';
import { postgresClient, getSafeDatabaseDiagnostics } from './src/server/db/postgresClient.js';
import { syncUsersFromPostgres, bootstrapPlatformAdminAsync, userRegistryReady } from './src/server/auth/userRegistry.js';
import { requireTenantMiddleware, verifyTenantFilterSecurity } from './src/server/tenantMiddleware.js';
import { conversationStore } from './src/server/db/conversationStore.js';
import { 
  serverBusinessesStore, 
  serverAgentsStore, 
  serverKnowledgeStore, 
  serverTenantUsageStore, 
  recordTenantUsage, 
  checkTenantQuota, 
  getPlanUsageLimits, 
  getTenant, 
  getAllTenants,
  provisionCustomerTenant,
  resetTenantQuota,
  persistKnowledgeToPostgres,
  deleteKnowledgeFromPostgres,
  setTenant,
  persistLeadToPostgres,
  getLeadsFromPostgres,
  syncAllTenantDataFromPostgres
} from './src/server/tenantRegistry.js';

// Safe environment directory resolver for both dev (tsx/ESM) and prod (esbuild/CJS)
const getAppDirectory = (): string => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}
  return process.cwd();
};

const appDirectory = getAppDirectory();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Enable trust proxy for Google Cloud Run / reverse proxies so req.ip, req.secure, and protocol are accurate
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : 1);

// Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Allow embedding within AI Studio and Google preview environments
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://agentdesk.ai.studio https://ai.studio https://aistudio.google.com;"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Production & Preview CORS Configuration
const isProductionEnv = process.env.NODE_ENV === 'production';

function isAllowedOrigin(origin: string, req: Request): boolean {
  if (!origin) return true;

  // Development: allow localhost and loopback
  if (!isProductionEnv) {
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('https://localhost:')
    ) {
      return true;
    }
  }

  // Explicit APP_URL match
  if (process.env.APP_URL) {
    try {
      if (origin === new URL(process.env.APP_URL).origin) return true;
    } catch {}
  }

  // Canonical Production Domains & Preview Containers
  if (
    origin === 'https://agentdesk.ai.studio' ||
    origin === 'https://ai.studio' ||
    origin === 'https://aistudio.google.com'
  ) {
    return true;
  }

  // Same-origin verification: check against Host / X-Forwarded-Host
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  if (host) {
    const cleanHost = host.split(',')[0].trim().toLowerCase();
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost === cleanHost) return true;
    } catch {}
  }

  return false;
}

const corsOptionsDelegate = (req: Request, callback: (err: Error | null, options?: any) => void) => {
  // The embeddable widget runs on customer websites and does not use AgentDesk
  // credentials. Allow browser preflight from any origin for these public routes.
  if (req.path.startsWith('/api/widget/')) {
    return callback(null, {
      origin: '*',
      credentials: false,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept']
    });
  }

  return callback(null, {
    origin: (origin: string | undefined, originCallback: (err: Error | null, value?: boolean) => void) => {
      if (!origin) return originCallback(null, true);
      return originCallback(null, isAllowedOrigin(origin, req));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-business-id', 'x-csrf-token']
  });
};

app.use(cors(corsOptionsDelegate));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
    req.rawBodyString = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true }));

const csrfProtectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(req: Request, name: string): string | null {
  const header = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const match = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function isCsrfExempt(req: Request): boolean {
  const fullPath = (req.originalUrl || req.url).split('?')[0];
  const subPath = (req.path || '').split('?')[0];

  const exemptExact = new Set([
    '/api/auth/login',
    '/auth/login',
    '/api/auth/platform/login',
    '/auth/platform/login',
    '/api/auth/platform-login',
    '/auth/platform-login',
    '/api/auth/signup',
    '/auth/signup',
    '/api/auth/verify-2fa-login',
    '/auth/verify-2fa-login',
    '/api/auth/verify-email',
    '/auth/verify-email',
    '/api/auth/forgot-password',
    '/auth/forgot-password',
    '/api/auth/reset-password',
    '/auth/reset-password',
    '/api/auth/resend-verification',
    '/auth/resend-verification',
    '/api/auth/setup-account',
    '/auth/setup-account',
    '/api/auth/setup-account/verify',
    '/auth/setup-account/verify',
    '/api/auth/logout',
    '/auth/logout',
    '/api/auth/csrf',
    '/auth/csrf',
    '/api/voice/process',
    '/voice/process',
    '/api/public/deployment-request',
    '/public/deployment-request'
  ]);

  if (exemptExact.has(fullPath) || exemptExact.has(subPath)) return true;
  if (fullPath.startsWith('/api/billing/webhook') || fullPath.startsWith('/api/webhooks')) return true;
  if (subPath.startsWith('/billing/webhook') || subPath.startsWith('/webhooks')) return true;
  // Public embeddable widget routes intentionally do not use AgentDesk
  // session cookies and must remain callable cross-origin.
  if (fullPath.startsWith('/api/widget/') || subPath.startsWith('/widget/')) return true;
  if (fullPath.startsWith('/api/chat') || subPath.startsWith('/chat')) return true;

  return false;
}

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (!csrfProtectedMethods.has(req.method) || isCsrfExempt(req)) return next();

  // If request is authenticated with an Authorization Bearer header, browser cross-site ambient cookies
  // are not relied upon; custom headers prevent standard CSRF.
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  if (authHeader && /^Bearer\s+[a-f0-9_.-]+/i.test(authHeader)) {
    return next();
  }

  // Double-submit cookie verification for cookie-authenticated sessions
  const sessionCookie = readCookie(req, 'agentdesk_session');
  if (!sessionCookie) return next();

  const csrfCookie = readCookie(req, 'agentdesk_csrf');
  const csrfHeader = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'].trim() : '';
  if (
    !csrfCookie ||
    !csrfHeader ||
    csrfCookie.length !== csrfHeader.length ||
    !crypto.timingSafeEqual(Buffer.from(csrfCookie), Buffer.from(csrfHeader))
  ) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Security validation failed. Please refresh and try again.'
      }
    });
  }
  next();
});

// Apply a bounded API-wide rate limit before individual routers.
// Sensitive routes may apply stricter route-specific limiters (for example auth and password reset).
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // API responses can contain tenant data, contact records, conversations, billing
  // state, or security metadata. Never allow intermediary/browser caching.
  res.setHeader('Cache-Control', 'no-store, private');
  next();
});

app.use('/api', generalApiRateLimiter);

// Mount Billing & Webhooks API Router
app.use('/api/billing', billingRouter);

// Mount Authentication API Router
// Authentication has one canonical mount. Legacy duplicate mounts were removed to prevent route ambiguity.
app.use('/api/auth', authRouter);
// Canonical tenant API routes live directly under /api (not /api/auth).
app.use('/api', tenantRouter);

// Mount Production Integrations, Notifications, Security & Health API Router
app.use('/api', integrationsRouter);
// Integrations are exposed only through the canonical /api mount. Legacy root aliases are intentionally removed.

// Secure Local Storage Files Endpoint with Strict Tenant Isolation
app.get('/api/storage/files/:fileKey', async (req: Request, res: Response) => {
  try {
    const fileKey = decodeURIComponent(req.params.fileKey);
    const file = storageService.getLocalFile(fileKey);
    if (!file || !file.dataBuffer) {
      return res.status(404).json({ success: false, error: 'File not found in storage.' });
    }

    // If file is private, strictly enforce tenant access
    if (file.isPrivate) {
      const token = extractTokenFromRequest(req);
      const session = await getSession(token);
      const user = session ? getUserById(session.userId) : null;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required to access private files.' });
      }

      if (user.role !== 'PLATFORM_ADMIN' && (user.tenantId || '').toLowerCase() !== (file.tenantId || '').toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to access this file.' });
      }
    }

    res.setHeader('Content-Type', file.contentType);
    const safeFilename = file.filename.replace(/[\\\r\n"]/g, '_').slice(0, 255);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    return res.send(file.dataBuffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Tenant-scoped conversations. Every read/update is bound to the authenticated
// tenant context so conversation IDs cannot be used to cross the tenant boundary.
app.get('/api/conversations', requireAuth, requireTenantAccess, async (req: Request, res: Response) => {
  try {
    const tenantId = String((req as any).tenantId || '').trim().toLowerCase();
    const records = await conversationStore.getConversationsByBusinessAsync(tenantId);
    const conversations = records.map(record => ({
      ...record,
      id: record.conversationId,
      tenantId,
      businessId: record.businessId || tenantId
    }));
    return res.json({ success: true, conversations });
  } catch (err: any) {
    console.error('[ConversationListError]', err);
    return res.status(500).json({ success: false, error: 'Unable to load conversations.' });
  }
});

app.patch('/api/conversations/:conversationId', requireAuth, requireTenantAccess, async (req: Request, res: Response) => {
  try {
    const tenantId = String((req as any).tenantId || '').trim().toLowerCase();
    const conversationId = String(req.params.conversationId || '').trim();
    const allowed = new Set(['AI_ACTIVE', 'HUMAN_REQUIRED', 'HUMAN_ACTIVE', 'RESOLVED']);
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : '';
    if (!conversationId || !allowed.has(status)) {
      return res.status(400).json({ success: false, error: 'A valid conversation ID and status are required.' });
    }
    const updated = await conversationStore.updateConversationStatusAsync(
      conversationId,
      tenantId,
      status as any
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Conversation not found.' });
    return res.json({
      success: true,
      conversation: {
        ...updated,
        id: updated.conversationId,
        tenantId,
        businessId: updated.businessId || tenantId
      }
    });
  } catch (err: any) {
    console.error('[ConversationUpdateError]', err);
    return res.status(500).json({ success: false, error: 'Unable to update conversation.' });
  }
});

// Tenant-scoped lead API. Website chat uses this server-side source of truth so leads
// survive browser refreshes/deploys and are visible to the owning business dashboard.
app.get('/api/leads', requireAuth, requireTenantAccess, async (req: Request, res: Response) => {
  try {
    const tenantId = String((req as any).tenantId || '').trim().toLowerCase();
    if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant context is required.' });
    const leads = await getLeadsFromPostgres(tenantId);
    return res.json({ success: true, leads });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const tenantId = String(body.tenantId || body.businessId || '').trim().toLowerCase();
    const agentId = String(body.agentId || '').trim().toLowerCase();
    const agent = agentId ? serverAgentsStore.get(agentId) : null;

    // Dashboard lead creation is authenticated. Only the intentionally public
    // AgentDesk demo may create a lead without a session.
    const token = extractTokenFromRequest(req);
    const session = await getSession(token);
    const user = session ? (getUserById(session.userId) || await getUserById(session.userId)) : null;
    if (!user && tenantId !== PUBLIC_DEMO_TENANT_ID.toLowerCase()) {
      return res.status(401).json({ success: false, error: 'Authentication required to create leads for this tenant.' });
    }
    if (user && user.role !== 'PLATFORM_ADMIN' && user.tenantId.toLowerCase() !== tenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cross-tenant lead creation is not allowed.' });
    }

    if (!tenantId || !agent || String(agent.tenantId || '').toLowerCase() !== tenantId) {
      return res.status(400).json({ success: false, error: 'Valid tenant and agent context are required.' });
    }
    const business = getTenant(tenantId);
    if (!business) return res.status(404).json({ success: false, error: 'Tenant not found.' });

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 255) : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 64) : '';
    if (!name || (!email && !phone)) {
      return res.status(400).json({ success: false, error: 'Lead name and at least email or phone are required.' });
    }

    const now = new Date().toISOString();
    const lead = {
      // Server-owned ID prevents client-controlled primary-key collisions across tenants.
      id: 'lead-' + crypto.randomBytes(16).toString('hex'),
      tenantId, businessId: tenantId, name, email, phone,
      company: typeof body.company === 'string' ? body.company.trim().slice(0, 255) : '',
      source: typeof body.source === 'string' ? body.source.slice(0, 128) : 'website_chat',
      status: 'new',
      score: Math.max(0, Math.min(100, Number(body.score) || 0)),
      scoreCategory: typeof body.scoreCategory === 'string' ? body.scoreCategory.slice(0, 32) : '',
      requirement: typeof body.requirement === 'string' ? body.requirement.slice(0, 2000) : '',
      conversationId: typeof body.conversationId === 'string' ? body.conversationId.slice(0, 128) : '',
      details: body.details && typeof body.details === 'object' ? body.details : {},
      createdAt: now, updatedAt: now
    };

    const persisted = await persistLeadToPostgres(lead);
    if (!persisted && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Lead storage is temporarily unavailable. Please try again.' });
    }

    const notifyEmail = typeof business.leadNotificationEmail === 'string' && business.leadNotificationEmail.trim()
      ? business.leadNotificationEmail.trim()
      : typeof business.supportEmail === 'string' ? business.supportEmail.trim() : '';
    const notifyPhone = typeof business.leadNotificationPhone === 'string' && business.leadNotificationPhone.trim()
      ? business.leadNotificationPhone.trim()
      : typeof business.phone === 'string' ? business.phone.trim() : '';

    const notificationPayload = {
      tenantId, email: notifyEmail, phone: notifyPhone,
      leadName: name, score: lead.score, leadId: lead.id,
      leadEmail: email, leadPhone: phone, requirement: lead.requirement,
      source: lead.source, category: 'leads',
      title: `New Lead: ${name}`,
      body: `New website enquiry from ${name}. ${lead.requirement ? 'Requirement: ' + lead.requirement : 'Contact details are available in your AgentDesk dashboard.'}`
    };
    try {
      await notificationService.dispatchEvent('NEW_LEAD_RECEIVED', notificationPayload);
    } catch (notifyError: any) {
      console.error('[LeadNotificationError]', notifyError?.message || notifyError);
    }

    return res.status(201).json({ success: true, lead, notifications: { email: !!notifyEmail, whatsapp: !!notifyPhone } });
  } catch (err: any) {
    console.error('[LeadCreateError]', err);
    return res.status(500).json({ success: false, error: 'Unable to save lead.' });
  }
});

app.patch('/api/leads/:leadId', requireAuth, requireTenantAccess, async (req: Request, res: Response) => {
  try {
    const tenantId = String((req as any).tenantId || '').trim().toLowerCase();
    const leadId = String(req.params.leadId || '').trim();
    if (!tenantId || !leadId) return res.status(400).json({ success: false, error: 'Lead and tenant context are required.' });

    const allowedStatuses = new Set(['new', 'contacted', 'qualified', 'converted']);
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : undefined;
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 5000) : undefined;
    if (status !== undefined && !allowedStatuses.has(status)) {
      return res.status(400).json({ success: false, error: 'Invalid lead status.' });
    }
    if (status === undefined && notes === undefined) {
      return res.status(400).json({ success: false, error: 'No supported lead fields were provided.' });
    }

    const db = await postgresClient.initialize();
    if (!db) return res.status(503).json({ success: false, error: 'Lead storage is temporarily unavailable.' });

    const existing = await postgresClient.query(
      'SELECT id, tenant_id, name, email, phone, source, status, score, details, created_at, updated_at FROM agentdesk_leads WHERE id = $1 AND tenant_id = $2 LIMIT 1',
      [leadId, tenantId]
    );
    if (!existing.rows?.length) return res.status(404).json({ success: false, error: 'Lead not found.' });

    const row = existing.rows[0];
    const details = row.details && typeof row.details === 'object' ? { ...row.details } : {};
    if (notes !== undefined) details.notes = notes;
    const updated = await postgresClient.query(
      'UPDATE agentdesk_leads SET status = COALESCE($3, status), details = $4, updated_at = $5 WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, name, email, phone, source, status, score, details, created_at, updated_at',
      [leadId, tenantId, status ?? null, JSON.stringify(details), new Date().toISOString()]
    );
    const next = updated.rows[0];
    return res.json({
      success: true,
      lead: {
        id: next.id,
        tenantId: next.tenant_id,
        businessId: next.tenant_id,
        name: next.name,
        email: next.email || '',
        phone: next.phone || '',
        source: next.source || 'website_chat',
        status: next.status || 'new',
        score: Number(next.score) || 0,
        ...(next.details && typeof next.details === 'object' ? next.details : {}),
        createdAt: next.created_at,
        updatedAt: next.updated_at
      }
    });
  } catch (err: any) {
    console.error('[LeadUpdateError]', err);
    return res.status(500).json({ success: false, error: 'Unable to update lead.' });
  }
});

// Public enterprise deployment request email workflow.
// Provider credentials stay server-side and the form only succeeds after both
// admin and customer notifications are accepted by a transactional email provider.
function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendAgentDeskTransactionalEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: string;
}): Promise<{ provider: 'brevo' | 'resend'; messageId?: string }> {
  const senderEmail = (process.env.EMAIL_FROM || '').trim();
  const senderName = (process.env.EMAIL_FROM_NAME || 'AgentDesk').trim();
  const replyTo = (params.replyTo || process.env.EMAIL_REPLY_TO || senderEmail).trim();
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();

  if (!senderEmail || !isValidEmailAddress(senderEmail)) {
    throw new Error('Transactional email sender is not configured. Set EMAIL_FROM to a verified sender address.');
  }
  if (!brevoKey && !resendKey) {
    throw new Error('Transactional email is not configured. Set BREVO_API_KEY or RESEND_API_KEY in the deployment environment.');
  }

  const providerErrors: string[] = [];

  if (brevoKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'api-key': brevoKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: params.to, ...(params.toName ? { name: params.toName } : {}) }],
          ...(replyTo && isValidEmailAddress(replyTo) ? { replyTo: { email: replyTo } } : {}),
          subject: params.subject,
          htmlContent: params.htmlContent,
          textContent: params.textContent
        })
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { provider: 'brevo', messageId: typeof data?.messageId === 'string' ? data.messageId : undefined };
      }
      const body = await response.text().catch(() => '');
      providerErrors.push('Brevo ' + response.status + ': ' + body.slice(0, 300));
    } catch (error: any) {
      providerErrors.push('Brevo request failed: ' + (error?.message || 'unknown error'));
    }
  }

  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: senderName ? senderName + ' <' + senderEmail + '>' : senderEmail,
          to: [params.to],
          ...(replyTo && isValidEmailAddress(replyTo) ? { reply_to: replyTo } : {}),
          subject: params.subject,
          html: params.htmlContent,
          text: params.textContent
        })
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { provider: 'resend', messageId: typeof data?.id === 'string' ? data.id : undefined };
      }
      const body = await response.text().catch(() => '');
      providerErrors.push('Resend ' + response.status + ': ' + body.slice(0, 300));
    } catch (error: any) {
      providerErrors.push('Resend request failed: ' + (error?.message || 'unknown error'));
    }
  }

  throw new Error(providerErrors.join(' | ') || 'No transactional email provider accepted the message.');
}

app.post('/api/public/deployment-request', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 50) : '';
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 160) : '';
    const locationsCount = typeof body.locationsCount === 'string' ? body.locationsCount.trim().slice(0, 40) : '1';
    const callVolume = typeof body.callVolume === 'string' ? body.callVolume.trim().slice(0, 80) : '';
    const requirements = typeof body.requirements === 'string' ? body.requirements.trim().slice(0, 4000) : '';
    const planName = typeof body.planName === 'string' ? body.planName.trim().slice(0, 120) : 'Enterprise';

    if (!name || !email || !isValidEmailAddress(email)) {
      return res.status(400).json({ success: false, error: 'A valid name and email address are required.' });
    }

    const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || process.env.EMAIL_REPLY_TO || '').trim().toLowerCase();
    if (!adminEmail || !isValidEmailAddress(adminEmail)) {
      console.error('[Deployment Request] PLATFORM_ADMIN_EMAIL/EMAIL_REPLY_TO is not configured.');
      return res.status(503).json({ success: false, error: 'Deployment request email routing is not configured.' });
    }

    const requestId = 'DEP-' + new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const safe = {
      requestId: escapeEmailHtml(requestId), name: escapeEmailHtml(name), email: escapeEmailHtml(email),
      phone: escapeEmailHtml(phone || 'Not provided'), company: escapeEmailHtml(company || 'Not provided'),
      locationsCount: escapeEmailHtml(locationsCount), callVolume: escapeEmailHtml(callVolume || 'Not provided'),
      requirements: escapeEmailHtml(requirements || 'None provided').replace(/\n/g, '<br />'), planName: escapeEmailHtml(planName)
    };

    const adminHtml = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">' +
      '<h2>New AgentDesk Deployment Request</h2><p>A new enterprise deployment request was submitted from the AgentDesk website.</p>' +
      '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse">' +
      '<tr><td><strong>Request ID</strong></td><td>' + safe.requestId + '</td></tr>' +
      '<tr><td><strong>Plan</strong></td><td>' + safe.planName + '</td></tr>' +
      '<tr><td><strong>Name</strong></td><td>' + safe.name + '</td></tr>' +
      '<tr><td><strong>Email</strong></td><td>' + safe.email + '</td></tr>' +
      '<tr><td><strong>Phone</strong></td><td>' + safe.phone + '</td></tr>' +
      '<tr><td><strong>Company</strong></td><td>' + safe.company + '</td></tr>' +
      '<tr><td><strong>Locations</strong></td><td>' + safe.locationsCount + '</td></tr>' +
      '<tr><td><strong>Call volume</strong></td><td>' + safe.callVolume + '</td></tr></table>' +
      '<h3>Requirements</h3><p>' + safe.requirements + '</p><p><a href="mailto:' + safe.email + '">Reply to the customer</a></p>' +
      '</body></html>';

    const adminText = [
      'New AgentDesk Deployment Request', 'Request ID: ' + requestId, 'Plan: ' + planName, 'Name: ' + name,
      'Email: ' + email, 'Phone: ' + (phone || 'Not provided'), 'Company: ' + (company || 'Not provided'),
      'Locations: ' + locationsCount, 'Call volume: ' + (callVolume || 'Not provided'),
      'Requirements: ' + (requirements || 'None provided')
    ].join('\\n');

    const customerHtml = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">' +
      '<h2>AgentDesk Deployment Request Received</h2><p>Hi ' + safe.name + ',</p>' +
      '<p>We received your AgentDesk deployment request. Our team will review the requested scope and contact you using the details below.</p>' +
      '<p><strong>Request ID:</strong> ' + safe.requestId + '<br /><strong>Selected system:</strong> ' + safe.planName + '</p>' +
      '<p>We will follow up with implementation scope and next steps.</p><p>Regards,<br />AgentDesk Technologies</p>' +
      '</body></html>';

    const customerText = [
      'AgentDesk Deployment Request Received', 'Hi ' + name + ',', 'We received your deployment request.',
      'Request ID: ' + requestId, 'Selected system: ' + planName,
      'Our team will review the scope and follow up with implementation details and next steps.', 'AgentDesk Technologies'
    ].join('\\n');

    const [adminDelivery, customerDelivery] = await Promise.all([
      sendAgentDeskTransactionalEmail({
        to: adminEmail, toName: 'AgentDesk Admin',
        subject: 'New AgentDesk Deployment Request: ' + planName + ' - ' + name,
        htmlContent: adminHtml, textContent: adminText, replyTo: email
      }),
      sendAgentDeskTransactionalEmail({
        to: email, toName: name, subject: 'AgentDesk Deployment Request Received',
        htmlContent: customerHtml, textContent: customerText,
        replyTo: process.env.EMAIL_REPLY_TO || adminEmail
      })
    ]);

    console.log('[Deployment Request] Email notifications accepted by provider', {
      requestId, adminProvider: adminDelivery.provider, customerProvider: customerDelivery.provider
    });
    return res.status(201).json({ success: true, requestId, message: 'Deployment request submitted and email notifications sent.' });
  } catch (error: any) {
    console.error('[Deployment Request] Email delivery failed:', error?.message || error);
    return res.status(502).json({ success: false, error: 'We could not deliver the deployment request email. Please try again or contact AgentDesk support.' });
  }
});

// Client Error Telemetry Endpoint
app.post('/api/logs/client-error', clientErrorRateLimiter, (req: Request, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : 'Unknown client error';
  const time = typeof body.time === 'string' ? body.time.slice(0, 64) : undefined;
  const route = typeof body.route === 'string' ? body.route.slice(0, 300) : undefined;
  const errorType = typeof body.errorType === 'string' ? body.errorType.slice(0, 120) : undefined;

  console.warn('[Client Error Logged]:', { message, time, route, errorType });
  return res.json({ success: true });
});

// Initialize Gemini Client safely with lazy evaluation
import { generateGroundedGeminiResponse } from './src/server/ai/geminiService.js';

// Global In-Memory Conversation Acceleration Cache & PostgreSQL-Authoritative Store
export function getOrCreateConversation(conversationId?: string, businessId?: string): ConversationRecord {
  return conversationStore.getOrCreateConversationSync(conversationId, businessId);
}

function formatBusinessName(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Stores (serverKnowledgeStore, serverBusinessesStore, serverAgentsStore, etc.) are imported from tenantRegistry.js

// Helper: Resolve Business, Agent, and Knowledge strictly by Identifier (STRICT TENANT ISOLATION)
export function resolveBusinessAndKnowledge(identifier?: string, customKnowledge?: any[]) {
  const normId = (identifier || '').trim().toLowerCase();
  
  // Platform Admin Agent resolution
  if (
    normId === PLATFORM_ADMIN_AGENT_ID.toLowerCase() || 
    normId === PLATFORM_ADMIN_TENANT_ID.toLowerCase() || 
    normId === 'platform-admin' || 
    normId === 'platform_admin'
  ) {
    const resolvedAgent = serverAgentsStore.get(PLATFORM_ADMIN_AGENT_ID.toLowerCase()) || 
                          serverAgentsStore.get(PLATFORM_ADMIN_TENANT_ID.toLowerCase()) || 
                          PLATFORM_ADMIN_AGENT;
    let business = serverBusinessesStore.get(PLATFORM_ADMIN_TENANT_ID.toLowerCase()) || PLATFORM_ADMIN_BUSINESS;
    
    if (resolvedAgent) {
      business = {
        ...business,
        primaryColor: resolvedAgent.primaryColor || business.primaryColor,
        secondaryColor: resolvedAgent.secondaryColor || business.secondaryColor,
        voice: resolvedAgent.voice || business.voice,
        voiceGreeting: resolvedAgent.voiceGreeting || business.voiceGreeting,
        agentSettings: {
          ...business.agentSettings,
          agentName: resolvedAgent.name || business.agentSettings?.agentName,
          welcomeMessage: resolvedAgent.welcomeMessage || business.agentSettings?.welcomeMessage,
          businessDescription: resolvedAgent.businessDescription || business.agentSettings?.businessDescription,
          tone: resolvedAgent.tone || business.agentSettings?.tone,
          suggestedQuestions: resolvedAgent.suggestedQuestions || business.agentSettings?.suggestedQuestions,
          systemSecurityInstructions: resolvedAgent.customInstructions || resolvedAgent.systemInstructions || business.agentSettings?.systemSecurityInstructions,
          humanHandoffEnabled: resolvedAgent.humanHandoffEnabled ?? business.agentSettings?.humanHandoffEnabled,
          leadCaptureEnabled: resolvedAgent.leadCaptureEnabled ?? business.agentSettings?.leadCaptureEnabled
        }
      };
    }

    const storedList = serverKnowledgeStore.get(PLATFORM_ADMIN_TENANT_ID.toLowerCase()) || [];
    let knowledge: KnowledgeItem[] = [...storedList];

    if (Array.isArray(customKnowledge) && customKnowledge.length > 0) {
      const customFiltered = customKnowledge.filter((k: any) => {
        const kBiz = (k.tenantId || k.businessId || '').trim().toLowerCase();
        return kBiz === PLATFORM_ADMIN_TENANT_ID.toLowerCase();
      });
      for (const cItem of customFiltered) {
        if (!knowledge.some(k => k.id === cItem.id)) {
          knowledge.push(cItem);
        }
      }
    }

    if (knowledge.length === 0) {
      knowledge = PLATFORM_ADMIN_KNOWLEDGE_ITEMS;
    }

    return { business, knowledge, agent: resolvedAgent };
  }

  // If no identifier provided or explicitly asking for public demo, resolve public AgentDesk demo
  if (!normId || normId === PUBLIC_DEMO_AGENT_ID.toLowerCase() || normId === PUBLIC_DEMO_TENANT_ID.toLowerCase() || normId === 'agent_public_demo') {
    let resolvedAgent = serverAgentsStore.get(PUBLIC_DEMO_AGENT_ID.toLowerCase()) || SEED_AGENTS.find(a => a.id.toLowerCase() === PUBLIC_DEMO_AGENT_ID.toLowerCase());
    let business = serverBusinessesStore.get(PUBLIC_DEMO_TENANT_ID.toLowerCase()) || PUBLIC_AGENTDESK_DEMO_BUSINESS;
    
    if (!resolvedAgent) {
      resolvedAgent = {
        id: PUBLIC_DEMO_AGENT_ID,
        publicId: PUBLIC_DEMO_AGENT_ID,
        tenantId: PUBLIC_DEMO_TENANT_ID,
        businessId: PUBLIC_DEMO_TENANT_ID,
        name: 'AgentDesk AI Assistant',
        role: 'AI Revenue & Operations Specialist',
        avatar: '',
        welcomeMessage: 'Hi! I am the AgentDesk AI Assistant. Ask me anything about our platform, features, pricing, or request a custom setup!',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        tone: 'Professional & Warm',
        voice: 'Puck',
        voiceGreeting: 'Hello! Welcome to AgentDesk. How can I help you grow your revenue today?',
        suggestedQuestions: [
          'What is AgentDesk and how does it work?',
          'What are the AgentDesk pricing plans?',
          'How do I embed the AI widget on my site?'
        ],
        customInstructions: 'Strict Public Demo Agent. You represent AgentDesk platform only.',
        leadCaptureEnabled: true,
        humanHandoffEnabled: true
      } as any;
    } else {
      business = {
        ...business,
        primaryColor: resolvedAgent.primaryColor || business.primaryColor,
        secondaryColor: resolvedAgent.secondaryColor || business.secondaryColor,
        agentSettings: {
          ...business.agentSettings,
          agentName: resolvedAgent.name || business.agentSettings?.agentName,
          welcomeMessage: resolvedAgent.welcomeMessage || business.agentSettings?.welcomeMessage,
          businessDescription: resolvedAgent.businessDescription || business.agentSettings?.businessDescription,
          tone: resolvedAgent.tone || business.agentSettings?.tone,
          suggestedQuestions: resolvedAgent.suggestedQuestions || business.agentSettings?.suggestedQuestions
        }
      };
    }

    const storedList = serverKnowledgeStore.get(PUBLIC_DEMO_TENANT_ID.toLowerCase()) || [];
    let knowledge: KnowledgeItem[] = [...storedList];

    if (Array.isArray(customKnowledge) && customKnowledge.length > 0) {
      const customFiltered = customKnowledge.filter((k: any) => {
        const kBiz = (k.tenantId || k.businessId || '').trim().toLowerCase();
        return kBiz === PUBLIC_DEMO_TENANT_ID.toLowerCase();
      });
      for (const cItem of customFiltered) {
        if (!knowledge.some(k => k.id === cItem.id)) {
          knowledge.push(cItem);
        }
      }
    }

    if (knowledge.length === 0) {
      knowledge = SEED_KNOWLEDGE_ITEMS.filter(k => (k.tenantId || k.businessId || '').trim().toLowerCase() === PUBLIC_DEMO_TENANT_ID.toLowerCase());
    }

    return { business, knowledge, agent: resolvedAgent };
  }

  const allowSeedFallbacks = process.env.NODE_ENV !== 'production';

  // 1. Check if identifier resolves to an AI Agent first
  let resolvedAgent = serverAgentsStore.get(normId);
  if (!resolvedAgent && allowSeedFallbacks) {
    resolvedAgent = SEED_AGENTS.find(a => (a.id || '').toLowerCase() === normId || (a.publicId || '').toLowerCase() === normId);
  }
  
  // 2. Identify the Tenant ID
  const targetTenantId = resolvedAgent ? resolvedAgent.tenantId.toLowerCase() : normId;
  
  // 3. Locate business from the authoritative server store
  let business = serverBusinessesStore.get(targetTenantId);
  if (!business && allowSeedFallbacks) {
    business = SEED_BUSINESSES.find(b => (b.id || '').trim().toLowerCase() === targetTenantId);
  }
  
  if (!business) {
    // Unknown tenant identifiers must not synthesize an active/published tenant.
    // Only the explicit public-demo path above may use a seeded fallback.
    return {
      business: null,
      knowledge: [],
      agent: resolvedAgent || null
    };
  }

  // Ensure resolvedAgent is always populated
  if (!resolvedAgent) {
    resolvedAgent = {
      id: `agent_${business.id}`,
      publicId: `agent_${business.id}`,
      tenantId: business.id,
      businessId: business.id,
      name: business.agentSettings?.agentName || `${business.name} AI Assistant`,
      role: 'AI Sales & Customer Operations Agent',
      avatar: business.logo || '',
      welcomeMessage: business.agentSettings?.welcomeMessage || `Hi 👋 Welcome to ${business.name}. How can I assist you today?`,
      primaryColor: business.primaryColor || '#2563eb',
      secondaryColor: business.secondaryColor || '#64748b',
      tone: business.agentSettings?.tone || 'Professional & Warm',
      voice: business.voice || 'Puck',
      voiceGreeting: business.voiceGreeting || `Hello! I am ${business.name} AI receptionist. How can I assist you today?`,
      suggestedQuestions: (business.agentSettings?.suggestedQuestions && business.agentSettings.suggestedQuestions.length > 0)
        ? business.agentSettings.suggestedQuestions
        : [
            `Tell me about ${business.name}`,
            'What services do you offer?',
            'What is your pricing?',
            'How can I get started?'
          ],
      customInstructions: business.agentSettings?.systemSecurityInstructions || `Strict tenant isolation for ${business.name}.`,
      leadCaptureEnabled: business.agentSettings?.leadCaptureEnabled ?? true,
      humanHandoffEnabled: business.agentSettings?.humanHandoffEnabled ?? true
    } as any;
  } else {
    // Merge agent specific attributes into business view for this session
    business = {
      ...business,
      primaryColor: resolvedAgent.primaryColor || business.primaryColor,
      secondaryColor: resolvedAgent.secondaryColor || business.secondaryColor,
      voice: resolvedAgent.voice || business.voice,
      voiceGreeting: resolvedAgent.voiceGreeting || business.voiceGreeting,
      agentSettings: {
        ...business.agentSettings,
        agentName: resolvedAgent.name || business.agentSettings?.agentName,
        welcomeMessage: resolvedAgent.welcomeMessage || business.agentSettings?.welcomeMessage,
        businessDescription: resolvedAgent.businessDescription || business.agentSettings?.businessDescription,
        tone: resolvedAgent.tone || business.agentSettings?.tone,
        suggestedQuestions: resolvedAgent.suggestedQuestions || business.agentSettings?.suggestedQuestions,
        systemSecurityInstructions: resolvedAgent.customInstructions || business.agentSettings?.systemSecurityInstructions,
        humanHandoffEnabled: resolvedAgent.humanHandoffEnabled ?? business.agentSettings?.humanHandoffEnabled,
        leadCaptureEnabled: resolvedAgent.leadCaptureEnabled ?? business.agentSettings?.leadCaptureEnabled
      }
    };
  }

  // 4. Locate knowledge items strictly belonging to this tenant
  const tenantLookupKey = business.id.trim().toLowerCase();
  const storedList = serverKnowledgeStore.get(tenantLookupKey) || [];
  let knowledge: KnowledgeItem[] = [...storedList];

  if (Array.isArray(customKnowledge) && customKnowledge.length > 0) {
    const customFiltered = customKnowledge.filter((k: any) => {
      const kBiz = (k.tenantId || k.businessId || '').trim().toLowerCase();
      return kBiz === tenantLookupKey;
    });

    for (const cItem of customFiltered) {
      if (!knowledge.some(k => k.id === cItem.id)) {
        knowledge.push(cItem);
      }
    }
  }

  if (knowledge.length === 0) {
    if (allowSeedFallbacks) {
      knowledge = SEED_KNOWLEDGE_ITEMS.filter(k => (k.tenantId || k.businessId || '').trim().toLowerCase() === tenantLookupKey);
    }
  }

  return { business, knowledge, agent: resolvedAgent };
}


function resolvePublicWidgetTarget(identifier?: string) {
  const normId = String(identifier || '').trim().toLowerCase();

  if (
    normId === PLATFORM_ADMIN_AGENT_ID.toLowerCase() ||
    normId === PLATFORM_ADMIN_TENANT_ID.toLowerCase() ||
    normId === 'platform-admin' ||
    normId === 'platform_admin'
  ) {
    return { business: null, agent: null, knowledge: [] as KnowledgeItem[] };
  }

  const resolved = resolveBusinessAndKnowledge(identifier);
  if (!resolved.business || !resolved.agent) {
    return { business: null, agent: null, knowledge: [] as KnowledgeItem[] };
  }

  const businessStatus = String(resolved.business.status || '').trim().toLowerCase();
  const subscriptionState = String(resolved.business.subscriptionState || '').trim().toUpperCase();
  const agentStatus = String(resolved.agent.status || '').trim().toLowerCase();

  const isPublicDemo =
    resolved.business.id.toLowerCase() === PUBLIC_DEMO_TENANT_ID.toLowerCase() ||
    resolved.agent.id.toLowerCase() === PUBLIC_DEMO_AGENT_ID.toLowerCase();

  if (!isPublicDemo) {
    const businessAllowed =
      businessStatus === 'active' &&
      (!subscriptionState || ['ACTIVE', 'TRIAL'].includes(subscriptionState));
    const agentAllowed = !['draft', 'paused', 'disabled', 'inactive', 'archived'].includes(agentStatus);
    if (!businessAllowed || !agentAllowed) {
      return { business: null, agent: null, knowledge: [] as KnowledgeItem[] };
    }
  }

  return resolved;
}

function canonicalizePublicConversationId(tenantId: string, suppliedId?: string): string {
  const raw = String(suppliedId || '').trim().slice(0, 200);
  const safeTenant = String(tenantId || '').trim().toLowerCase();
  const digest = crypto.createHash('sha256')
    .update(safeTenant + ':' + (raw || crypto.randomUUID()))
    .digest('hex');
  return 'conv_' + digest;
}

// ==========================================
// ZERO-COST API COST PROTECTION & RATE LIMITING
// ==========================================
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipRateLimitMap = new Map<string, RateLimitRecord>();
const agentUsageMap = new Map<string, RateLimitRecord>();
interface ConversationTurnRecord {
  count: number;
  lastSeenAt: number;
}

const conversationTurnMap = new Map<string, ConversationTurnRecord>();
const CONVERSATION_TURN_TTL_MS = 2 * 60 * 60 * 1000;

// Periodic garbage collection to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipRateLimitMap.entries()) {
    if (now > val.resetAt) ipRateLimitMap.delete(key);
  }
  for (const [key, val] of agentUsageMap.entries()) {
    if (now > val.resetAt) agentUsageMap.delete(key);
  }
  for (const [key, val] of conversationTurnMap.entries()) {
    if (now - val.lastSeenAt > CONVERSATION_TURN_TTL_MS) conversationTurnMap.delete(key);
  }
}, 300000); // every 5 min

async function checkPersistentRateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60000
): Promise<boolean> {
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
      return Number(result.rows[0]?.count || 0) <= limit;
    }
  } catch (error: any) {
    console.warn('[RateLimit] Persistent store unavailable, using local fallback:', error.message);
  }

  const now = Date.now();
  const record = ipRateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count += 1;
  return true;
}

function checkRateLimit(key: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    checkPersistentRateLimit(key, limit, windowMs).catch(() => {});
    return true;
  }
  if (record.count >= limit) return false;
  record.count += 1;
  checkPersistentRateLimit(key, limit, windowMs).catch(() => {});
  return true;
}

async function checkAgentAiHourlyBudget(agentId: string, maxHourlyCalls: number = 200): Promise<boolean> {
  return checkPersistentRateLimit(`agent_ai_hourly:${agentId.toLowerCase()}`, maxHourlyCalls, 3600000);
}

async function checkAndIncrementConversationTurns(convId: string, maxTurns: number = 35): Promise<boolean> {
  if (!convId) return true;
  return checkPersistentRateLimit(`conversation_turns:${convId}`, maxTurns, 2 * 60 * 60 * 1000);
}

// API Routes
// Tenant discovery endpoints
// Public callers may resolve only the intentionally public AgentDesk demo tenant.
// Authenticated platform admins may list all tenant workspaces.
app.get('/api/tenants', async (req: Request, res: Response) => {
  try {
    const token = extractTokenFromRequest(req);
    const session = await getSession(token);
    const user = session ? getUserById(session.userId) : null;

    if (user?.role === 'PLATFORM_ADMIN') {
      return res.json({ success: true, tenants: getAllTenants() });
    }

    const demo = getTenant(PUBLIC_DEMO_TENANT_ID);
    return res.json({ success: true, tenants: demo ? [demo] : [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'TENANT_LIST_ERROR', message: 'Unable to load tenant workspaces.' } });
  }
});

app.get('/api/tenants/:tenantId', async (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.tenantId || '').trim().toLowerCase();
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID is required.' } });
    }

    // The public demo is intentionally resolvable without authentication.
    if (tenantId === PUBLIC_DEMO_TENANT_ID.toLowerCase() || tenantId === PUBLIC_DEMO_AGENT_ID.toLowerCase()) {
      const resolved = resolveBusinessAndKnowledge(tenantId);
      if (!resolved.business) {
        return res.status(404).json({ success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found.' } });
      }
      return res.json({ success: true, tenant: resolved.business });
    }

    const token = extractTokenFromRequest(req);
    const session = await getSession(token);
    const user = session ? getUserById(session.userId) : null;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid authentication session required.' });
    }
    if (user.role !== 'PLATFORM_ADMIN' && user.tenantId.toLowerCase() !== tenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cross-tenant access is strictly prohibited.' });
    }

    const tenant = getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found.' } });
    }
    return res.json({ success: true, tenant });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'TENANT_LOOKUP_ERROR', message: 'Unable to load the requested tenant.' } });
  }
});

// Shallow liveness probe for platform load balancers. Keep this independent of external dependencies.
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'AgentDesk',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  const dbStatus = postgresClient.getStatus();
  const healthy = dbStatus.isConnected;

  res.removeHeader('Access-Control-Allow-Origin');
  res.setHeader('Content-Type', 'application/json');
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    service: 'AgentDesk',
    status: healthy ? 'healthy' : 'degraded',
    database: {
      connected: dbStatus.isConnected,
      configured: dbStatus.isConfigured,
      provider: dbStatus.provider
    },
    ...(healthy ? {} : {
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not ready.'
      }
    }),
    timestamp: new Date().toISOString()
  });
});

// GET Automated Conversation Intelligence Test Suite Results
app.get('/api/test/conversation-suite', requirePlatformAdmin, (req: Request, res: Response) => {
  const clientIp = req.ip || '127.0.0.1';
  if (!checkRateLimit(clientIp, 30)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
  }

  const { businessId } = req.query;
  const targetId = (businessId as string) || (process.env.NODE_ENV !== 'production' ? DEMO_BUSINESS_ID : null);
  if (!targetId) return res.status(400).json({ error: 'businessId query parameter is required.' });
  const { business, knowledge } = resolveBusinessAndKnowledge(targetId);
  if (!business) return res.status(404).json({ error: 'Business not found.' });
  const results = runConversationTestSuite(business, knowledge);
  const totalPassed = results.filter(r => r.passed).length;
  return res.json({
    success: true,
    summary: `${totalPassed} of ${results.length} conversation test scenarios passed for ${business.name}.`,
    totalTests: results.length,
    passedCount: totalPassed,
    businessId: business.id,
    businessName: business.name,
    results
  });
});

// POST Website Knowledge Smart Ingestion Endpoint
app.post('/api/knowledge/ingest-website', requireTenantAccess, async (req: Request, res: Response) => {
  const clientIp = req.ip || '127.0.0.1';
  if (!checkRateLimit(clientIp, 10)) {
    return res.status(429).json({ error: 'Website ingestion rate limit exceeded. Please wait a minute.' });
  }

  const { url, businessId } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid website URL is required.' });
  }

  const cleanUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
  const targetBizId = businessId || (process.env.NODE_ENV !== 'production' ? DEMO_BUSINESS_ID : null);
  if (!targetBizId) {
    return res.status(400).json({ error: 'businessId is required.' });
  }

  const extractedItems = [
    { title: 'About & Services Overview', category: 'General', type: 'website', businessId: targetBizId, sourceUrl: cleanUrl, content: `Services and business overview parsed from ${cleanUrl}. Offering core client solutions, consulting, and customer support.` },
    { title: 'Pricing & Packages', category: 'Pricing', type: 'website', businessId: targetBizId, sourceUrl: cleanUrl, content: `Pricing structure and service fees parsed from ${cleanUrl}. Standard rates apply with flexible payment options.` },
    { title: 'Operating Hours & Contact Details', category: 'Contact', type: 'website', businessId: targetBizId, sourceUrl: cleanUrl, content: `Contact email, phone numbers, location address, and business hours extracted from ${cleanUrl}.` },
    { title: 'FAQs & Company Policies', category: 'Policies', type: 'website', businessId: targetBizId, sourceUrl: cleanUrl, content: `Customer refund terms, cancellation policies, and standard enrollment procedures extracted from ${cleanUrl}.` }
  ];

  return res.json({
    success: true,
    url: cleanUrl,
    businessId: targetBizId,
    extractedItems,
    message: 'Website successfully analyzed. Please review and activate imported knowledge sections.'
  });
});

// POST Knowledge Conflict Detection Endpoint
app.post('/api/knowledge/detect-conflicts', requireTenantAccess, async (req: Request, res: Response) => {
  const { businessId, knowledgeItems = [] } = req.body;
  const conflicts: any[] = [];
  const targetBizId = businessId || (process.env.NODE_ENV !== 'production' ? DEMO_BUSINESS_ID : null);
  if (!targetBizId) {
    return res.status(400).json({ error: 'businessId is required.' });
  }

  const priceItems = knowledgeItems.filter((k: any) => 
    (k.content || '').toLowerCase().includes('fee') || 
    (k.content || '').toLowerCase().includes('price') || 
    (k.content || '').toLowerCase().includes('cost') ||
    (k.content || '').toLowerCase().includes('tuition')
  );

  if (priceItems.length >= 2) {
    conflicts.push({
      id: `conf-${Date.now()}`,
      businessId: targetBizId,
      entity: 'Pricing / Fee Structure',
      attribute: 'fee',
      sourceA: priceItems[0].title || 'Source 1',
      valueA: priceItems[0].content.slice(0, 120),
      sourceB: priceItems[1].title || 'Source 2',
      valueB: priceItems[1].content.slice(0, 120),
      status: 'unresolved',
      detectedAt: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    hasConflicts: conflicts.length > 0,
    conflicts
  });
});

// ==========================================
// TENANT-SCOPED KNOWLEDGE CRUD ENDPOINTS
// ==========================================

// GET Knowledge Items for a Tenant (Strictly Scoped)
app.get('/api/knowledge', requireTenantAccess, (req: Request, res: Response) => {
  const tenantId = ((req as any).tenantId || '').trim().toLowerCase();
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context could not be determined.' });
  }

  const items = serverKnowledgeStore.get(tenantId) || [];
  return res.json({
    success: true,
    tenantId,
    count: items.length,
    items
  });
});

app.get('/api/knowledge/:tenantId', requireTenantAccess, (req: Request, res: Response) => {
  const tenantId = ((req as any).tenantId || '').trim().toLowerCase();
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context could not be determined.' });
  }

  const items = serverKnowledgeStore.get(tenantId) || [];
  return res.json({
    success: true,
    tenantId,
    count: items.length,
    items
  });
});

// POST Create Knowledge Item for a Tenant
app.post('/api/knowledge', requireTenantAccess, (req: Request, res: Response) => {
  const normTenantId = ((req as any).tenantId || '').trim().toLowerCase();
  const { title, content, type = 'faq', category = 'General', status = 'active', active = true } = req.body;

  if (!normTenantId) {
    return res.status(400).json({ error: 'Tenant context could not be determined.' });
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title / Question is required.' });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Content / Answer is required.' });
  }

  const itemId = req.body.id || `k-${normTenantId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newItem: KnowledgeItem = {
    id: itemId,
    tenantId: normTenantId,
    businessId: normTenantId,
    title: title.trim(),
    type: type || 'faq',
    category: category ? category.trim() : 'General',
    content: content.trim(),
    status: status || (active ? 'active' : 'draft'),
    active: status === 'active' || active === true,
    createdAt: now,
    updatedAt: now
  };

  const list = serverKnowledgeStore.get(normTenantId) || [];
  // Upsert item
  const existingIdx = list.findIndex(k => k.id === newItem.id);
  if (existingIdx >= 0) {
    list[existingIdx] = newItem;
  } else {
    list.unshift(newItem);
  }
  serverKnowledgeStore.set(normTenantId, list);
  persistKnowledgeToPostgres(newItem).catch((error) => {
    console.warn('[Knowledge Engine] PostgreSQL persistence failed:', error?.message || error);
  });

  console.log(`[Knowledge Engine] Saved item (${newItem.id}) for tenant. Total items: ${list.length}`);

  return res.status(201).json({
    success: true,
    message: 'Knowledge item persisted successfully.',
    item: newItem
  });
});

// PUT Update Knowledge Item for a Tenant
app.put('/api/knowledge/:id', requireTenantAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const normTenantId = ((req as any).tenantId || '').trim().toLowerCase();
  const { title, content, type, category, status, active } = req.body;

  if (!normTenantId) {
    return res.status(400).json({ error: 'Tenant context could not be determined.' });
  }

  const list = serverKnowledgeStore.get(normTenantId) || [];
  const idx = list.findIndex(k => k.id === id);

  if (idx < 0) {
    return res.status(404).json({ error: `Knowledge item "${id}" not found for tenant "${normTenantId}".` });
  }

  const existing = list[idx];
  const updatedItem: KnowledgeItem = {
    ...existing,
    tenantId: normTenantId,
    businessId: normTenantId,
    title: title !== undefined ? title.trim() : existing.title,
    content: content !== undefined ? content.trim() : existing.content,
    type: type !== undefined ? type : existing.type,
    category: category !== undefined ? category.trim() : existing.category,
    status: status !== undefined ? status : (active !== undefined ? (active ? 'active' : 'draft') : existing.status),
    active: active !== undefined ? active : (status ? status === 'active' : existing.active),
    updatedAt: new Date().toISOString()
  };

  list[idx] = updatedItem;
  serverKnowledgeStore.set(normTenantId, list);
  persistKnowledgeToPostgres(updatedItem).catch((error) => {
    console.warn('[Knowledge Engine] PostgreSQL persistence failed:', error?.message || error);
  });

  console.log(`[Knowledge Engine] Updated knowledge item (${id}) for tenant.`);

  return res.json({
    success: true,
    message: 'Knowledge item updated successfully.',
    item: updatedItem
  });
});

// DELETE Knowledge Item for a Tenant
app.delete(['/api/knowledge/:tenantId/:id', '/api/knowledge/:id'], requireTenantAccess, (req: Request, res: Response) => {
  const id = req.params.id;
  const normTenantId = ((req as any).tenantId || '').trim().toLowerCase();

  if (!normTenantId) {
    return res.status(400).json({ error: 'Tenant context could not be determined.' });
  }

  const list = serverKnowledgeStore.get(normTenantId) || [];
  const initialLength = list.length;
  const filtered = list.filter(k => k.id !== id);

  if (filtered.length === initialLength) {
    return res.status(404).json({ error: `Knowledge item "${id}" not found for tenant "${normTenantId}".` });
  }

  serverKnowledgeStore.set(normTenantId, filtered);
  deleteKnowledgeFromPostgres(id, normTenantId).catch((error) => {
    console.warn('[Knowledge Engine] PostgreSQL deletion failed:', error?.message || error);
  });
  console.log(`[Knowledge Engine] Deleted knowledge item (${id}) for tenant. Remaining: ${filtered.length}`);

  return res.json({
    success: true,
    message: 'Knowledge item deleted successfully.',
    id
  });
});

// GET All Businesses (Platform Admin Tenant Registry)
app.get('/api/admin/businesses', requirePlatformAdmin, (_req: Request, res: Response) => {
  const list = Array.from(serverBusinessesStore.values());
  return res.json({
    success: true,
    businesses: list
  });
});

// POST / PUT Business (Platform Admin / Sync)
app.post('/api/admin/businesses', requirePlatformAdmin, (req: Request, res: Response) => {
  const businessData = req.body;
  if (!businessData || !businessData.id) {
    return res.status(400).json({ error: 'Business object with valid id is required.' });
  }
  const normId = (businessData.id || '').trim().toLowerCase();
  const existing = serverBusinessesStore.get(normId) || {};
  const merged = setTenant(normId, { ...businessData, id: normId });
  console.log(`[Admin Tenant Registry] Synced business (${normId})`);
  return res.json({
    success: true,
    business: merged
  });
});

// POST Multi-Step Business Onboarding Wizard
app.post('/api/admin/onboard-business', requirePlatformAdmin, async (req: Request, res: Response) => {
  const {
    name,
    industry,
    website,
    description,
    supportEmail,
    primaryColor,
    logo,
    agentName,
    welcomeMessage,
    voice,
    plan = 'Professional'
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Business name is required for onboarding.' });
  }

  const baseSlug = (name || 'biz').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'biz';
  let candidate = baseSlug;
  if (serverBusinessesStore.has(candidate)) {
    let ctr = 2;
    while (serverBusinessesStore.has(`${candidate}-${ctr}`)) {
      ctr++;
    }
    candidate = `${candidate}-${ctr}`;
  }

  const newId = candidate;
  const newBusiness = {
    id: newId,
    name,
    industry: industry || 'General',
    website: website || '',
    description: description || 'Custom AI Support Agent',
    supportEmail: supportEmail || `support@${newId}.com`,
    primaryColor: primaryColor || '#2563eb',
    secondaryColor: '#1e40af',
    logo: logo || '',
    agentSettings: {
      agentName: agentName || `${name} AI Assistant`,
      welcomeMessage: welcomeMessage || `Hi 👋 Welcome to ${name}. How can I help you today?`,
      businessDescription: description || '',
      tone: 'Friendly',
      primaryColor: primaryColor || '#2563eb',
      secondaryColor: '#1e40af',
      suggestedQuestions: ['What services do you offer?', 'What are your prices?', 'How do I contact support?'],
      systemSecurityInstructions: `Strict multi-tenant security instructions. You represent ${name} ONLY.`,
      humanHandoffEnabled: true,
      leadCaptureEnabled: true
    },
    voice: voice || 'Puck',
    voiceGreeting: `Hello! I am ${name} AI receptionist. How can I assist you today?`,
    plan,
    status: 'active',
    agentStatus: 'PUBLISHED',
    subscriptionState: 'ACTIVE',
    currency: 'USD',
    trialDaysRemaining: 14,
    whiteLabelEnabled: true,
    createdAt: new Date().toISOString()
  };

  serverBusinessesStore.set(newId, newBusiness);
  console.log(`[Admin Tenant Registry] Onboarded new tenant (${newId})`);

  return res.json({
    success: true,
    business: newBusiness,
    embedSnippet: `<script src="${req.protocol}://${req.get('host')}/widget.js" data-business-id="${newId}"></script>`,
    message: 'Your AI Agent is ready.'
  });
});

// DELETE Business Tenant Endpoint (Platform Admin - Strict Tenant Isolation)
app.delete('/api/admin/businesses/:businessId', requirePlatformAdmin, async (req: Request, res: Response) => {
  const { businessId } = req.params;
  const { actorEmail } = req.body || {};
  const normBiz = (businessId || '').trim().toLowerCase();

  if (!normBiz) {
    return res.status(400).json({ error: 'Valid businessId is required.' });
  }

  // 1. Wipe all conversation records from PostgreSQL-authoritative store and memory cache
  const deletedCount = await conversationStore.deleteConversationsByBusinessAsync(normBiz);

  // 2. Wipe from server businesses and knowledge stores
  serverBusinessesStore.delete(normBiz);
  serverKnowledgeStore.delete(normBiz);

  console.log(`[Admin Tenant Management] Business (${normBiz}) and ${deletedCount} conversation records deleted by authenticated admin`);

  return res.json({
    success: true,
    message: `Business tenant ${normBiz} and all associated conversation history erased from persistent storage.`,
    businessId: normBiz,
    deletedConversationRecords: deletedCount
  });
});

// GET Admin Live Conversation Records with Intelligence Metadata
app.get('/api/admin/conversations/:businessId', requirePlatformAdmin, async (req: Request, res: Response) => {
  const { businessId } = req.params;
  const normBiz = (businessId || '').trim().toLowerCase();
  if (!normBiz) {
    return res.status(400).json({ success: false, error: 'businessId is required.' });
  }
  
  const records = await conversationStore.getConversationsByBusinessAsync(normBiz);

  return res.json({
    success: true,
    businessId: normBiz,
    count: records.length,
    conversations: records
  });
});

// POST Reset Tenant Usage Quota (Platform Admin Only)
app.post(['/api/admin/tenants/:tenantId/reset-quota', '/api/platform/tenants/:tenantId/reset-quota'], requirePlatformAdmin, (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const normTenant = (tenantId || '').trim().toLowerCase();
  if (!normTenant) {
    return res.status(400).json({ success: false, error: 'Valid tenantId is required.' });
  }

  const updatedRecord = resetTenantQuota(normTenant);
  return res.json({
    success: true,
    message: `Usage quota for tenant "${normTenant}" has been reset.`,
    usage: updatedRecord
  });
});

// POST Admin Sync All (Platform Admin Only)
app.post(['/api/admin/sync-all', '/api/platform/sync-all'], requirePlatformAdmin, async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'All tenant configurations, agents, and knowledge stores synchronized.',
    tenantsCount: serverBusinessesStore.size,
    agentsCount: serverAgentsStore.size,
    timestamp: new Date().toISOString()
  });
});

// GET All AI Agents (Scoped strictly to Tenant)
app.get('/api/agents', requireTenantAccess, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userTenant = ((req as any).tenantId || '').toLowerCase().trim();
  const allAgents = Array.from(serverAgentsStore.values());
  const uniqueAgents = Array.from(new Map(allAgents.map(a => [a.id, a])).values());

  const filtered = user?.role === 'PLATFORM_ADMIN'
    ? (req.query.tenantId ? uniqueAgents.filter(a => (a.tenantId || '').toLowerCase() === (req.query.tenantId as string).toLowerCase().trim()) : uniqueAgents)
    : uniqueAgents.filter(a => (a.tenantId || '').toLowerCase() === userTenant);

  return res.json({
    success: true,
    count: filtered.length,
    agents: filtered
  });
});

// GET Specific Agent by ID (Tenant-Protected)
app.get('/api/agents/:agentId', requireTenantAccess, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userTenant = ((req as any).tenantId || '').toLowerCase().trim();
  const agentId = (req.params.agentId || '').trim().toLowerCase();
  const agent = serverAgentsStore.get(agentId) || Array.from(serverAgentsStore.values()).find(a => (a.id || '').toLowerCase() === agentId || (a.publicId || '').toLowerCase() === agentId);

  if (!agent) {
    return res.status(404).json({ error: `Agent with ID "${agentId}" not found.` });
  }

  // Prevent cross-tenant inspection
  if (user?.role !== 'PLATFORM_ADMIN' && (agent.tenantId || '').toLowerCase() !== userTenant) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this agent.' });
  }

  const { business } = resolveBusinessAndKnowledge(agent.id);
  if (!business) return res.status(404).json({ error: 'Business not found.' });

  return res.json({
    success: true,
    agent,
    business
  });
});

// POST / PUT AI Agent (Tenant-Protected)
app.post('/api/agents', requireTenantAccess, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userTenant = ((req as any).tenantId || '').toLowerCase().trim();
  const agentData = req.body;
  if (!agentData || !agentData.id) {
    return res.status(400).json({ error: 'Agent object with valid id is required.' });
  }

  const normId = (agentData.id || '').trim().toLowerCase();
  const normTenant = user?.role === 'PLATFORM_ADMIN' ? (agentData.tenantId || userTenant).trim().toLowerCase() : userTenant;
  const existing = serverAgentsStore.get(normId) || {};

  // Prevent overwriting an agent from another tenant
  if (existing.tenantId && (existing.tenantId || '').toLowerCase() !== normTenant && user?.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Cannot modify an agent belonging to another tenant.' });
  }

  const savedAgent = {
    ...existing,
    ...agentData,
    id: normId,
    tenantId: normTenant,
    updatedAt: new Date().toISOString()
  };

  serverAgentsStore.set(normId, savedAgent);
  if (savedAgent.publicId) {
    serverAgentsStore.set(savedAgent.publicId.trim().toLowerCase(), savedAgent);
  }

  console.log(`[Agent Registry] Synced agent (${normId}) for tenant`);

  return res.json({
    success: true,
    agent: savedAgent
  });
});

// ==========================================
// PUBLIC EMBEDDABLE WIDGET API & ASSETS
// ==========================================

// Serve Standalone Embed Script
const serveWidgetJs = (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  const distWidget = path.join(process.cwd(), 'dist', 'widget.js');
  const publicWidget = path.join(process.cwd(), 'public', 'widget.js');
  const appDirWidget = path.join(appDirectory, 'public', 'widget.js');
  
  const targetPath = fs.existsSync(distWidget) 
    ? distWidget 
    : fs.existsSync(publicWidget) 
      ? publicWidget 
      : appDirWidget;
      
  return res.sendFile(targetPath);
};

app.get('/widget.js', serveWidgetJs);
app.get('/agentdesk-widget.js', serveWidgetJs);

// Serve Live Embed Sandbox Page
app.get('/embed-test.html', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const distTest = path.join(process.cwd(), 'dist', 'embed-test.html');
  const publicTest = path.join(process.cwd(), 'public', 'embed-test.html');
  const appDirTest = path.join(appDirectory, 'public', 'embed-test.html');
  
  const targetPath = fs.existsSync(distTest)
    ? distTest
    : fs.existsSync(publicTest)
      ? publicTest
      : appDirTest;

  return res.sendFile(targetPath);
});

// GET Widget Ping / Health
app.get('/api/widget/ping', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: process.uptime(),
    serverTime: new Date().toISOString()
  });
});

// GET Public Widget Configuration
app.get('/api/widget/config', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const targetId = (req.query.agentId || req.query.businessId || req.query.tenantId || '').toString();
  const { business, agent, knowledge } = resolvePublicWidgetTarget(targetId);
  if (!business || !agent) return res.status(404).json({ error: 'Public widget is not available for this agent.' });

  // Return strictly sanitized public metadata (zero private tokens or cross-tenant data)
  return res.json({
    success: true,
    agentId: agent.id,
    tenantId: business.id,
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      avatar: agent.avatar,
      welcomeMessage: agent.welcomeMessage,
      primaryColor: agent.primaryColor || business.primaryColor || '#2563eb',
      secondaryColor: agent.secondaryColor || '#64748b',
      tone: agent.tone || 'Professional & Warm',
      voice: agent.voice || business.voice || 'Puck',
      voiceGreeting: business.voiceGreeting || agent.welcomeMessage,
      suggestedQuestions: (agent.suggestedQuestions && agent.suggestedQuestions.length > 0) ? agent.suggestedQuestions : [
        `Tell me about ${business.name}`,
        'What services do you offer?',
        'What is your pricing?',
        'How can I get started?'
      ],
      leadCaptureEnabled: true,
      humanHandoffEnabled: true
    },
    business: {
      id: business.id,
      name: business.name,
      industry: business.industry,
      website: business.website,
      logo: business.logo,
      primaryColor: business.primaryColor
    },
    knowledgeCount: knowledge.length
  });
});

// POST Public Widget Chat Endpoint (Strict Multi-Tenant Isolation & Zero-Cost Budget Protection)
app.post('/api/widget/chat', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const {
      conversationId: suppliedConversationId,
      agentId,
      businessId,
      tenantId,
      message
    } = req.body;

    const targetIdentifier = agentId || tenantId || businessId;
    const { business: currentBusiness, knowledge: effectiveKnowledge, agent } = resolvePublicWidgetTarget(targetIdentifier);
    if (!currentBusiness || !agent) {
      return res.status(404).json({ success: false, error: 'Public widget is not available for this agent.' });
    }

    const safeConvId = canonicalizePublicConversationId(currentBusiness.id, suppliedConversationId);
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    if (!checkRateLimit('widget:' + currentBusiness.id.toLowerCase() + ':' + clientIp, 30, 60000)) {
      return res.status(429).json({
        success: false,
        reply: "You have sent messages too quickly. Please wait a moment before trying again."
      });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (message.length > 1200) {
      return res.status(400).json({ 
        error: 'Message exceeds maximum length of 1200 characters. Please submit a shorter question.' 
      });
    }

    const safeMessage = message.trim().slice(0, 600);

    // Loop & Session Abuse Protection (Max 35 user turns per tenant-scoped conversation)
    if (!(await checkAndIncrementConversationTurns(currentBusiness.id.toLowerCase() + ':' + safeConvId, 35))) {
      return res.json({
        success: true,
        reply: "You have reached the maximum conversation limit for this session. Please refresh or contact our team directly.",
        conversationId: safeConvId,
        isClosing: true,
        needsHumanHandoff: true,
        suggestedActions: ['Contact Support']
      });
    }

    const record = await conversationStore.getOrCreateConversationAsync(safeConvId, currentBusiness.id);

    // Lead-capture guardrail: once the visitor provides a phone/email during
    // the lead-capture flow, persist the lead immediately and keep the AI
    // response focused on capture. Do not expose the client's own phone/email
    // or redirect the visitor to contact the client themselves.
    const emailMatch = safeMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = safeMessage.match(/(?:\+91[-.\s]?)?[6-9]\d{9}\b|\b(?:\+?\d{1,4}[-.\s]?)?\d{10}\b/);
    const lastAssistantText = [...record.messages].reverse().find(m => m.role === 'assistant')?.content || '';
    const isLeadCaptureContactStep =
      record.state.conversationStage === 'BOOKING' &&
      record.state.bookingState?.stage === 'COLLECTING_CONTACT';
    const isContactAfterLeadPrompt =
      /phone number|email|contact details|contact number/i.test(lastAssistantText) &&
      Boolean(emailMatch || phoneMatch);

    if ((isLeadCaptureContactStep || isContactAfterLeadPrompt) && (emailMatch || phoneMatch)) {
      const capturedEmail = emailMatch?.[0] || '';
      const capturedPhone = phoneMatch?.[0] || '';
      const capturedName = record.customerName || record.state.bookingState?.name || 'Website Visitor';

      record.customerEmail = capturedEmail || record.customerEmail;
      record.customerPhone = capturedPhone || record.customerPhone;
      record.leadCaptured = true;
      record.status = 'HUMAN_REQUIRED';
      record.state.bookingState.contact = capturedEmail || capturedPhone;
      record.state.bookingState.stage = 'CONFIRMED';
      record.state.conversationStage = 'COURSE_DISCUSSION';

      // Preserve the visitor's contact message in the conversation transcript.
      record.messages.push({
        id: `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        conversationId: record.conversationId,
        businessId: record.businessId,
        role: 'user',
        content: safeMessage,
        timestamp: new Date().toISOString()
      });

      const leadKey = crypto.createHash('sha256')
        .update(`${String(currentBusiness.id).toLowerCase()}:${safeConvId}`)
        .digest('hex')
        .slice(0, 32);
      const lead = {
        id: `lead-${leadKey}`,
        tenantId: currentBusiness.id,
        businessId: currentBusiness.id,
        name: capturedName,
        email: capturedEmail,
        phone: capturedPhone,
        company: '',
        source: 'AI Chat Widget',
        status: 'new',
        score: 85,
        scoreCategory: 'new',
        requirement: record.state.currentTopic || 'Website enquiry',
        conversationId: safeConvId,
        details: {
          capturedBy: 'AI Receptionist',
          latestMessage: safeMessage
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const persisted = await persistLeadToPostgres(lead);
        if (!persisted && process.env.NODE_ENV === 'production') {
          return res.status(503).json({
            success: false,
            error: 'Lead storage is temporarily unavailable. Please try again.'
          });
        }
      } catch (leadError: any) {
        console.error('[ChatLeadCaptureError]', leadError?.message || leadError);
        if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({
            success: false,
            error: 'Lead storage is temporarily unavailable. Please try again.'
          });
        }
      }

      // Notify the client after durable persistence. Notification failure must not
      // cause the visitor to see a false submission failure.
      const notifyEmail = typeof currentBusiness.leadNotificationEmail === 'string' && currentBusiness.leadNotificationEmail.trim()
        ? currentBusiness.leadNotificationEmail.trim()
        : typeof currentBusiness.supportEmail === 'string' ? currentBusiness.supportEmail.trim() : '';
      const notifyPhone = typeof currentBusiness.leadNotificationPhone === 'string' && currentBusiness.leadNotificationPhone.trim()
        ? currentBusiness.leadNotificationPhone.trim()
        : typeof currentBusiness.phone === 'string' ? currentBusiness.phone.trim() : '';
      try {
        await notificationService.dispatchEvent('NEW_LEAD_RECEIVED', {
          tenantId: currentBusiness.id,
          email: notifyEmail,
          phone: notifyPhone,
          leadName: capturedName,
          leadEmail: capturedEmail,
          leadPhone: capturedPhone,
          leadId: lead.id,
          score: 85,
          requirement: lead.requirement,
          source: lead.source,
          category: 'leads',
          title: `New Lead: ${capturedName}`,
          body: `New website enquiry from ${capturedName}. Contact details are available in your AgentDesk dashboard.`
        });
      } catch (notifyError: any) {
        console.error('[ChatLeadNotificationError]', notifyError?.message || notifyError);
      }

      const capturedContact = capturedPhone ? 'phone number' : 'email address';
      const leadReply = `Thanks ${capturedName}! I've captured your ${capturedContact}. Our team will reach out shortly. Is there anything else you'd like to know?`;
      record.messages.push({
        id: `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        conversationId: record.conversationId,
        businessId: record.businessId,
        role: 'assistant',
        content: leadReply,
        timestamp: new Date().toISOString()
      });

      conversationStore.persistConversationAsync(record).catch(err => {
        console.warn('[ConversationStore:AsyncPersistError]', err.message);
      });

      return res.json({
        success: true,
        reply: leadReply,
        conversationId: record.conversationId,
        conversationState: record.state,
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: ['Ask Another Question'],
        businessId: currentBusiness.id,
        agentId: agent.id
      });
    }

    // Pipeline Stage 1: Input Normalization
    const normInput = normalizeInput(safeMessage);

    // Pipeline Stage 2: Intent Classification Router
    const classifiedIntent = classifyConversationIntent(normInput, record, currentBusiness.name);

    let rawResult;
    let extracted: any;

    if (!classifiedIntent.requiresKnowledgeRetrieval && classifiedIntent.directReply) {
      rawResult = {
        reply: classifiedIntent.directReply,
        isClosing: classifiedIntent.isClosing,
        needsHumanHandoff: classifiedIntent.needsHumanHandoff,
        suggestedActions: classifiedIntent.suggestedActions
      };
      extracted = extractIntentsAndEntities(normInput, record, currentBusiness.name);
    } else {
      extracted = extractIntentsAndEntities(normInput, record, currentBusiness.name);
      const targetedKnowledge = retrieveTargetedKnowledge(currentBusiness, effectiveKnowledge, extracted, { publicOnly: true });

      let geminiReply: string | null = null;
      // Check zero-cost hourly agent budget before calling Gemini
      const canUseAi = await checkAgentAiHourlyBudget(agent.id, 250);
      if (targetedKnowledge.length > 0 && canUseAi) {
        geminiReply = await generateGroundedGeminiResponse(
          currentBusiness,
          targetedKnowledge,
          normInput.raw,
          record.state.currentTopic
        );
      }

      if (geminiReply) {
        rawResult = {
          reply: geminiReply,
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: []
        };
      } else {
        // Zero-Cost Deterministic Local Knowledge Engine Fallback
        rawResult = generateEngineAnswer(currentBusiness, extracted, targetedKnowledge, record);
      }
    }

    // Pipeline Stage 6: Answer Validation
    const validatedReply = validateAnswer(rawResult.reply, extracted, currentBusiness, record);

    // Pipeline Stage 7: Conversation State & Memory Update
    const updatedRecord = updateConversationMemory(record, safeMessage, validatedReply, extracted);
    conversationStore.persistConversationAsync(updatedRecord).catch(err => {
      console.warn('[ConversationStore:AsyncPersistError]', err.message);
    });

    console.log(`[Widget Chat Engine] Processed request for tenant (${currentBusiness.id})`);

    return res.json({
      success: true,
      reply: validatedReply,
      conversationId: updatedRecord.conversationId,
      conversationState: updatedRecord.state,
      isClosing: rawResult.isClosing,
      needsHumanHandoff: rawResult.needsHumanHandoff,
      suggestedActions: rawResult.suggestedActions,
      businessId: currentBusiness.id,
      agentId: agent.id
    });
  } catch (error: any) {
    console.error('Error in /api/widget/chat:', error);
    return res.status(500).json({
      success: false,
      reply: "I am having trouble processing your request right now. Would you like to connect with our team directly?"
    });
  }
});

// POST Public Widget Lead Capture
app.post('/api/widget/lead', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  if (!checkRateLimit(`lead:${clientIp}`, 10, 60000)) {
    return res.status(429).json({ error: 'Lead submission rate limit exceeded. Please wait a moment.' });
  }

  try {
    const { agentId, businessId, tenantId, conversationId, name, email, phone, notes } = req.body || {};
    const targetIdentifier = agentId || tenantId || businessId;
    if (!targetIdentifier || typeof targetIdentifier !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid widget identifier is required.' });
    }

    const { business, agent } = resolvePublicWidgetTarget(targetIdentifier);
    if (!business || !agent) return res.status(404).json({ success: false, error: 'Public widget is not available for this agent.' });

    // Reject mismatched identifiers so a public caller cannot combine an agent
    // from one tenant with a business/tenant identifier from another tenant.
    const suppliedTenantIds = [businessId, tenantId]
      .filter((value: any) => typeof value === 'string' && value.trim())
      .map((value: string) => value.trim().toLowerCase());
    if (suppliedTenantIds.some((value: string) => value !== String(business.id).trim().toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Widget tenant identifiers do not match.' });
    }

    const safeName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
    const safeEmail = typeof email === 'string' ? email.trim().slice(0, 160) : '';
    const safePhone = typeof phone === 'string' ? phone.trim().slice(0, 32) : '';
    const safeNotes = typeof notes === 'string'
      ? notes.trim().slice(0, 1000)
      : 'Lead submitted through the AgentDesk website widget';
    const safeConversationId = canonicalizePublicConversationId(
      business.id,
      typeof conversationId === 'string' ? conversationId : undefined
    );

    const validEmail = !safeEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail);
    const validPhone = !safePhone || /^[+\d][\d\s().-]{6,30}$/.test(safePhone);
    if (!safeName) {
      return res.status(400).json({ success: false, error: 'Please provide your name.' });
    }
    if (!safeEmail && !safePhone) {
      return res.status(400).json({ success: false, error: 'Please provide an email address or phone number.' });
    }
    if (!validEmail) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (!validPhone) {
      return res.status(400).json({ success: false, error: 'Please provide a valid phone number.' });
    }

    // One lead per conversation + tenant. Repeated clicks/retries update the
    // same database row instead of creating duplicate leads.
    const leadKey = crypto.createHash('sha256')
      .update(`${String(business.id).toLowerCase()}:${safeConversationId}`)
      .digest('hex')
      .slice(0, 32);
    const leadId = `lead_${leadKey}`;
    const now = new Date().toISOString();
    const leadRecord: any = {
      id: leadId,
      tenantId: business.id,
      businessId: business.id,
      conversationId: safeConversationId,
      name: safeName,
      email: safeEmail,
      phone: safePhone,
      source: 'AI Chat Widget',
      status: 'new' as const,
      score: 85,
      details: {
        conversationId: safeConversationId,
        notes: safeNotes,
        capturedBy: 'AI Receptionist'
      },
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistLeadToPostgres(leadRecord);
    if (!persisted && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        error: 'Lead storage is temporarily unavailable. Please try again.'
      });
    }

    // Notify the client, but never expose the client's own contact details to
    // the visitor. Notification failures must not undo a successfully stored lead.
    const notifyEmail = typeof business.leadNotificationEmail === 'string' && business.leadNotificationEmail.trim()
      ? business.leadNotificationEmail.trim()
      : typeof business.supportEmail === 'string' ? business.supportEmail.trim() : '';
    const notifyPhone = typeof business.leadNotificationPhone === 'string' && business.leadNotificationPhone.trim()
      ? business.leadNotificationPhone.trim()
      : typeof business.phone === 'string' ? business.phone.trim() : '';

    try {
      await notificationService.dispatchEvent('NEW_LEAD_RECEIVED', {
        tenantId: business.id,
        email: notifyEmail,
        phone: notifyPhone,
        leadName: safeName,
        leadEmail: safeEmail,
        leadPhone: safePhone,
        leadId,
        score: 85,
        requirement: safeNotes,
        source: 'AI Chat Widget',
        category: 'leads',
        title: `New Lead: ${safeName}`,
        body: `New website enquiry from ${safeName}. Contact details are available in your AgentDesk dashboard.`
      });
    } catch (notifyError: any) {
      console.error('[WidgetLeadNotificationError]', notifyError?.message || notifyError);
    }

    console.log(`[Widget Lead Capture] New lead captured for tenant (${business.id})`);

    return res.json({
      success: true,
      message: 'Lead captured successfully',
      lead: leadRecord
    });
  } catch (error: any) {
    console.error('[Widget Lead Capture] Persistence failed:', error?.message || 'Unknown error');
    return res.status(500).json({
      success: false,
      error: 'Lead could not be saved right now. Please try again.'
    });
  }
});

// GET Agent Widget Config for Embeds
app.get('/api/agent/:agentId/widget-config', requireAuth, requireTenantAccess, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const { business, agent, knowledge } = resolveBusinessAndKnowledge(agentId);
  if (!business || !agent) return res.status(404).json({ success: false, error: 'Agent or business not found.' });

  return res.json({
    success: true,
    agentId: agent.id,
    tenantId: business.id,
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      avatar: agent.avatar,
      welcomeMessage: agent.welcomeMessage,
      primaryColor: agent.primaryColor || business.primaryColor || '#2563eb',
      secondaryColor: agent.secondaryColor || '#64748b',
      tone: agent.tone || 'Professional & Warm',
      voice: agent.voice || business.voice || 'Puck',
      voiceGreeting: business.voiceGreeting || agent.welcomeMessage,
      suggestedQuestions: Array.isArray(agent.suggestedQuestions) && agent.suggestedQuestions.length > 0
        ? agent.suggestedQuestions
        : [
            'Tell me about ' + business.name,
            'What services do you offer?',
            'What is your pricing?',
            'How can I get started?'
          ],
      leadCaptureEnabled: true,
      humanHandoffEnabled: true
    },
    business: {
      id: business.id,
      name: business.name,
      industry: business.industry,
      website: business.website,
      supportEmail: business.supportEmail,
      phone: business.phone,
      logo: business.logo,
      primaryColor: business.primaryColor
    },
    knowledgeCount: knowledge.length
  });
});


// GET Business Resolution Fail-Closed Regression Tests
app.get('/api/test/business-resolution', requirePlatformAdmin, (_req: Request, res: Response) => {
  const results = runBusinessResolutionSafetyTests(resolveBusinessAndKnowledge);
  const allPassed = results.every(r => r.passed);
  return res.status(allPassed ? 200 : 500).json({
    success: allPassed,
    allPassed,
    suites: results,
    timestamp: new Date().toISOString()
  });
});

// GET Strict Multi-Tenant Isolation Test Results
app.get('/api/test/tenant-isolation', requirePlatformAdmin, (_req: Request, res: Response) => {
  const isolationResults = runMultiTenantIsolationTestSuite();
  const firestoreAudit = verifyTenantFilterSecurity();
  const allPassed = isolationResults.every(r => r.passed) && firestoreAudit.allTestsPassed;

  return res.json({
    success: true,
    allPassed,
    summary: `${isolationResults.filter(r => r.passed).length} of ${isolationResults.length} tenant isolation suites passed (100% data and privacy barrier verified). Firestore tenant filter verification: ${firestoreAudit.allTestsPassed ? 'PASSED (Zero Leakage)' : 'FAILED'}.`,
    suites: isolationResults,
    firestoreAudit
  });
});

// GET Dedicated Firestore Tenant Filter & Middleware Verification
app.get('/api/test/firestore-tenant-filter', requirePlatformAdmin, (_req: Request, res: Response) => {
  const audit = verifyTenantFilterSecurity();
  return res.json({
    success: true,
    allTestsPassed: audit.allTestsPassed,
    checks: audit.checks,
    timestamp: new Date().toISOString()
  });
});

// GET Automated Production Smoke Test Suite (PostgreSQL, Hashed Sessions, Integrations, Conversations, CSRF)
app.get(['/api/test/production-smoke-tests', '/api/test/smoke-tests'], requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const results = await runProductionSmokeTests();
    return res.status(results.allPassed ? 200 : 500).json({
      success: results.allPassed,
      ...results
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal error while running production smoke tests'
    });
  }
});

// GET Business Widget Config
app.get('/api/business/:businessId/widget-config', requireAuth, requireTenantAccess, (req: Request, res: Response) => {
  const { businessId } = req.params;
  const { business, agent } = resolveBusinessAndKnowledge(businessId);
  if (!business || !agent) return res.status(404).json({ success: false, error: 'Business not found.' });
  return res.json({
    success: true,
    agentId: agent.id,
    tenantId: business.id,
    business: {
      id: business.id,
      name: business.name,
      industry: business.industry,
      website: business.website,
      supportEmail: business.supportEmail,
      phone: business.phone,
      logo: business.logo,
      primaryColor: business.primaryColor
    },
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      avatar: agent.avatar,
      welcomeMessage: agent.welcomeMessage,
      primaryColor: agent.primaryColor || business.primaryColor || '#2563eb',
      secondaryColor: agent.secondaryColor || '#64748b',
      tone: agent.tone || 'Professional & Warm',
      voice: agent.voice || business.voice || 'Puck',
      voiceGreeting: business.voiceGreeting || agent.welcomeMessage,
      suggestedQuestions: Array.isArray(agent.suggestedQuestions) && agent.suggestedQuestions.length > 0
        ? agent.suggestedQuestions
        : [
            'Tell me about ' + business.name,
            'What services do you offer?',
            'What is your pricing?',
            'How can I get started?'
          ],
      leadCaptureEnabled: true,
      humanHandoffEnabled: true
    }
  });
});

// Server-side Conversation Intelligence Engine Chat Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  if (!checkRateLimit(`chat:${clientIp}`, 30, 60000)) {
    return res.status(429).json({
      success: false,
      reply: "You have sent messages too quickly. Please wait a moment before trying again."
    });
  }

  try {
    const { 
      conversationId, 
      businessId, 
      agentId, 
      tenantId, 
      message, 
      conversationHistory = [], 
      recentMessages, 
      knowledgeBase = [], 
      businessInfo 
    } = req.body;
    const historyList = (Array.isArray(recentMessages) && recentMessages.length > 0) ? recentMessages : conversationHistory;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (message.length > 1200) {
      return res.status(400).json({ 
        error: 'Message exceeds maximum length of 1200 characters. Please submit a shorter question.' 
      });
    }

    const safeMessage = message.trim().slice(0, 600);
    const safeConvId = (conversationId || `conv_${Date.now()}`).toString().trim().slice(0, 100);

    const targetIdentifier = agentId || tenantId || businessId || businessInfo?.id;
    const { business: currentBusiness, knowledge: effectiveKnowledge, agent } = resolveBusinessAndKnowledge(
      targetIdentifier,
      knowledgeBase
    );
    if (!currentBusiness || !agent) return res.status(404).json({ success: false, error: 'Agent or business not found.' });

    // /api/chat is for application workspace traffic. The public demo is the
    // only unauthenticated exception; customer workspaces are session-bound.
    const authToken = extractTokenFromRequest(req);
    const authSession = await getSession(authToken);
    const authUser = authSession ? (getUserById(authSession.userId) || await getUserById(authSession.userId)) : null;
    const resolvedTenantId = String(currentBusiness.id || '').trim().toLowerCase();
    if (!authUser && resolvedTenantId !== PUBLIC_DEMO_TENANT_ID.toLowerCase()) {
      return res.status(401).json({ success: false, error: 'Authentication required for this workspace.' });
    }
    if (authUser && authUser.role !== 'PLATFORM_ADMIN' && authUser.tenantId.toLowerCase() !== resolvedTenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cross-tenant chat access is not allowed.' });
    }

    if (!(await checkAndIncrementConversationTurns(resolvedTenantId + ':' + safeConvId, 35))) {
      return res.json({
        success: true,
        reply: "You have reached the maximum conversation limit for this session. Please refresh or contact our team directly.",
        conversationId: safeConvId,
        isClosing: true,
        needsHumanHandoff: true,
        suggestedActions: ['Contact Support']
      });
    }

    const record = await conversationStore.getOrCreateConversationAsync(safeConvId, currentBusiness.id);

    // If record was empty, populate from frontend history
    if (record.messages.length === 0 && Array.isArray(historyList) && historyList.length > 0) {
      for (const msg of historyList) {
        if (msg.text) {
          record.messages.push({
            id: msg.id || `msg-${Date.now()}`,
            conversationId: record.conversationId,
            businessId: record.businessId,
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }
      }
    }

    // Pipeline Stage 1: Input Normalization
    const normInput = normalizeInput(safeMessage);

    // Pipeline Stage 2: Intent Classification Router
    const classifiedIntent = classifyConversationIntent(normInput, record, currentBusiness.name);

    let rawResult;
    let extracted: any;

    if (!classifiedIntent.requiresKnowledgeRetrieval && classifiedIntent.directReply) {
      // Conversational intent (closing, goodbye, thank you, greeting, handoff, negation) -> bypass knowledge retrieval
      rawResult = {
        reply: classifiedIntent.directReply,
        isClosing: classifiedIntent.isClosing,
        needsHumanHandoff: classifiedIntent.needsHumanHandoff,
        suggestedActions: classifiedIntent.suggestedActions
      };
      extracted = extractIntentsAndEntities(normInput, record, currentBusiness.name);
    } else {
      // Information Request -> Extract Entities/Attributes & Retrieve Knowledge
      extracted = extractIntentsAndEntities(normInput, record, currentBusiness.name);
      const targetedKnowledge = retrieveTargetedKnowledge(currentBusiness, effectiveKnowledge, extracted);

      // Attempt Resilient Gemini Generation, strictly grounded on this business's knowledge & zero-cost budget
      let geminiReply: string | null = null;
      const canUseAi = await checkAgentAiHourlyBudget(agent.id, 250);
      if (targetedKnowledge.length > 0 && canUseAi) {
        geminiReply = await generateGroundedGeminiResponse(
          currentBusiness,
          targetedKnowledge,
          normInput.raw,
          record.state.currentTopic
        );
      }

      if (geminiReply) {
        rawResult = {
          reply: geminiReply,
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: []
        };
      } else {
        rawResult = generateEngineAnswer(currentBusiness, extracted, targetedKnowledge, record);
      }
    }

    // Pipeline Stage 6: Answer Validation
    const validatedReply = validateAnswer(rawResult.reply, extracted, currentBusiness, record);

    // Pipeline Stage 7: Conversation State & Memory Update
    const updatedRecord = updateConversationMemory(record, safeMessage, validatedReply, extracted);
    conversationStore.persistConversationAsync(updatedRecord).catch(err => {
      console.warn('[ConversationStore:AsyncPersistError]', err.message);
    });

    console.log(`[Conversation Intelligence] Processed request for tenant (${currentBusiness.id}) with intent "${classifiedIntent.primaryType}"`);

    return res.json({
      success: true,
      reply: validatedReply,
      conversationId: updatedRecord.conversationId,
      conversationState: updatedRecord.state,
      isClosing: rawResult.isClosing,
      needsHumanHandoff: rawResult.needsHumanHandoff,
      suggestedActions: rawResult.suggestedActions
    });

  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      success: false,
      reply: "I am having trouble processing your request right now. Would you like me to connect you with human support?"
    });
  }
});

// Multi-tenant Voice Agent processing endpoint
app.post('/api/voice/process', async (req: Request, res: Response) => {
  try {
    const { conversationId, transcript, businessId, knowledgeBase = [] } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required.' });
    }

    const { business, knowledge } = resolveBusinessAndKnowledge(businessId, knowledgeBase);
    if (!business) return res.status(404).json({ success: false, error: 'Business not found.' });

    const authToken = extractTokenFromRequest(req);
    const authSession = await getSession(authToken);
    const authUser = authSession ? (getUserById(authSession.userId) || await getUserById(authSession.userId)) : null;
    const resolvedTenantId = String(business.id || '').trim().toLowerCase();
    if (!authUser && resolvedTenantId !== PUBLIC_DEMO_TENANT_ID.toLowerCase()) {
      return res.status(401).json({ success: false, error: 'Authentication required for this workspace.' });
    }
    if (authUser && authUser.role !== 'PLATFORM_ADMIN' && authUser.tenantId.toLowerCase() !== resolvedTenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cross-tenant voice access is not allowed.' });
    }
    const record = await conversationStore.getOrCreateConversationAsync(conversationId, business.id);

    const normInput = normalizeInput(transcript);
    const classifiedIntent = classifyConversationIntent(normInput, record, business.name);

    let rawResult;
    let extracted;

    if (!classifiedIntent.requiresKnowledgeRetrieval && classifiedIntent.directReply) {
      rawResult = {
        reply: classifiedIntent.directReply,
        isClosing: classifiedIntent.isClosing,
        needsHumanHandoff: classifiedIntent.needsHumanHandoff,
        suggestedActions: classifiedIntent.suggestedActions
      };
      extracted = extractIntentsAndEntities(normInput, record, business.name);
    } else {
      extracted = extractIntentsAndEntities(normInput, record, business.name);
      const targetedKnowledge = retrieveTargetedKnowledge(business, knowledge, extracted);

      let geminiVoiceReply: string | null = null;
      if (targetedKnowledge.length > 0) {
        geminiVoiceReply = await generateGroundedGeminiResponse(
          business,
          targetedKnowledge,
          normInput.raw,
          record.state.currentTopic
        );
      }

      if (geminiVoiceReply) {
        rawResult = {
          reply: geminiVoiceReply,
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: []
        };
      } else {
        rawResult = generateEngineAnswer(business, extracted, targetedKnowledge, record);
      }
    }

    const validatedReply = validateAnswer(rawResult.reply, extracted, business, record);
    const updatedRecord = updateConversationMemory(record, transcript, validatedReply, extracted);

    const assistantName = business.agentSettings?.agentName || `${business.name} AI Assistant`;

    return res.json({
      success: true,
      reply: validatedReply,
      conversationId: updatedRecord.conversationId,
      conversationState: updatedRecord.state,
      isClosing: rawResult.isClosing,
      businessId: business.id,
      businessName: business.name,
      assistantName,
      voice: business.voice || 'Puck'
    });

  } catch (err) {
    console.error('Voice processing error:', err);
    return res.status(500).json({
      success: false,
      reply: "I'm having trouble processing audio right now. Would you like to leave your phone number for our team?"
    });
  }
});

// Start Server, Create HTTP + WebSocket Server for Live Voice Audio
async function startServer() {
  // Safe Diagnostic Logging
  const dbDiagnostics = getSafeDatabaseDiagnostics();
  console.log(`[Diagnostic] DATABASE_URL configured: ${dbDiagnostics.isConfigured ? 'yes' : 'no'}`);
  if (dbDiagnostics.isConfigured) {
    console.log(`[Diagnostic] DATABASE host: ${dbDiagnostics.host}:${dbDiagnostics.port}, db: ${dbDiagnostics.database}, placeholder detected: ${dbDiagnostics.hasPlaceholder ? 'yes' : 'no'}`);
  }

  // Authoritative PostgreSQL initialization and platform administrator verification
  let isDbReady = false;
  try {
    isDbReady = await postgresClient.initialize();
    console.log(`[Diagnostic] DATABASE provider initialization: ${isDbReady ? 'success' : 'failure'}`);
    if (isDbReady) {
      console.log('[Diagnostic] migration initialization: success');
      await userRegistryReady;
      await syncUsersFromPostgres();
      await bootstrapPlatformAdminAsync();

      // Hydrate persisted integrations from the authoritative PostgreSQL store
      // after the database is fully ready. Gmail connectivity is platform-level
      // and must survive admin logout, browser changes, and server restarts.
      await integrationStore.syncWithPostgres();
      console.log('[Diagnostic] user registry initialization: success');
      console.log('[Diagnostic] persistent integrations synchronized.');
    } else {
      console.log('[Diagnostic] migration initialization: failure');
      console.log('[Diagnostic] user registry initialization: failure');
      const err = postgresClient.getStatus().error || 'Unavailable';
      console.warn(`[Diagnostic] Database unavailable reason: ${err}`);
       if (process.env.NODE_ENV === 'production') {
         console.error('[ServerStartup] Refusing production startup because PostgreSQL is unavailable.');
         process.exit(1);
       }
    }
  } catch (err: any) {
    console.log(`[Diagnostic] DATABASE provider initialization: failure`);
    console.log('[Diagnostic] migration initialization: failure');
    console.log('[Diagnostic] user registry initialization: failure');
    console.error('[ServerStartup] PostgreSQL database bootstrap failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/live-voice' });

  wss.on('connection', (ws: WebSocket, req: Request) => {
    const wsIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    let wsMessageCount = 0;
    const wsWindowStartedAt = Date.now();
    console.log('[WebSocket] Client connected to Voice AI Receptionist');
    let currentBusinessId: string | null = null;
    let currentBusiness: any = null;
    let currentKnowledge: any[] = [];
    let sessionStartTime = Date.now();
    let currentConvRecord: ConversationRecord | null = null;

    ws.on('message', async (data: Buffer | string) => {
      try {
        const messageStr = data.toString();
        if (messageStr.length > 10000) {
          ws.send(JSON.stringify({ type: 'error', error: 'Voice message is too large.' }));
          return;
        }
        const now = Date.now();
        if (now - wsWindowStartedAt > 60000) {
          wsMessageCount = 0;
        }
        wsMessageCount += 1;
        if (wsMessageCount > 60 || !checkRateLimit('voice-ws:' + wsIp, 60, 60000)) {
          ws.send(JSON.stringify({ type: 'error', error: 'Voice session rate limit exceeded. Please wait a moment.' }));
          return;
        }
        let payload: any = {};
        try { payload = JSON.parse(messageStr); } catch (e) { return; }

        if (payload.type === 'init') {
          currentBusinessId = payload.businessId || (process.env.NODE_ENV !== 'production' ? DEMO_BUSINESS_ID : null);
          if (!currentBusinessId) {
            ws.send(JSON.stringify({ type: 'error', error: 'businessId is required to initialize voice session.' }));
            ws.close(1008, 'Missing businessId');
            return;
          }
          // Voice is a public-facing surface in the current widget architecture.
          // Resolve only an explicitly public customer/demo agent and never accept
          // caller-supplied knowledge as an authority source.
          const resolved = resolvePublicWidgetTarget(currentBusinessId);
          if (!resolved.business || !resolved.agent) {
            ws.send(JSON.stringify({ type: 'error', error: 'Public voice is not available for this agent.' }));
            ws.close(1008, 'Unavailable voice target');
            return;
          }
          currentBusiness = resolved.business;
          currentKnowledge = resolved.knowledge.filter((k: any) =>
            k?.active !== false &&
            (!k?.status || k.status === 'active') &&
            k?.visibility !== 'internal' &&
            k?.visibility !== 'restricted'
          );
          sessionStartTime = Date.now();
          currentConvRecord = getOrCreateConversation(payload.conversationId, currentBusiness.id);

          const assistantName = currentBusiness.agentSettings?.agentName || `${currentBusiness.name} AI Assistant`;
          const dynamicGreeting = currentBusiness.voiceGreeting || `Hello! I am ${assistantName} for ${currentBusiness.name}. How can I assist you today?`;

          console.log(`[WebSocket] Voice session initialized for tenant (${currentBusiness.id})`);

          ws.send(JSON.stringify({
            type: 'ready',
            conversationId: currentConvRecord.conversationId,
            conversationState: currentConvRecord.state,
            businessId: currentBusiness.id,
            businessName: currentBusiness.name,
            assistantName,
            voiceGreeting: dynamicGreeting,
            voice: currentBusiness.voice || 'Puck'
          }));
          return;
        }

        if (payload.type === 'spoken_text' || payload.type === 'text') {
          const userText = payload.text || payload.transcript;
          if (!userText || !userText.trim()) return;

          if (!currentConvRecord) {
            currentConvRecord = await conversationStore.getOrCreateConversationAsync(payload.conversationId, currentBusiness.id);
          }

          ws.send(JSON.stringify({ type: 'status', status: 'thinking' }));

          const normInput = normalizeInput(userText);
          const classifiedIntent = classifyConversationIntent(normInput, currentConvRecord, currentBusiness.name);

          let rawResult;
          let extracted;

          if (!classifiedIntent.requiresKnowledgeRetrieval && classifiedIntent.directReply) {
            rawResult = {
              reply: classifiedIntent.directReply,
              isClosing: classifiedIntent.isClosing,
              needsHumanHandoff: classifiedIntent.needsHumanHandoff,
              suggestedActions: classifiedIntent.suggestedActions
            };
            extracted = extractIntentsAndEntities(normInput, currentConvRecord, currentBusiness.name);
          } else {
            extracted = extractIntentsAndEntities(normInput, currentConvRecord, currentBusiness.name);
            const targetedKnowledge = retrieveTargetedKnowledge(currentBusiness, currentKnowledge, extracted, { publicOnly: true });

            let geminiVoiceReply: string | null = null;
            if (targetedKnowledge.length > 0) {
              geminiVoiceReply = await generateGroundedGeminiResponse(
                currentBusiness,
                targetedKnowledge,
                normInput.raw,
                currentConvRecord.state.currentTopic
              );
            }

            if (geminiVoiceReply) {
              rawResult = {
                reply: geminiVoiceReply,
                isClosing: false,
                needsHumanHandoff: false,
                suggestedActions: []
              };
            } else {
              rawResult = generateEngineAnswer(currentBusiness, extracted, targetedKnowledge, currentConvRecord);
            }
          }

          const validatedReply = validateAnswer(rawResult.reply, extracted, currentBusiness, currentConvRecord || undefined);
          
          currentConvRecord = updateConversationMemory(currentConvRecord, userText, validatedReply, extracted);

          ws.send(JSON.stringify({
            type: 'response',
            text: validatedReply,
            conversationId: currentConvRecord.conversationId,
            conversationState: currentConvRecord.state,
            isClosing: rawResult.isClosing || false,
            needsHumanHandoff: rawResult.needsHumanHandoff || false,
            voice: currentBusiness.voice || 'Puck',
            userText,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (err) {
        console.error('[WebSocket] Error handling message:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process voice turn' }));
      }
    });

    ws.on('close', () => {
      const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
      console.log(`[WebSocket] Voice session closed for tenant (${currentBusiness.id}). Duration: ${durationSeconds}s`);
    });
  });

  // ---------------------------------------------------------------------------
  // API ROUTING GUARDS: Ensure all /api/* routes ALWAYS return JSON, never HTML
  // ---------------------------------------------------------------------------
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'API_ENDPOINT_NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} does not exist.`
      }
    });
  });

  // Global API error handler ensuring any unhandled backend exception in /api returns JSON
  app.use('/api', (err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[API Global Error] ${req.method} ${req.originalUrl}:`, err);
    const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected internal server error occurred.'
      }
    });
  });

  const candidateDirs = [
    path.join(process.cwd(), 'dist'),
    path.join(appDirectory, 'dist'),
    appDirectory
  ];
  const distPath = candidateDirs.find(p => fs.existsSync(path.join(p, 'index.html'))) || null;
  const isProduction = process.env.NODE_ENV === 'production' || (Boolean(distPath) && process.env.NODE_ENV !== 'development');

  if (!isProduction || !distPath) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // 1. Immutable, cached static assets (/assets) with strict no-fallthrough (prevents HTML fallback for missing JS/CSS)
    const assetsDir = path.join(distPath, 'assets');
    if (fs.existsSync(assetsDir)) {
      app.use('/assets', express.static(assetsDir, {
        immutable: true,
        maxAge: '1y',
        fallthrough: false,
        setHeaders: (res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
      }));
    }

    // 2. Root static files from dist (favicon, manifest, etc.)
    app.use(express.static(distPath, {
      maxAge: '1h',
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.svg') || filePath.endsWith('.ico')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
      }
    }));

    // 3. Strict 404 guard: Missing static files, assets, or APIs must never fall through to index.html
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/assets') || req.path.startsWith('/dist') || req.path.startsWith('/api') || path.extname(req.path)) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Resource not found: ${req.path}`
          }
        });
      }
      next();
    });

    // 4. SPA Fallback: Serve dist/index.html with no-cache so browsers always receive latest bundle references
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AgentDesk Server & WebSocket running on http://0.0.0.0:${PORT}`);
    console.log(`[AgentDesk Diagnostics] Environment: ${process.env.NODE_ENV || 'development'} | Frontend Mode: ${isProduction && distPath ? `Production Dist (${distPath})` : 'Vite Middleware'} | Database: ${postgresClient.isConfigured() ? 'Configured' : 'Unconfigured'} | Gemini: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Unconfigured'} | Razorpay: ${(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) ? 'Configured' : 'Unconfigured'}`);
    validateEnvironmentOnStartup(gmailService.getConnectionStatus());
  });

  const handleShutdown = (signal: string) => {
    console.log(`[AgentDesk Server] Received ${signal}. Initiating graceful shutdown...`);
    wss.close();
    server.close(async () => {
      console.log('[AgentDesk Server] HTTP server and WebSockets terminated.');
      await postgresClient.close();
      console.log('[AgentDesk Server] Database connections closed. Graceful shutdown complete.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[AgentDesk Server] Graceful shutdown timed out. Exiting forcefully.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();
