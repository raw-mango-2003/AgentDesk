import { 
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
} from '../data/demoBusiness.js';

export { 
  PUBLIC_DEMO_TENANT_ID,
  PLATFORM_ADMIN_TENANT_ID
};
import { SEED_AGENTS } from '../data/seedData.js';
import { DEFAULT_PLAN_CONFIGS } from '../data/pricing.js';
import { Business, AIAgent, KnowledgeItem, PlanUsageLimits } from '../types.js';
import { getUserByEmail, updateUser, createUser } from './auth/userRegistry.js';
import { postgresClient } from './db/postgresClient.js';
import { generateSecureToken } from './auth/passwordUtils.js';

// Server-side Tenant Businesses Store (Multi-Tenant Persistence)
export const serverBusinessesStore = new Map<string, any>();

// Server-side AI Agents Store (1 Agent belongs exclusively to 1 Tenant)
export const serverAgentsStore = new Map<string, any>();

// Server-side Knowledge Store (Multi-Tenant Segregated Knowledge Bases)
export const serverKnowledgeStore = new Map<string, KnowledgeItem[]>();

// Server-side Tenant Usage Tracking Store
export interface TenantUsageRecord {
  tenantId: string;
  aiUsage: number;
  voiceMinutes: number;
  knowledgeDocuments: number;
  contacts: number;
  lastReset: string;
}
export const serverTenantUsageStore = new Map<string, TenantUsageRecord>();

let isInitialized = false;

export function initTenantRegistry() {
  if (isInitialized) return;
  isInitialized = true;

  // Development/demo fixtures must never be loaded into the production tenant registry.
  // Production hydrates real tenants, agents, and knowledge from PostgreSQL instead.
  if (process.env.NODE_ENV !== 'production') {
    // 1. Seed Businesses
    for (const b of SEED_BUSINESSES) {
      const id = (b.id || '').trim().toLowerCase();
      if (id) {
        serverBusinessesStore.set(id, { ...b, id, status: b.status || 'active' });
      }
    }

    // 2. Seed Agents
    for (const a of SEED_AGENTS) {
      const id = (a.id || '').trim().toLowerCase();
      if (id) {
        serverAgentsStore.set(id, { ...a, id });
        if (a.publicId) {
          serverAgentsStore.set(a.publicId.trim().toLowerCase(), { ...a, id });
        }
      }
    }

    // 3. Seed Knowledge Base Items
    for (const item of SEED_KNOWLEDGE_ITEMS) {
      const tenantId = (item.tenantId || item.businessId || '').trim().toLowerCase();
      if (tenantId) {
        const existing = serverKnowledgeStore.get(tenantId) || [];
        existing.push({
          ...item,
          tenantId,
          businessId: tenantId,
          active: item.status === 'active' || item.active === true
        });
        serverKnowledgeStore.set(tenantId, existing);
      }
    }
  }

  // 4. Platform Admin & Public Demo seed guarantee
  serverBusinessesStore.set(PLATFORM_ADMIN_TENANT_ID.toLowerCase(), { ...PLATFORM_ADMIN_BUSINESS, id: PLATFORM_ADMIN_TENANT_ID.toLowerCase() });
  serverAgentsStore.set(PLATFORM_ADMIN_AGENT_ID.toLowerCase(), { ...PLATFORM_ADMIN_AGENT, id: PLATFORM_ADMIN_AGENT_ID.toLowerCase() });
  serverKnowledgeStore.set(PLATFORM_ADMIN_TENANT_ID.toLowerCase(), PLATFORM_ADMIN_KNOWLEDGE_ITEMS);

  serverBusinessesStore.set(PUBLIC_DEMO_TENANT_ID.toLowerCase(), { ...PUBLIC_AGENTDESK_DEMO_BUSINESS, id: PUBLIC_DEMO_TENANT_ID.toLowerCase() });
  serverAgentsStore.set(PUBLIC_DEMO_AGENT_ID.toLowerCase(), {
    id: PUBLIC_DEMO_AGENT_ID,
    publicId: PUBLIC_DEMO_AGENT_ID,
    tenantId: PUBLIC_DEMO_TENANT_ID,
    businessId: PUBLIC_DEMO_TENANT_ID,
    name: 'AgentDesk AI Assistant',
    role: 'AI Revenue & Operations Specialist',
    voice: 'Puck',
    status: 'active'
  });
}

