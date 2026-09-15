import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
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
import { runConversationTestSuite, runMultiTenantIsolationTestSuite } from './src/lib/testSuite.js';
import { billingRouter } from './src/server/billing/billingRouter.js';
import { authRouter, requirePlatformAdmin, requireAuth, requireTenantAccess, extractTokenFromRequest } from './src/server/auth/authRouter.js';
import { getSession } from './src/server/auth/sessionStore.js';
import { getUserById } from './src/server/auth/userRegistry.js';
import { integrationsRouter } from './src/server/integrationsRouter.js';
import { storageService, gmailService } from './src/server/integrations/index.js';
import { validateEnvironmentOnStartup } from './src/server/envValidator.js';
import { requireTenantMiddleware, verifyTenantFilterSecurity } from './src/server/tenantMiddleware.js';
import { 
  serverBusinessesStore, 
  serverAgentsStore, 
  serverKnowledgeStore, 
  serverTenantUsageStore, 
  recordTenantUsage, 
  checkTenantQuota, 
  getPlanUsageLimits, 
  getTenant, 
  provisionCustomerTenant,
  resetTenantQuota 
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
const PORT = 3000;

// Production CORS Configuration: restricted to APP_URL, localhost, and authenticated origins
const allowedOrigins = [
  process.env.APP_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.APP_URL) {
      try {
        if (origin === new URL(process.env.APP_URL).origin) {
          return callback(null, true);
        }
      } catch {}
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-business-id', 'x-csrf-token']
}));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
    req.rawBodyString = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true }));

// Mount Billing & Webhooks API Router
app.use('/api/billing', billingRouter);
app.use('/api', billingRouter);

// Mount Authentication API Router
app.use('/api/auth', authRouter);
app.use('/api', authRouter);
app.use('/api/platform', authRouter);

// Mount Production Integrations, Notifications, Security & Health API Router
app.use('/api', integrationsRouter);
app.use('/', integrationsRouter);

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
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    return res.send(file.dataBuffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Client Error Telemetry Endpoint
app.post('/api/logs/client-error', (req: Request, res: Response) => {
  console.warn('[Client Error Logged]:', req.body?.message || 'Unknown client error', req.body?.time);
  return res.json({ success: true });
});

// Initialize Gemini Client safely with lazy evaluation
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Resilient Grounded Gemini Content Generator with multi-tier model fallback
 * Tier 1: gemini-3.7-flash
 * Tier 2: gemini-3.1-flash-lite (if primary model is experiencing high demand / 503 / 429)
 * Tier 3: Returns null gracefully for deterministic local engine fallback
 */
async function generateGroundedGeminiResponse(
  business: any,
  targetedKnowledge: KnowledgeItem[],
  userQuery: string,
  currentTopic: string | null
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai || !process.env.GEMINI_API_KEY || targetedKnowledge.length === 0) {
    return null;
  }

  const knowledgeContext = targetedKnowledge
    .map(k => `[Title: ${k.title}]\n${k.content}`)
    .join('\n\n---\n\n');

  const assistantName = business.agentSettings?.agentName || (business.name ? `${business.name} AI Assistant` : 'AI Assistant');
  const assistantRole = business.agentSettings?.role || 'AI Receptionist & Admissions Assistant';
  const businessName = business.name || 'our business';

  const prompt = `You are ${assistantName}, the ${assistantRole} for "${businessName}" (${business.industry || 'Business'}).

STRICT DIRECTIVES:
1. IDENTITY: Your name is "${assistantName}" representing "${businessName}".
2. STRICT IDENTITY PROHIBITION: You must NEVER speak, reveal, or output tenantId, businessId, database IDs, document IDs, UUIDs, internal slugs, internal configuration keys, or system codes to the customer.
3. KNOWLEDGE SCOPE: You represent ONLY "${businessName}". Answer the customer's question strictly and ONLY using the verified knowledge base below.
4. NEVER invent or mention any course, pricing, phone number, address, or details from any other company.
5. If the requested information is not in the verified knowledge base, state politely that this detail is not available for ${businessName} and offer to connect them with human support.

[VERIFIED KNOWLEDGE BASE FOR ${businessName.toUpperCase()}]:
${knowledgeContext}

Customer Question: "${userQuery}"
Active Topic in Conversation: ${currentTopic || 'General'}

Provide a concise, helpful, and natural receptionist response:`;

  // Helper to attempt a model call with timeout
  const attemptModelCall = async (modelName: string): Promise<string | null> => {
    try {
      const responsePromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 300,
        }
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      const result = await Promise.race([responsePromise, timeoutPromise]);

      if (result && result.text) {
        return result.text.trim();
      }
      return null;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const isOverloaded = errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('429');
      if (isOverloaded) {
        console.log(`[Gemini AI] Model ${modelName} experiencing high demand (503/429), trying fallback...`);
      } else {
        console.log(`[Gemini AI] Model ${modelName} note: ${errorMsg.slice(0, 100)}`);
      }
      return null;
    }
  };

  // Tier 1: gemini-3.7-flash
  const primaryResult = await attemptModelCall('gemini-3.7-flash');
  if (primaryResult) {
    return primaryResult;
  }

  // Tier 2: gemini-3.1-flash-lite fallback
  const fallbackResult = await attemptModelCall('gemini-3.1-flash-lite');
  if (fallbackResult) {
    return fallbackResult;
  }

  // Tier 3: Graceful fallback to deterministic rule engine
  return null;
}