// Auto-initialize on import
initTenantRegistry();

export async function persistTenantToPostgres(biz: any): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return;
    const now = new Date().toISOString();
    await postgresClient.query(`
      INSERT INTO agentdesk_tenants (id, name, industry, status, owner_id, plan_id, currency, settings, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        industry = EXCLUDED.industry,
        status = EXCLUDED.status,
        owner_id = EXCLUDED.owner_id,
        plan_id = EXCLUDED.plan_id,
        currency = EXCLUDED.currency,
        settings = EXCLUDED.settings,
        updated_at = EXCLUDED.updated_at
    `, [
      biz.id,
      biz.name || biz.businessName || 'Business',
      biz.industry || 'General',
      biz.status || 'ACTIVE',
      biz.owner_id || biz.ownerId || null,
      biz.plan || 'starter',
      biz.currency || 'USD',
      JSON.stringify(biz),
      biz.createdAt || now,
      now
    ]);
  } catch (err: any) {
    console.warn('[TenantRegistry:PostgresPersistTenantWarning]', err.message);
  }
}

export async function persistAgentToPostgres(agent: any): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return;
    const now = new Date().toISOString();
    await postgresClient.query(`
      INSERT INTO agentdesk_agents (id, tenant_id, public_id, name, config, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        public_id = EXCLUDED.public_id,
        name = EXCLUDED.name,
        config = EXCLUDED.config,
        updated_at = EXCLUDED.updated_at
    `, [
      agent.id,
      agent.tenantId || agent.businessId || '',
      agent.publicId || null,
      agent.name || 'AI Receptionist',
      JSON.stringify(agent),
      agent.createdAt || now,
      now
    ]);
  } catch (err: any) {
    console.warn('[TenantRegistry:PostgresPersistAgentWarning]', err.message);
  }
}

export async function persistKnowledgeToPostgres(item: KnowledgeItem): Promise<boolean> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return false;
    const now = new Date().toISOString();
    await postgresClient.query(`
      INSERT INTO agentdesk_knowledge (id, tenant_id, business_id, title, content, type, category, status, active, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        type = EXCLUDED.type,
        category = EXCLUDED.category,
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `, [
      item.id,
      item.tenantId,
      item.businessId || item.tenantId,
      item.title,
      item.content,
      item.type || 'faq',
      item.category || 'General',
      item.status || 'active',
      item.active !== false,
      JSON.stringify(item),
      item.createdAt || now,
      now
    ]);
    return true;
  } catch (err: any) {
    console.warn('[TenantRegistry:PostgresPersistKnowledgeWarning]', err.message);
    return false;
  }
}

export async function deleteKnowledgeFromPostgres(itemId: string): Promise<boolean> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return false;
    await postgresClient.query(`DELETE FROM agentdesk_knowledge WHERE id = $1`, [itemId]);
    return true;
  } catch (err: any) {
    console.warn('[TenantRegistry:PostgresDeleteKnowledgeWarning]', err.message);
    return false;
  }
}

export async function persistUsageToPostgres(usage: TenantUsageRecord): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return;
    await postgresClient.query(`
      INSERT INTO agentdesk_usage (tenant_id, ai_usage, voice_minutes, knowledge_documents, contacts, last_reset)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_id) DO UPDATE SET
        ai_usage = EXCLUDED.ai_usage,
        voice_minutes = EXCLUDED.voice_minutes,
        knowledge_documents = EXCLUDED.knowledge_documents,
        contacts = EXCLUDED.contacts,
        last_reset = EXCLUDED.last_reset
    `, [
      usage.tenantId,
      usage.aiUsage,
      usage.voiceMinutes,
      usage.knowledgeDocuments,
      usage.contacts,
      usage.lastReset
    ]);
  } catch (err: any) {
    console.warn('[TenantRegistry:PostgresPersistUsageWarning]', err.message);
  }
}