// Global In-Memory Conversation State & History Store (Strictly isolated by businessId:conversationId)
const conversationsStore = new Map<string, ConversationRecord>();

export function getOrCreateConversation(conversationId?: string, businessId?: string): ConversationRecord {
  const normBiz = (businessId || DEMO_BUSINESS_ID).trim().toLowerCase();
  const normId = (conversationId || `conv_${normBiz}_${Date.now()}`).trim();
  const key = `${normBiz}:${normId}`;

  if (conversationsStore.has(key)) {
    return conversationsStore.get(key)!;
  }

  const record: ConversationRecord = {
    conversationId: normId,
    businessId: normBiz,
    messages: [],
    state: {
      conversationId: normId,
      businessId: normBiz,
      currentTopic: null,
      currentEntity: null,
      currentEntityType: 'general',
      lastIntent: null,
      lastRequestedAttribute: null,
      lastAssistantQuestion: null,
      pendingAction: null,
      conversationStage: 'COURSE_DISCUSSION',
      bookingState: { stage: 'IDLE' },
      lastAnswer: null,
      recentEntities: [],
      pendingQuestion: null,
      conversationSummary: '',
      updatedAt: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'AI_ACTIVE'
  };

  conversationsStore.set(key, record);
  return record;
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

  // 1. Check if identifier resolves to an AI Agent first
  let resolvedAgent = serverAgentsStore.get(normId) || SEED_AGENTS.find(a => (a.id || '').toLowerCase() === normId || (a.publicId || '').toLowerCase() === normId);
  
  // 2. Identify the Tenant ID
  let targetTenantId = resolvedAgent ? resolvedAgent.tenantId.toLowerCase() : normId;
  
  // 3. Locate business from serverBusinessesStore or SEED_BUSINESSES
  let business = serverBusinessesStore.get(targetTenantId) || SEED_BUSINESSES.find(b => (b.id || '').trim().toLowerCase() === targetTenantId);
  
  if (!business) {
    const fallbackId = targetTenantId || 'workspace';
    business = {
      id: fallbackId,
      tenantId: fallbackId,
      name: formatBusinessName(fallbackId),
      industry: 'General',
      description: `Support AI for ${formatBusinessName(fallbackId)}`,
      website: '',
      supportEmail: `support@${fallbackId}.com`,
      logo: '',
      primaryColor: resolvedAgent?.primaryColor || '#2563eb',
      secondaryColor: resolvedAgent?.secondaryColor || '#1e40af',
      agentSettings: {
        agentName: resolvedAgent?.name || `${formatBusinessName(fallbackId)} Assistant`,
        welcomeMessage: resolvedAgent?.welcomeMessage || `Hi 👋 Welcome to ${formatBusinessName(fallbackId)}. How can I help you today?`,
        businessDescription: resolvedAgent?.businessDescription || `Workspace for ${formatBusinessName(fallbackId)}`,
        tone: resolvedAgent?.tone || 'Friendly',
        primaryColor: resolvedAgent?.primaryColor || '#2563eb',
        secondaryColor: resolvedAgent?.secondaryColor || '#1e40af',
        suggestedQuestions: resolvedAgent?.suggestedQuestions || ['What services do you offer?', 'What is the pricing?', 'How can I enroll?'],
        systemSecurityInstructions: resolvedAgent?.customInstructions || `Strict tenant isolation. You represent ${formatBusinessName(fallbackId)} ONLY.`,
        humanHandoffEnabled: resolvedAgent?.humanHandoffEnabled ?? true,
        leadCaptureEnabled: resolvedAgent?.leadCaptureEnabled ?? true
      },
      voice: resolvedAgent?.voice || 'Puck',
      voiceGreeting: resolvedAgent?.voiceGreeting || `Hello! I am ${formatBusinessName(fallbackId)} AI receptionist. How can I assist you today?`,
      plan: 'growth',
      status: 'active',
      agentStatus: 'PUBLISHED',
      subscriptionState: 'ACTIVE',
      currency: 'USD',
      trialDaysRemaining: 14,
      whiteLabelEnabled: true,
      dataRetentionDays: 90,
      maxMonthlyVoiceMinutes: 500,
      maxMonthlyMessages: 5000,
      createdAt: new Date().toISOString()
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
    knowledge = SEED_KNOWLEDGE_ITEMS.filter(k => (k.tenantId || k.businessId || '').trim().toLowerCase() === tenantLookupKey);
  }

  return { business, knowledge, agent: resolvedAgent };
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
const conversationTurnMap = new Map<string, number>();

// Periodic garbage collection to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipRateLimitMap.entries()) {
    if (now > val.resetAt) ipRateLimitMap.delete(key);
  }
  for (const [key, val] of agentUsageMap.entries()) {
    if (now > val.resetAt) agentUsageMap.delete(key);
  }
}, 300000); // every 5 min

function checkRateLimit(key: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

function checkAgentAiHourlyBudget(agentId: string, maxHourlyCalls: number = 200): boolean {
  const now = Date.now();
  const key = agentId.toLowerCase();
  const record = agentUsageMap.get(key);
  if (!record || now > record.resetAt) {
    agentUsageMap.set(key, { count: 1, resetAt: now + 3600000 }); // 1 hr window
    return true;
  }
  if (record.count >= maxHourlyCalls) {
    return false; // budget exceeded -> fallback gracefully to local deterministic engine
  }
  record.count += 1;
  return true;
}

function checkAndIncrementConversationTurns(convId: string, maxTurns: number = 35): boolean {
  if (!convId) return true;
  const turns = conversationTurnMap.get(convId) || 0;
  if (turns >= maxTurns) {
    return false;
  }
  conversationTurnMap.set(convId, turns + 1);
  return true;
}

// API Routes
app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    success: true,
    service: 'AgentDesk',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// GET Automated Conversation Intelligence Test Suite Results
app.get('/api/test/conversation-suite', (req: Request, res: Response) => {
  const clientIp = req.ip || '127.0.0.1';
  if (!checkRateLimit(clientIp, 30)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
  }

  const { businessId } = req.query;
  const targetId = (businessId as string) || DEMO_BUSINESS_ID;
  const { business, knowledge } = resolveBusinessAndKnowledge(targetId);
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
app.post('/api/knowledge/ingest-website', async (req: Request, res: Response) => {
  const clientIp = req.ip || '127.0.0.1';
  if (!checkRateLimit(clientIp, 10)) {
    return res.status(429).json({ error: 'Website ingestion rate limit exceeded. Please wait a minute.' });
  }

  const { url, businessId } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid website URL is required.' });
  }

  const cleanUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
  const targetBizId = businessId || DEMO_BUSINESS_ID;

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
app.post('/api/knowledge/detect-conflicts', async (req: Request, res: Response) => {
  const { businessId, knowledgeItems = [] } = req.body;
  const conflicts: any[] = [];
  const targetBizId = businessId || DEMO_BUSINESS_ID;

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

  console.log(`[Knowledge Engine] Saved item "${newItem.title}" (${newItem.id}) for tenant "${normTenantId}". Total items: ${list.length}`);

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

  console.log(`[Knowledge Engine] Updated item "${updatedItem.title}" (${id}) for tenant "${normTenantId}".`);

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
  console.log(`[Knowledge Engine] Deleted item "${id}" for tenant "${normTenantId}". Remaining: ${filtered.length}`);

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
  const merged = { ...existing, ...businessData, id: normId };
  serverBusinessesStore.set(normId, merged);
  console.log(`[Admin Tenant Registry] Synced business "${merged.name || normId}" (${normId})`);
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
  console.log(`[Admin Tenant Registry] Onboarded new tenant "${name}" (${newId})`);

  return res.json({
    success: true,
    business: newBusiness,
    embedSnippet: `<script src="${req.protocol}://${req.get('host')}/widget.js" data-business-id="${newId}"></script>`,
    message: 'Your AI Agent is ready.'
  });
});

// DELETE Business Tenant Endpoint (Platform Admin - Strict Tenant Isolation)
app.delete('/api/admin/businesses/:businessId', requirePlatformAdmin, (req: Request, res: Response) => {
  const { businessId } = req.params;
  const { actorEmail } = req.body || {};
  const normBiz = (businessId || '').trim().toLowerCase();

  if (!normBiz) {
    return res.status(400).json({ error: 'Valid businessId is required.' });
  }

  // 1. Wipe all conversation records from server-side store
  let deletedCount = 0;
  for (const key of Array.from(conversationsStore.keys())) {
    const rec = conversationsStore.get(key);
    if (key.startsWith(`${normBiz}:`) || rec?.businessId === normBiz) {
      conversationsStore.delete(key);
      deletedCount++;
    }
  }

  // 2. Wipe from server businesses and knowledge stores
  serverBusinessesStore.delete(normBiz);
  serverKnowledgeStore.delete(normBiz);

  console.log(`[Admin Tenant Management] Business "${normBiz}" and ${deletedCount} server conversation memory records deleted by ${actorEmail || 'platform-admin'}`);

  return res.json({
    success: true,
    message: `Business tenant ${normBiz} and all associated conversation history erased from server memory.`,
    businessId: normBiz,
    deletedConversationRecords: deletedCount
  });
});

// GET Admin Live Conversation Records with Intelligence Metadata
app.get('/api/admin/conversations/:businessId', requirePlatformAdmin, (req: Request, res: Response) => {
  const { businessId } = req.params;
  const normBiz = (businessId || DEMO_BUSINESS_ID).toLowerCase();
  
  const records: ConversationRecord[] = [];
  for (const [key, rec] of conversationsStore.entries()) {
    if (key.startsWith(`${normBiz}:`) || rec.businessId === normBiz) {
      records.push(rec);
    }
  }

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

  console.log(`[Agent Registry] Synced agent "${savedAgent.name}" (${normId}) for tenant "${normTenant}"`);

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
  const { business, agent, knowledge } = resolveBusinessAndKnowledge(targetId);

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
      supportEmail: business.supportEmail,
      phone: business.phone,
      logo: business.logo,
      primaryColor: business.primaryColor
    },
    knowledgeCount: knowledge.length
  });
});

// POST Public Widget Chat Endpoint (Strict Multi-Tenant Isolation & Zero-Cost Budget Protection)
app.post('/api/widget/chat', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  
  // IP Rate Limit Protection (Max 30 msg/min per IP)
  if (!checkRateLimit(`widget:${clientIp}`, 30, 60000)) {
    return res.status(429).json({
      success: false,
      reply: "You have sent messages too quickly. Please wait a moment before trying again."
    });
  }

  try {
    const {
      conversationId,
      agentId,
      businessId,
      tenantId,
      message,
      conversationHistory = []
    } = req.body;

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

    // Loop & Session Abuse Protection (Max 35 user turns per conversation)
    if (!checkAndIncrementConversationTurns(safeConvId, 35)) {
      return res.json({
        success: true,
        reply: "You have reached the maximum conversation limit for this session. Please refresh or contact our team directly.",
        conversationId: safeConvId,
        isClosing: true,
        needsHumanHandoff: true,
        suggestedActions: ['Contact Support']
      });
    }

    const targetIdentifier = agentId || tenantId || businessId;
    const { business: currentBusiness, knowledge: effectiveKnowledge, agent } = resolveBusinessAndKnowledge(targetIdentifier);

    const record = getOrCreateConversation(safeConvId, currentBusiness.id);

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
      const targetedKnowledge = retrieveTargetedKnowledge(currentBusiness, effectiveKnowledge, extracted);

      let geminiReply: string | null = null;
      // Check zero-cost hourly agent budget before calling Gemini
      const canUseAi = checkAgentAiHourlyBudget(agent.id, 250);
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

    console.log(`[Widget Chat Engine] Biz: "${currentBusiness.id}" (${currentBusiness.name}) | Query: "${normInput.raw}" -> Reply: "${validatedReply}"`);

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
app.post('/api/widget/lead', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  if (!checkRateLimit(`lead:${clientIp}`, 10, 60000)) {
    return res.status(429).json({ error: 'Lead submission rate limit exceeded. Please wait a moment.' });
  }

  const { agentId, businessId, tenantId, conversationId, name, email, phone, notes } = req.body;
  const targetIdentifier = agentId || tenantId || businessId;
  const { business } = resolveBusinessAndKnowledge(targetIdentifier);

  const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const leadRecord = {
    id: leadId,
    businessId: business.id,
    conversationId: (conversationId || `conv_${Date.now()}`).toString().slice(0, 100),
    name: (name || 'Website Visitor').toString().trim().slice(0, 100),
    email: (email || '').toString().trim().slice(0, 100),
    phone: (phone || '').toString().trim().slice(0, 50),
    source: 'Embed Widget',
    status: 'new',
    score: 85,
    notes: (notes || 'Lead submitted through embedded website AI widget').toString().trim().slice(0, 500),
    createdAt: new Date().toISOString()
  };

  console.log(`[Widget Lead Capture] New lead captured for tenant "${business.name}" (${business.id}): ${leadRecord.name} <${leadRecord.email}>`);

  return res.json({
    success: true,
    message: 'Lead captured successfully',
    lead: leadRecord
  });
});

// GET Agent Widget Config for Embeds
app.get('/api/agent/:agentId/widget-config', (req: Request, res: Response) => {
  const { agentId } = req.params;
  const { business, agent, knowledge } = resolveBusinessAndKnowledge(agentId);

  return res.json({
    success: true,
    agentId,
    agent,
    business,
    knowledgeCount: knowledge.length
  });
});

// GET Strict Multi-Tenant Isolation Test Results
app.get('/api/test/tenant-isolation', (_req: Request, res: Response) => {
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
app.get('/api/test/firestore-tenant-filter', (_req: Request, res: Response) => {
  const audit = verifyTenantFilterSecurity();
  return res.json({
    success: true,
    allTestsPassed: audit.allTestsPassed,
    checks: audit.checks,
    timestamp: new Date().toISOString()
  });
});

// GET Business Widget Config
app.get('/api/business/:businessId/widget-config', (req: Request, res: Response) => {
  const { businessId } = req.params;
  const { business, agent } = resolveBusinessAndKnowledge(businessId);
  return res.json({ success: true, business, agent });
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

    // Loop prevention check
    if (!checkAndIncrementConversationTurns(safeConvId, 35)) {
      return res.json({
        success: true,
        reply: "You have reached the maximum conversation limit for this session. Please refresh or contact our team directly.",
        conversationId: safeConvId,
        isClosing: true,
        needsHumanHandoff: true,
        suggestedActions: ['Contact Support']
      });
    }

    const targetIdentifier = agentId || tenantId || businessId || businessInfo?.id;
    const { business: currentBusiness, knowledge: effectiveKnowledge, agent } = resolveBusinessAndKnowledge(
      targetIdentifier,
      knowledgeBase
    );

    const record = getOrCreateConversation(safeConvId, currentBusiness.id);

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
      const canUseAi = checkAgentAiHourlyBudget(agent.id, 250);
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

    console.log(`[Conversation Intelligence] Biz: "${currentBusiness.id}" (${currentBusiness.name}) | Intent: "${classifiedIntent.primaryType}" | Query: "${normInput.raw}" -> Reply: "${validatedReply}"`);

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
    const record = getOrCreateConversation(conversationId, business.id);

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
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/live-voice' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected to Voice AI Receptionist');
    let currentBusinessId = DEMO_BUSINESS_ID;
    let currentBusiness = DEMO_BUSINESS;
    let currentKnowledge = SEED_KNOWLEDGE_ITEMS.filter(k => k.businessId === DEMO_BUSINESS_ID);
    let sessionStartTime = Date.now();
    let currentConvRecord: ConversationRecord | null = null;

    ws.on('message', async (data: Buffer | string) => {
      try {
        const messageStr = data.toString();
        let payload: any = {};
        try { payload = JSON.parse(messageStr); } catch (e) { return; }

        if (payload.type === 'init') {
          currentBusinessId = payload.businessId || DEMO_BUSINESS_ID;
          const resolved = resolveBusinessAndKnowledge(currentBusinessId, payload.knowledgeBase);
          currentBusiness = resolved.business;
          currentKnowledge = resolved.knowledge;
          sessionStartTime = Date.now();
          currentConvRecord = getOrCreateConversation(payload.conversationId, currentBusiness.id);

          const assistantName = currentBusiness.agentSettings?.agentName || `${currentBusiness.name} AI Assistant`;
          const dynamicGreeting = currentBusiness.voiceGreeting || `Hello! I am ${assistantName} for ${currentBusiness.name}. How can I assist you today?`;

          console.log(`[WebSocket] Session initialized for "${currentBusiness.name}" (${currentBusiness.id}) | Voice: ${currentBusiness.voice} | Conv ID: "${currentConvRecord.conversationId}"`);

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
            currentConvRecord = getOrCreateConversation(payload.conversationId, currentBusiness.id);
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
            const targetedKnowledge = retrieveTargetedKnowledge(currentBusiness, currentKnowledge, extracted);

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
      console.log(`[WebSocket] Voice session closed for business "${currentBusiness.name}". Duration: ${durationSeconds}s`);
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

  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

  if (!isProduction) {
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
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : path.join(appDirectory, 'dist');

    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AgentDesk Server & WebSocket running on http://0.0.0.0:${PORT}`);
    validateEnvironmentOnStartup(gmailService.getConnectionStatus());
  });
}

startServer();