export async function syncAllTenantDataFromPostgres(): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) return;

    // 1. Sync tenants
    const tenantsRes = await postgresClient.query(`SELECT id, settings FROM agentdesk_tenants`);
    if (tenantsRes && tenantsRes.rows) {
      for (const row of tenantsRes.rows) {
        if (row.settings && typeof row.settings === 'object') {
          serverBusinessesStore.set(row.id.toLowerCase(), row.settings);
        }
      }
    }

    // 2. Sync agents
    const agentsRes = await postgresClient.query(`SELECT id, public_id, config FROM agentdesk_agents`);
    if (agentsRes && agentsRes.rows) {
      for (const row of agentsRes.rows) {
        if (row.config && typeof row.config === 'object') {
          serverAgentsStore.set(row.id.toLowerCase(), row.config);
          if (row.public_id) {
            serverAgentsStore.set(row.public_id.toLowerCase(), row.config);
          }
        }
      }
    }

    // 3. Sync knowledge
    const knowledgeRes = await postgresClient.query(`SELECT id, tenant_id, metadata, title, content, type, category, status, active, created_at, updated_at FROM agentdesk_knowledge`);
    if (knowledgeRes && knowledgeRes.rows) {
      for (const row of knowledgeRes.rows) {
        const tId = (row.tenant_id || '').toLowerCase();
        if (tId) {
          const existing = serverKnowledgeStore.get(tId) || [];
          const idx = existing.findIndex(k => k.id === row.id);
          const item: KnowledgeItem = row.metadata && typeof row.metadata === 'object' ? row.metadata : {
            id: row.id,
            tenantId: tId,
            businessId: tId,
            title: row.title,
            content: row.content,
            type: row.type || 'faq',
            category: row.category || 'General',
            status: row.status || 'active',
            active: row.active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
          if (idx >= 0) {
            existing[idx] = item;
          } else {
            existing.push(item);
          }
          serverKnowledgeStore.set(tId, existing);
        }
      }
    }

    // 4. Sync usage
    const usageRes = await postgresClient.query(`SELECT tenant_id, ai_usage, voice_minutes, knowledge_documents, contacts, last_reset FROM agentdesk_usage`);
    if (usageRes && usageRes.rows) {
      for (const row of usageRes.rows) {
        serverTenantUsageStore.set(row.tenant_id.toLowerCase(), {
          tenantId: row.tenant_id.toLowerCase(),
          aiUsage: Number(row.ai_usage) || 0,
          voiceMinutes: Number(row.voice_minutes) || 0,
          knowledgeDocuments: Number(row.knowledge_documents) || 0,
          contacts: Number(row.contacts) || 0,
          lastReset: row.last_reset || new Date().toISOString()
        });
      }
    }
  } catch (err: any) {
    console.warn('[TenantRegistry:PostgresSyncWarning]', err.message);
  }
}

// Initial hydration from Postgres
syncAllTenantDataFromPostgres().catch(() => {});

export function getTenant(tenantId: string): any | null {
  if (!tenantId) return null;
  const norm = tenantId.trim().toLowerCase();
  return serverBusinessesStore.get(norm) || null;
}

export function getAllTenants(): any[] {
  return Array.from(serverBusinessesStore.values());
}

export function setTenant(tenantId: string, businessData: any): any {
  const norm = tenantId.trim().toLowerCase();
  const existing = serverBusinessesStore.get(norm) || {};
  const merged = { ...existing, ...businessData, id: norm, tenantId: norm };
  serverBusinessesStore.set(norm, merged);
  persistTenantToPostgres(merged).catch(() => {});
  return merged;
}

export function deleteTenant(tenantId: string): boolean {
  const norm = tenantId.trim().toLowerCase();
  // Protect system roles
  if (norm === PUBLIC_DEMO_TENANT_ID.toLowerCase() || norm === PLATFORM_ADMIN_TENANT_ID.toLowerCase()) {
    return false;
  }
  serverBusinessesStore.delete(norm);
  serverKnowledgeStore.delete(norm);
  serverTenantUsageStore.delete(norm);
  // Delete agents for this tenant
  for (const [agentId, agent] of Array.from(serverAgentsStore.entries())) {
    if ((agent.tenantId || '').toLowerCase() === norm) {
      serverAgentsStore.delete(agentId);
    }
  }
  return true;
}

export function getAgent(agentId: string): any | null {
  if (!agentId) return null;
  return serverAgentsStore.get(agentId.trim().toLowerCase()) || null;
}

export function getAgentsForTenant(tenantId: string): any[] {
  if (!tenantId) return [];
  const norm = tenantId.trim().toLowerCase();
  const result: any[] = [];
  for (const agent of serverAgentsStore.values()) {
    if ((agent.tenantId || '').trim().toLowerCase() === norm) {
      result.push(agent);
    }
  }
  return result;
}

export function getKnowledgeForTenant(tenantId: string): KnowledgeItem[] {
  if (!tenantId) return [];
  const norm = tenantId.trim().toLowerCase();
  return serverKnowledgeStore.get(norm) || [];
}

export function addKnowledgeItem(tenantId: string, item: any): { success: boolean; item?: KnowledgeItem; error?: string } {
  const norm = tenantId.trim().toLowerCase();
  const biz = getTenant(norm);
  if (!biz) {
    return { success: false, error: 'Tenant does not exist.' };
  }

  // Enforce plan limits
  const planLimits = getPlanUsageLimits(biz.plan || 'starter');
  const existing = serverKnowledgeStore.get(norm) || [];
  const maxDocs = typeof planLimits.knowledgeDocuments === 'number' ? planLimits.knowledgeDocuments : 25;
  if (existing.length >= maxDocs) {
    return {
      success: false,
      error: `Knowledge base limit of ${maxDocs} items reached for the ${biz.plan || 'current'} plan. Upgrade your plan to add more.`
    };
  }

  const newItem: KnowledgeItem = {
    id: item.id || `k-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    tenantId: norm,
    businessId: norm,
    title: item.title || 'Untitled Knowledge',
    type: item.type || 'text',
    content: item.content || '',
    category: item.category || 'General',
    status: 'active',
    active: true,
    tags: item.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  existing.push(newItem);
  serverKnowledgeStore.set(norm, existing);
  persistKnowledgeToPostgres(newItem).catch(() => {});
  return { success: true, item: newItem };
}

export function deleteKnowledgeItem(tenantId: string, itemId: string): boolean {
  const norm = tenantId.trim().toLowerCase();
  const existing = serverKnowledgeStore.get(norm) || [];
  const filtered = existing.filter(k => k.id !== itemId);
  if (filtered.length !== existing.length) {
    serverKnowledgeStore.set(norm, filtered);
    deleteKnowledgeFromPostgres(itemId).catch(() => {});
    return true;
  }
  return false;
}

export function getPlanUsageLimits(planId: string): PlanUsageLimits {
  const plan = DEFAULT_PLAN_CONFIGS[planId] || DEFAULT_PLAN_CONFIGS.starter;
  return plan.usageLimits;
}

export function getTenantUsage(tenantId: string): TenantUsageRecord {
  const norm = tenantId.trim().toLowerCase();
  if (!serverTenantUsageStore.has(norm)) {
    const record: TenantUsageRecord = {
      tenantId: norm,
      aiUsage: 0,
      voiceMinutes: 0,
      knowledgeDocuments: (serverKnowledgeStore.get(norm) || []).length,
      contacts: 0,
      lastReset: new Date().toISOString()
    };
    serverTenantUsageStore.set(norm, record);
  }
  const rec = serverTenantUsageStore.get(norm)!;
  rec.knowledgeDocuments = (serverKnowledgeStore.get(norm) || []).length;
  return rec;
}

export function recordTenantUsage(tenantId: string, metric: 'aiUsage' | 'voiceMinutes', amount: number = 1): boolean {
  const norm = tenantId.trim().toLowerCase();
  const usage = getTenantUsage(norm);
  usage[metric] += amount;
  persistUsageToPostgres(usage).catch(() => {});
  return true;
}

export function resetTenantQuota(tenantId: string): TenantUsageRecord {
  const norm = tenantId.trim().toLowerCase();
  const record: TenantUsageRecord = {
    tenantId: norm,
    aiUsage: 0,
    voiceMinutes: 0,
    knowledgeDocuments: (serverKnowledgeStore.get(norm) || []).length,
    contacts: 0,
    lastReset: new Date().toISOString()
  };
  serverTenantUsageStore.set(norm, record);
  persistUsageToPostgres(record).catch(() => {});
  return record;
}

export function checkTenantQuota(tenantId: string, metric: 'aiUsage' | 'voiceMinutes'): { allowed: boolean; used: number; limit: number; error?: string } {
  const norm = tenantId.trim().toLowerCase();
  // Bypass quota for platform admin and demo
  if (norm === PLATFORM_ADMIN_TENANT_ID.toLowerCase() || norm === PUBLIC_DEMO_TENANT_ID.toLowerCase()) {
    return { allowed: true, used: 0, limit: 999999 };
  }

  const biz = getTenant(norm);
  const planId = biz?.plan || 'starter';
  const limits = getPlanUsageLimits(planId);
  const usage = getTenantUsage(norm);

  const limitVal = metric === 'aiUsage'
    ? (typeof limits.aiUsage === 'number' ? limits.aiUsage : 2000)
    : limits.voiceMinutes;

  const usedVal = usage[metric];

  if (usedVal >= limitVal) {
    return {
      allowed: false,
      used: usedVal,
      limit: limitVal,
      error: `Plan quota exceeded: ${usedVal}/${limitVal} ${metric}. Please upgrade your plan.`
    };
  }

  return { allowed: true, used: usedVal, limit: limitVal };
}

/**
 * Transactionally provisions a new customer tenant after verified payment.
 * Guarantees strict isolation, dedicated agent, dedicated knowledge base, and plan limits.
 */
export function provisionCustomerTenant(params: {
  tenantId: string;
  businessName: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  planId: string;
  currency: string;
  paymentId?: string;
  orderId?: string;
}): { success: boolean; business: Business; agent: AIAgent } {
  const {
    tenantId,
    businessName,
    customerName,
    customerEmail,
    customerPhone = '+1 (555) 000-0000',
    planId,
    currency,
    paymentId,
    orderId
  } = params;

  const normTenant = tenantId.trim().toLowerCase();

  // Enforce separation from Demo and Admin
  if (
    normTenant === PUBLIC_DEMO_TENANT_ID.toLowerCase() ||
    normTenant === PLATFORM_ADMIN_TENANT_ID.toLowerCase() ||
    normTenant === 'demo' ||
    normTenant === 'admin'
  ) {
    throw new Error(`Forbidden: Tenant ID "${normTenant}" is reserved for system environments.`);
  }

  const planKey = (planId || 'starter').toLowerCase();
  const planConfig = DEFAULT_PLAN_CONFIGS[planKey] || DEFAULT_PLAN_CONFIGS.starter;
  const usageLimits = planConfig.usageLimits;

  const primaryAgentId = `agent-${normTenant}`;

  // 1. Check if already provisioned (idempotent provision)
  const existingBiz = serverBusinessesStore.get(normTenant);
  if (existingBiz && existingBiz.status === 'active' && existingBiz.subscriptionState === 'ACTIVE') {
    const existingAgent = serverAgentsStore.get(primaryAgentId) || serverAgentsStore.get(existingBiz.primaryAgentId);
    return {
      success: true,
      business: existingBiz,
      agent: existingAgent
    };
  }

  // 2. Create the Customer Business Tenant
  const newBusiness: any = {
    id: normTenant,
    tenantId: normTenant,
    tenant_id: normTenant,
    tenantType: 'customer',
    isDemo: false,
    name: businessName.trim(),
    industry: 'Professional Services',
    website: `https://${normTenant}.agentdesk.ai`,
    supportEmail: customerEmail.trim(),
    phone: customerPhone.trim(),
    currency,
    plan: planKey,
    planStatus: 'active',
    status: 'active',
    subscriptionState: 'ACTIVE',
    primaryAgentId,
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    agentSettings: {
      agentName: `${businessName.trim()} AI Receptionist`,
      welcomeMessage: `Hello! Welcome to ${businessName.trim()}. How can I help you today?`,
      businessDescription: `Autonomous AI Sales Receptionist and CRM assistant for ${businessName.trim()}.`,
      tone: 'Friendly & Professional',
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      suggestedQuestions: [
        `What services does ${businessName.trim()} offer?`,
        'How can I book an appointment or consultation?',
        'How do I contact customer support?'
      ],
      systemSecurityInstructions: `Strict multi-tenant security instructions. You represent ${businessName.trim()} ONLY. Never reveal internal IDs or details from other companies.`,
      humanHandoffEnabled: true,
      leadCaptureEnabled: true
    },
    usageLimits,
    trialDaysRemaining: 30,
    whiteLabelEnabled: planKey === 'growth' || planKey === 'scale',
    paymentVerified: true,
    lastPaymentId: paymentId,
    lastOrderId: orderId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  serverBusinessesStore.set(normTenant, newBusiness);

  // 3. Create Dedicated Customer AI Agent (belongs strictly to this tenant)
  const newAgent: any = {
    id: primaryAgentId,
    publicId: primaryAgentId,
    tenantId: normTenant,
    businessId: normTenant,
    name: `${businessName.trim()} AI Receptionist`,
    role: 'AI Sales Receptionist & Inbound Lead Qualifier',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    voice: 'Aoede (Warm, Professional)',
    status: 'active',
    phone: customerPhone.trim(),
    systemPrompt: `You are the executive AI Receptionist for ${businessName.trim()}. Warmly greet inbound inquiries, qualify customer needs, and book appointments seamlessly.`,
    greeting: `Hello! Thank you for contacting ${businessName.trim()}. How can I assist you today?`,
    temperature: 0.7,
    capabilities: {
      voiceCalls: true,
      webChat: true,
      sms: true,
      whatsapp: planKey === 'growth' || planKey === 'scale',
      appointmentBooking: true,
      leadScoring: true,
      coldOutreach: planKey === 'scale',
      reviewManagement: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  serverAgentsStore.set(primaryAgentId, newAgent);

  // 4. Initialize Dedicated Knowledge Base for Tenant
  const initialKnowledge: KnowledgeItem[] = [
    {
      id: `k-${normTenant}-welcome`,
      tenantId: normTenant,
      businessId: normTenant,
      title: `Welcome & Overview for ${businessName.trim()}`,
      type: 'text',
      content: `${businessName.trim()} provides premium services. Our office contact is ${customerPhone.trim()} and email is ${customerEmail.trim()}. We assist clients with consultations, service inquiries, and scheduling.`,
      category: 'Overview',
      status: 'active',
      active: true,
      tags: ['overview', 'contact', 'services'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  serverKnowledgeStore.set(normTenant, initialKnowledge);

  // 5. Initialize Usage Limits
  serverTenantUsageStore.set(normTenant, {
    tenantId: normTenant,
    aiUsage: 0,
    voiceMinutes: 0,
    knowledgeDocuments: initialKnowledge.length,
    contacts: 0,
    lastReset: new Date().toISOString()
  });

  // 6. Activate User Account & Assign BUSINESS_ADMIN Role with secure credentials
  let user = getUserByEmail(customerEmail);
  if (user) {
    updateUser(user.id, {
      tenantId: normTenant,
      role: 'BUSINESS_ADMIN',
      status: 'ACTIVE'
    });
    newBusiness.owner_id = user.id;
    newBusiness.ownerId = user.id;
  } else {
    // Generate secure randomized password placeholder (never exposed in cleartext)
    const secureRandomPassword = generateSecureToken(16);
    const createdUser = createUser({
      name: customerName || `${businessName} Admin`,
      email: customerEmail,
      passwordPlain: secureRandomPassword,
      role: 'BUSINESS_ADMIN',
      tenantId: normTenant,
      status: 'ACTIVE',
      emailVerified: true
    });
    newBusiness.owner_id = createdUser.id;
    newBusiness.ownerId = createdUser.id;
  }

  // Persist newly provisioned entities to PostgreSQL
  persistTenantToPostgres(newBusiness).catch(() => {});
  persistAgentToPostgres(newAgent).catch(() => {});
  for (const k of initialKnowledge) {
    persistKnowledgeToPostgres(k).catch(() => {});
  }
  persistUsageToPostgres(serverTenantUsageStore.get(normTenant)!).catch(() => {});

  console.log(`[Tenant Provisioning] Successfully provisioned tenant "${normTenant}" with plan "${planKey}" for customer "${customerEmail}"`);

  return {
    success: true,
    business: newBusiness,
    agent: newAgent
  };
}
