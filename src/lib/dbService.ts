import { 
  Business, 
  AIAgent,
  Lead, 
  Contact, 
  Company, 
  Deal, 
  CallRecord, 
  MissedCallRecovery, 
  Appointment, 
  Estimate, 
  FollowUpTask, 
  ReEngagementAudience, 
  CustomerReview, 
  ColdOutreachCampaign, 
  KnowledgeItem, 
  DashboardWidgetConfig, 
  IntegrationStatus,
  NotificationItem,
  AuditLog,
  TimelineEvent,
  Conversation,
  AnalyticsSummary,
  OnboardingStep,
  UsageAlertStatus,
  UnansweredQuestion,
  BillingInfo,
  InvoiceItem,
  PlanUsageLimits,
  UsageMetricItem,
  UserProfile
} from '../types';

import { DEFAULT_PLAN_CONFIGS, PlanConfig, normalizePlanId, formatPrice, getPlanConfig, CurrencyCode } from '../data/pricing';

import { 
  SEED_BUSINESSES, 
  SEED_AGENTS,
  SEED_KNOWLEDGE_DOCS, 
  SEED_LEADS, 
  SEED_CONTACTS, 
  SEED_DEALS, 
  SEED_CALLS, 
  SEED_MISSED_CALLS, 
  SEED_APPOINTMENTS, 
  SEED_ESTIMATES, 
  SEED_FOLLOW_UPS, 
  SEED_RE_ENGAGEMENT, 
  SEED_REVIEWS, 
  SEED_CAMPAIGNS, 
  SEED_INTEGRATIONS, 
  DEFAULT_DASHBOARD_WIDGETS, 
  SEED_NOTIFICATIONS, 
  SEED_AUDIT_LOGS,
  PUBLIC_DEMO_TENANT_ID,
  SUMMIT_ID,
  SHARMA_ID,
  LONDON_ID,
  ACME_TENANT_ID,
  BETA_TENANT_ID
} from '../data/seedData';

function getCsrfTokenFromDocument(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)agentdesk_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  const timeoutMs = 12000;
  const controller = new AbortController();
  const timeoutId = typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
  const method = (options?.method || 'GET').toUpperCase();

  let csrfToken = getCsrfTokenFromDocument();
  if (!csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && typeof window !== 'undefined' && !url.includes('/api/auth/csrf')) {
    try {
      const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
      const csrfJson = await csrfRes.json().catch(() => null);
      if (csrfJson?.csrfToken) {
        csrfToken = csrfJson.csrfToken;
      } else {
        csrfToken = getCsrfTokenFromDocument();
      }
    } catch {}
  }

  const customHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(options?.headers as Record<string, string> || {})
  };

  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    customHeaders['x-csrf-token'] = csrfToken;
  }

  const requestOptions: RequestInit = {
    ...options,
    credentials: options?.credentials || 'include',
    signal: options?.signal || controller.signal,
    headers: customHeaders
  };

  try {
    const res = await fetch(url, requestOptions);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    const error = err?.name === 'AbortError'
      ? new Error(`Request timed out after ${timeoutMs / 1000}s: ${url}`)
      : err;
    console.warn(`[safeFetchJson] Notice while fetching ${url}:`, error?.message || error);
    throw error;
  } finally {
    if (timeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeoutId);
    }
  }
}

import {
  firestoreTenant,
  TenantSecurityException,
  validateTenantContext,
  normalizeTenantId,
  tenantFilterArray,
  tenantValidateEntityMutation,
  tenantAssertDocOwnership,
  createTenantQuery,
  tenantGetDocs,
  tenantGetDoc,
  tenantSetDoc,
  tenantUpdateDoc,
  tenantDeleteDoc
} from './firestoreTenantHelper';

export {
  firestoreTenant,
  TenantSecurityException,
  validateTenantContext,
  normalizeTenantId,
  tenantFilterArray,
  tenantValidateEntityMutation,
  tenantAssertDocOwnership,
  createTenantQuery,
  tenantGetDocs,
  tenantGetDoc,
  tenantSetDoc,
  tenantUpdateDoc,
  tenantDeleteDoc
};

const PREFIX = 'ai_revenueos_';

// Demo fixtures are useful for local development and the public demo, but must never
// become tenant data in a production customer workspace.
const PRODUCTION_DATA_KEYS = new Set([
  'businesses',
  'agents',
  'knowledge',
  'leads',
  'contacts',
  'deals',
  'calls',
  'missed_calls',
  'appointments',
  'estimates',
  'follow_ups',
  're_engagement',
  'reviews',
  'campaigns',
  'integrations',
  'notifications',
  'audit_logs'
]);

const PRODUCTION_SEED_TENANT_IDS = new Set([
  PUBLIC_DEMO_TENANT_ID,
  SUMMIT_ID,
  SHARMA_ID,
  LONDON_ID,
  ACME_TENANT_ID,
  BETA_TENANT_ID
]);

const memoryStorage = new Map<string, string>();

function isProductionRuntime(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return true;
  }
  try {
    return typeof import.meta !== 'undefined' && Boolean((import.meta as any)?.env?.PROD);
  } catch {
    return false;
  }
}

function isSeedTenantRecord(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value.isDemo === true) return true;

  const tenantId = value.tenant_id || value.tenantId || value.businessId;
  return typeof tenantId === 'string' && PRODUCTION_SEED_TENANT_IDS.has(tenantId);
}

function sanitizeProductionData<T>(key: string, value: T): T {
  if (!isProductionRuntime() || !PRODUCTION_DATA_KEYS.has(key)) return value;

  if (Array.isArray(value)) {
    return value.filter(item => !isSeedTenantRecord(item)) as T;
  }

  return value;
}

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStorage.get(key) || null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, value);
    }
  } catch {}
  memoryStorage.set(key, value);
}

function getItem<T>(key: string, defaultVal: T): T {
  try {
    const saved = getStorageItem(PREFIX + key);
    if (saved) {
      return sanitizeProductionData(key, JSON.parse(saved));
    }
  } catch (e) {
    console.error('Error reading from storage', e);
  }

  // Production never falls back to demo/customer fixtures.
  if (isProductionRuntime() && PRODUCTION_DATA_KEYS.has(key)) {
    return Array.isArray(defaultVal) ? ([] as unknown as T) : defaultVal;
  }

  return defaultVal;
}

function setItem<T>(key: string, val: T): void {
  try {
    setStorageItem(PREFIX + key, JSON.stringify(val));
    notifyDataChanged(key);
  } catch (e) {
    console.error('Error saving to storage', e);
  }
}

export function notifyDataChanged(entityName: string) {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('revenueos_data_changed', { detail: { entity: entityName } }));
    }
  } catch (e) {}
}

export function subscribeToDataChanges(callback: (entity: string) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = (e: any) => {
    callback(e.detail?.entity || 'all');
  };
  const storageHandler = () => callback('storage');

  window.addEventListener('revenueos_data_changed', handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('revenueos_data_changed', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

// ----------------------------------------------------
// INITIALIZATION / RESET
// ----------------------------------------------------

export function initializeDatabaseIfNeeded() {
  // Never initialize customer-facing production storage with demo fixtures.
  if (isProductionRuntime()) return;

  if (!getStorageItem(PREFIX + 'initialized_v1')) {
    resetAllToSeedData();
    setStorageItem(PREFIX + 'initialized_v1', 'true');
  }
}

export function resetAllToSeedData() {
  setItem('businesses', SEED_BUSINESSES);
  setItem('agents', SEED_AGENTS);
  setItem('knowledge', SEED_KNOWLEDGE_DOCS);
  setItem('leads', SEED_LEADS);
  setItem('contacts', SEED_CONTACTS);
  setItem('deals', SEED_DEALS);
  setItem('calls', SEED_CALLS);
  setItem('missed_calls', SEED_MISSED_CALLS);
  setItem('appointments', SEED_APPOINTMENTS);
  setItem('estimates', SEED_ESTIMATES);
  setItem('follow_ups', SEED_FOLLOW_UPS);
  setItem('re_engagement', SEED_RE_ENGAGEMENT);
  setItem('reviews', SEED_REVIEWS);
  setItem('campaigns', SEED_CAMPAIGNS);
  setItem('integrations', SEED_INTEGRATIONS);
  setItem('widgets', DEFAULT_DASHBOARD_WIDGETS);
  setItem('notifications', SEED_NOTIFICATIONS);
  setItem('audit_logs', SEED_AUDIT_LOGS);
  notifyDataChanged('all');
}

// ----------------------------------------------------
// ORGANIZATIONS / BUSINESSES (TENANTS)
// ----------------------------------------------------

let inFlightFetchBusinesses: Promise<Business[]> | null = null;

export async function getAllBusinesses(): Promise<Business[]> {
  initializeDatabaseIfNeeded();
  const localList = getItem<Business[]>('businesses', SEED_BUSINESSES);

  if (typeof window === 'undefined') {
    return localList;
  }

  if (inFlightFetchBusinesses) {
    return inFlightFetchBusinesses;
  }

  inFlightFetchBusinesses = (async () => {
    try {
      const data = await safeFetchJson('/api/tenants', {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (data?.success && Array.isArray(data.tenants) && data.tenants.length > 0) {
        const merged = [...localList];
        for (const st of data.tenants) {
          const sId = normalizeTenantId(st.id);
          const idx = merged.findIndex(b => normalizeTenantId(b.id) === sId || normalizeTenantId(b.tenantId) === sId);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...st };
          } else {
            merged.push(st);
          }
        }
        setItem('businesses', merged);
        return merged;
      }
    } catch (err) {
      // Graceful fallback to local storage
    } finally {
      inFlightFetchBusinesses = null;
    }
    return localList;
  })();

  return inFlightFetchBusinesses;
}

export async function getBusinessById(businessId: string): Promise<Business | null> {
  if (!businessId) return null;
  const list = await getAllBusinesses();
  const targetId = normalizeTenantId(businessId);
  let found = list.find(b => normalizeTenantId(b.id) === targetId || normalizeTenantId(b.tenantId) === targetId);

  if (!found && typeof window !== 'undefined') {
    try {
      const data = await safeFetchJson(`/api/tenants/${encodeURIComponent(businessId)}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (data?.success && data.tenant) {
        found = data.tenant;
        const currentList = getItem<Business[]>('businesses', SEED_BUSINESSES);
        const existingIdx = currentList.findIndex(b => normalizeTenantId(b.id) === targetId);
        if (existingIdx >= 0) {
          currentList[existingIdx] = found!;
        } else {
          currentList.push(found);
        }
        setItem('businesses', currentList);
      }
    } catch (err) {
      // Non-fatal
    }
  }

  return found || null;
}

export async function saveBusiness(business: Business): Promise<void> {
  const validTenant = validateTenantContext(business.id || business.tenantId, 'businesses', 'SAVE_BUSINESS');
  const guardedBiz = tenantValidateEntityMutation(business, validTenant, 'businesses');
  const list = await getAllBusinesses();
  const index = list.findIndex(b => normalizeTenantId(b.id) === validTenant);
  if (index >= 0) {
    list[index] = { ...guardedBiz, updatedAt: new Date().toISOString() };
  } else {
    list.push({ ...guardedBiz, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  setItem('businesses', list);
  await addAuditLog(guardedBiz.id, 'admin@ai-revenueos.internal', 'ORGANIZATION_UPDATED', guardedBiz.name, 'Updated organization branding or AI settings');
}

// ----------------------------------------------------
// AI AGENTS (MULTI-TENANT ISOLATED)
// ----------------------------------------------------

export async function getAllAgents(): Promise<AIAgent[]> {
  initializeDatabaseIfNeeded();
  return getItem<AIAgent[]>('agents', SEED_AGENTS);
}

export async function getAgentById(agentId: string): Promise<AIAgent | null> {
  if (!agentId) return null;
  const list = await getAllAgents();
  const targetId = agentId.trim().toLowerCase();
  return list.find(a => a.id.toLowerCase() === targetId) || null;
}

export async function getAgentsByTenantId(tenantId: string): Promise<AIAgent[]> {
  if (!tenantId) return [];
  const validTenant = validateTenantContext(tenantId, 'agents', 'GET_AGENTS_BY_TENANT');
  const list = await getAllAgents();
  return tenantFilterArray(list, validTenant, 'agents');
}

export async function saveAgent(agent: AIAgent): Promise<void> {
  const validTenant = validateTenantContext(agent.tenantId, 'agents', 'SAVE_AGENT');
  const guardedAgent = tenantValidateEntityMutation(agent, validTenant, 'agents');
  const list = await getAllAgents();
  const index = list.findIndex(a => a.id === guardedAgent.id);
  if (index >= 0) {
    list[index] = { ...guardedAgent, updatedAt: new Date().toISOString() };
  } else {
    list.push({ ...guardedAgent, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  setItem('agents', list);
  notifyDataChanged('agents');
}

export async function resolveAgentAndTenant(identifier?: string): Promise<{ agent: AIAgent | null; tenant: Business | null }> {
  if (!identifier) {
    return { agent: null, tenant: null };
  }

  const cleanId = identifier.trim().toLowerCase();

  // 1. Try resolving by agentId
  const allAgents = await getAllAgents();
  const matchingAgent = allAgents.find(a => a.id.toLowerCase() === cleanId);
  if (matchingAgent) {
    const tenant = await getBusinessById(matchingAgent.tenantId);
    return { agent: matchingAgent, tenant };
  }

  // 2. Try resolving by tenantId
  const tenant = await getBusinessById(cleanId);
  if (tenant) {
    const tenantAgents = allAgents.filter(a => normalizeTenantId(a.tenantId) === normalizeTenantId(tenant.id));
    const agent = (tenant.primaryAgentId && tenantAgents.find(a => a.id === tenant.primaryAgentId)) || tenantAgents[0] || null;
    return { agent, tenant };
  }

  return { agent: null, tenant: null };
}

export async function createCustomerTenant(params: {
  name: string;
  industry: string;
  userEmail: string;
  userName?: string;
  plan?: string;
  country?: string;
  currency?: string;
}): Promise<{ tenant: Business; agent: AIAgent; user: UserProfile }> {
  const slug = params.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const timestamp = Date.now();
  const tenantId = `tenant_${slug}_${timestamp}`;
  const agentId = `agent_${slug}_${timestamp}`;
  const userId = `user_${slug}_${timestamp}`;

  const newTenant: Business = {
    id: tenantId,
    tenantId: tenantId,
    tenant_id: tenantId,
    tenantType: 'customer',
    isDemo: false,
    primaryAgentId: agentId,
    name: params.name,
    industry: params.industry,
    description: `${params.name} - professional services in ${params.industry}`,
    website: `https://${slug}.com`,
    supportEmail: params.userEmail,
    country: params.country || 'US',
    currency: (params.currency as any) || 'USD',
    plan: params.plan || 'GROWTH',
    status: 'active',
    agentSettings: {
      agentName: `${params.name} Sales Agent`,
      welcomeMessage: `Hi! Welcome to ${params.name}. How can I assist you today?`,
      businessDescription: `${params.name} provides ${params.industry} solutions.`,
      tone: 'Professional',
      primaryColor: '#2563eb',
      secondaryColor: '#0f172a',
      humanHandoffEnabled: true,
      leadCaptureEnabled: true,
      minQualificationScore: 60,
      suggestedQuestions: [
        `What services does ${params.name} offer?`,
        'How much do your services cost?',
        'Can I schedule a consultation?'
      ],
      customInstructions: `Strict tenant isolation. You represent ${params.name} ONLY. Provide accurate information about ${params.industry}.`,
      qualificationRules: [
        { id: 'q1', question: 'What specific service or requirement do you have?', field: 'service_interest', required: true, scoreWeight: 40 },
        { id: 'q2', question: 'What is your estimated timeline for this project?', field: 'timeline', required: true, scoreWeight: 30 },
        { id: 'q3', question: 'What budget range have you allocated?', field: 'budget', required: false, scoreWeight: 30 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const newAgent: AIAgent = {
    id: agentId,
    tenantId: tenantId,
    name: `${params.name} Sales Agent`,
    status: 'active',
    isDemo: false,
    role: 'AI Sales & Admissions Assistant',
    tone: 'Friendly',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    suggestedQuestions: [
      `What services does ${params.name} offer?`,
      'How much do your services cost?',
      'Can I schedule a consultation?'
    ],
    welcomeMessage: `Hi! Welcome to ${params.name}. How can I assist you today?`,
    leadCaptureEnabled: true,
    humanHandoffEnabled: true,
    qualificationRules: newTenant.agentSettings?.qualificationRules,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const newUser: UserProfile = {
    uid: userId,
    email: params.userEmail,
    displayName: params.userName || params.name + ' Admin',
    role: 'TENANT_ADMIN',
    businessId: tenantId,
    tenantId: tenantId,
    createdAt: new Date().toISOString()
  };

  await saveBusiness(newTenant);
  await saveAgent(newAgent);

  return { tenant: newTenant, agent: newAgent, user: newUser };
}

// ----------------------------------------------------
// LEADS (STRICT TENANT FILTERING)
// ----------------------------------------------------

export async function getLeads(businessId: string): Promise<Lead[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'leads', 'GET_LEADS');

  // Production dashboard reads the server PostgreSQL source of truth.
  if (typeof window !== 'undefined' && isProductionRuntime()) {
    try {
      const data = await safeFetchJson('/api/leads', { headers: { 'Accept': 'application/json' } });
      if (data?.success && Array.isArray(data.leads)) return data.leads as Lead[];
    } catch (err) {
      console.warn('[getLeads] Server lead API unavailable:', (err as any)?.message || err);
    }
  }

  const allLeads = getItem<Lead[]>('leads', SEED_LEADS);
  return tenantFilterArray(allLeads, validTenant, 'leads');
}

export async function saveLead(lead: Partial<Lead> & { businessId: string; name: string }): Promise<Lead> {
  const targetTenant = lead.tenant_id || lead.tenantId || lead.businessId;
  const validTenant = validateTenantContext(targetTenant, 'leads', 'SAVE_LEAD');

  // Website chat submits directly to the tenant-scoped server API.
  if (typeof window !== 'undefined' && isProductionRuntime()) {
    const data = await safeFetchJson('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ ...lead, tenantId: validTenant, businessId: validTenant })
    });
    if (data?.success && data.lead) return data.lead as Lead;
    throw new Error(data?.error || 'Unable to save lead.');
  }

  const allLeads = getItem<Lead[]>('leads', SEED_LEADS);
  const index = lead.id ? allLeads.findIndex(l => l.id === lead.id) : -1;
  let savedLead: Lead;

  if (index >= 0) {
    tenantAssertDocOwnership(allLeads[index], validTenant, 'leads', lead.id);
    savedLead = tenantValidateEntityMutation({
      ...allLeads[index], ...lead, updatedAt: new Date().toISOString()
    }, validTenant, 'leads') as Lead;
    allLeads[index] = savedLead;
  } else {
    const rawLead: Lead = {
      score: 80, scoreCategory: 'HOT', value: 1200, email: '', phone: '',
      status: 'new', source: 'website_chat', ...lead,
      id: lead.id || 'lead-' + Date.now(), businessId: validTenant,
      createdAt: lead.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Lead;
    savedLead = tenantValidateEntityMutation(rawLead, validTenant, 'leads') as Lead;
    allLeads.unshift(savedLead);
    await ensureContactForLead(savedLead);
  }

  setItem('leads', allLeads);
  return savedLead;
}
export const addLead = saveLead;

export async function deleteLead(leadId: string, businessId?: string): Promise<void> {
  const allLeads = getItem<Lead[]>('leads', SEED_LEADS);
  const existing = allLeads.find(l => l.id === leadId);
  if (existing && businessId) {
    tenantAssertDocOwnership(existing, businessId, 'leads', leadId);
  }
  const filtered = allLeads.filter(l => l.id !== leadId);
  setItem('leads', filtered);
}

// ----------------------------------------------------
// CONTACTS & CRM 360-DEGREE TIMELINE
// ----------------------------------------------------

export async function getContacts(businessId: string): Promise<Contact[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'contacts', 'GET_CONTACTS');
  const all = getItem<Contact[]>('contacts', SEED_CONTACTS);
  return tenantFilterArray(all, validTenant, 'contacts');
}

export async function saveContact(contact: Contact): Promise<Contact> {
  const targetTenant = contact.tenant_id || contact.tenantId || contact.businessId;
  const validTenant = validateTenantContext(targetTenant, 'contacts', 'SAVE_CONTACT');
  const all = getItem<Contact[]>('contacts', SEED_CONTACTS);
  const index = all.findIndex(c => c.id === contact.id);
  let saved: Contact;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'contacts', contact.id);
    saved = tenantValidateEntityMutation({ ...contact, updatedAt: new Date().toISOString() }, validTenant, 'contacts') as Contact;
    all[index] = saved;
  } else {
    const rawContact: Contact = {
      ...contact,
      id: contact.id || `c-${Date.now()}`,
      businessId: validTenant,
      createdAt: contact.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: contact.timeline || []
    };
    saved = tenantValidateEntityMutation(rawContact, validTenant, 'contacts') as Contact;
    all.unshift(saved);
  }

  setItem('contacts', all);
  return saved;
}

export async function addTimelineEventToContact(
  contactIdOrEmail: string, 
  businessId: string, 
  event: Omit<TimelineEvent, 'id' | 'timestamp'>
): Promise<void> {
  const validTenant = validateTenantContext(businessId, 'contacts', 'ADD_TIMELINE_EVENT');
  const contacts = await getContacts(validTenant);
  const contact = contacts.find(c => 
    c.id === contactIdOrEmail || 
    (c.email && c.email.toLowerCase() === contactIdOrEmail.toLowerCase()) || 
    c.phone === contactIdOrEmail
  );

  if (contact) {
    const newEvent: TimelineEvent = {
      id: `tl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tenant_id: validTenant,
      tenantId: validTenant,
      timestamp: new Date().toISOString(),
      ...event
    };
    contact.timeline = [newEvent, ...(contact.timeline || [])];
    contact.lastInteraction = newEvent.timestamp;
    await saveContact(contact);
  }
}

async function ensureContactForLead(lead: Lead) {
  const validTenant = validateTenantContext(lead.businessId, 'contacts', 'ENSURE_CONTACT');
  const contacts = await getContacts(validTenant);
  let contact = contacts.find(c => 
    (lead.email && c.email && c.email.toLowerCase() === lead.email.toLowerCase()) || 
    (lead.phone && c.phone && c.phone === lead.phone)
  );
  
  if (!contact) {
    const biz = await getBusinessById(validTenant);
    const sourceStr = typeof lead.source === 'string' ? lead.source : 'inbound';
    contact = {
      id: `c-${Date.now()}`,
      tenant_id: validTenant,
      tenantId: validTenant,
      businessId: validTenant,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      country: biz?.country || 'US',
      tags: ['Lead Inbound', lead.scoreCategory || 'HOT'],
      totalRevenue: lead.value || 0,
      optOut: false,
      preferredChannel: biz?.country === 'IN' ? 'WhatsApp' : 'SMS',
      lastInteraction: new Date().toISOString(),
      status: 'lead',
      timeline: [
        {
          id: `tl-${Date.now()}`,
          tenant_id: validTenant,
          tenantId: validTenant,
          timestamp: new Date().toISOString(),
          type: 'lead_created',
          title: `Lead Captured (${sourceStr.replace(/_/g, ' ')})`,
          description: `Score: ${lead.score || 0}/100. ${lead.aiScoreExplanation || ''}`
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await saveContact(contact);
  }
}

// ----------------------------------------------------
// DEALS & KANBAN PIPELINE
// ----------------------------------------------------

export async function getDeals(businessId: string): Promise<Deal[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'deals', 'GET_DEALS');
  const all = getItem<Deal[]>('deals', SEED_DEALS);
  return tenantFilterArray(all, validTenant, 'deals');
}

export async function saveDeal(deal: Deal): Promise<Deal> {
  const targetTenant = deal.tenant_id || deal.tenantId || deal.businessId;
  const validTenant = validateTenantContext(targetTenant, 'deals', 'SAVE_DEAL');
  const all = getItem<Deal[]>('deals', SEED_DEALS);
  const index = all.findIndex(d => d.id === deal.id);
  let saved: Deal;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'deals', deal.id);
    saved = tenantValidateEntityMutation({ ...deal, updatedAt: new Date().toISOString() }, validTenant, 'deals') as Deal;
    all[index] = saved;
  } else {
    const rawDeal: Deal = {
      ...deal,
      id: deal.id || `deal-${Date.now()}`,
      businessId: validTenant,
      createdAt: deal.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawDeal, validTenant, 'deals') as Deal;
    all.unshift(saved);
  }

  setItem('deals', all);
  return saved;
}

// ----------------------------------------------------
// CALLS & VOICE RECEPTIONIST
// ----------------------------------------------------

export async function getCalls(businessId: string): Promise<CallRecord[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'calls', 'GET_CALLS');
  const all = getItem<CallRecord[]>('calls', SEED_CALLS);
  return tenantFilterArray(all, validTenant, 'calls');
}

export async function saveCall(call: CallRecord): Promise<CallRecord> {
  const targetTenant = call.tenant_id || call.tenantId || call.businessId;
  const validTenant = validateTenantContext(targetTenant, 'calls', 'SAVE_CALL');
  const all = getItem<CallRecord[]>('calls', SEED_CALLS);
  const index = all.findIndex(c => c.id === call.id);
  let saved: CallRecord;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'calls', call.id);
    saved = tenantValidateEntityMutation({ ...call }, validTenant, 'calls') as CallRecord;
    all[index] = saved;
  } else {
    const rawCall: CallRecord = {
      ...call,
      id: call.id || `call-${Date.now()}`,
      businessId: validTenant,
      createdAt: call.createdAt || new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawCall, validTenant, 'calls') as CallRecord;
    all.unshift(saved);
  }

  setItem('calls', all);
  return saved;
}

// ----------------------------------------------------
// MISSED CALL TEXT BACK RECOVERY
// ----------------------------------------------------

export async function getMissedCallRecoveries(businessId?: string): Promise<MissedCallRecovery[]> {
  initializeDatabaseIfNeeded();
  const all = getItem<MissedCallRecovery[]>('missed_calls', SEED_MISSED_CALLS);
  if (!businessId) return all;
  const validTenant = validateTenantContext(businessId, 'missed_calls', 'GET_MISSED_CALLS');
  return tenantFilterArray(all, validTenant, 'missed_calls');
}

export const getMissedCalls = getMissedCallRecoveries;

export async function saveMissedCallRecovery(item: MissedCallRecovery): Promise<MissedCallRecovery> {
  const targetTenant = item.tenant_id || item.tenantId || item.businessId;
  const validTenant = validateTenantContext(targetTenant, 'missed_calls', 'SAVE_MISSED_CALL');
  const all = getItem<MissedCallRecovery[]>('missed_calls', SEED_MISSED_CALLS);
  const index = all.findIndex(m => m.id === item.id);
  let saved: MissedCallRecovery;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'missed_calls', item.id);
    saved = tenantValidateEntityMutation({ ...item }, validTenant, 'missed_calls') as MissedCallRecovery;
    all[index] = saved;
  } else {
    const rawItem: MissedCallRecovery = {
      ...item,
      id: item.id || `mc-${Date.now()}`,
      businessId: validTenant,
      createdAt: item.createdAt || new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawItem, validTenant, 'missed_calls') as MissedCallRecovery;
    all.unshift(saved);
  }

  setItem('missed_calls', all);
  return saved;
}

// ----------------------------------------------------
// APPOINTMENTS
// ----------------------------------------------------

export async function getAppointments(businessId: string): Promise<Appointment[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'appointments', 'GET_APPOINTMENTS');
  const all = getItem<Appointment[]>('appointments', SEED_APPOINTMENTS);
  return tenantFilterArray(all, validTenant, 'appointments');
}

export async function saveAppointment(appointment: Appointment): Promise<Appointment> {
  const targetTenant = appointment.tenant_id || appointment.tenantId || appointment.businessId;
  const validTenant = validateTenantContext(targetTenant, 'appointments', 'SAVE_APPOINTMENT');
  const all = getItem<Appointment[]>('appointments', SEED_APPOINTMENTS);
  const index = all.findIndex(a => a.id === appointment.id);
  let saved: Appointment;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'appointments', appointment.id);
    saved = tenantValidateEntityMutation({ ...appointment }, validTenant, 'appointments') as Appointment;
    all[index] = saved;
  } else {
    const rawApt: Appointment = {
      ...appointment,
      id: appointment.id || `apt-${Date.now()}`,
      businessId: validTenant,
      createdAt: appointment.createdAt || new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawApt, validTenant, 'appointments') as Appointment;
    all.unshift(saved);
  }

  setItem('appointments', all);

  await addTimelineEventToContact(saved.contactEmail || saved.contactPhone, validTenant, {
    type: 'appointment_booked',
    title: `Appointment Booked: ${saved.serviceName}`,
    description: `Scheduled for ${new Date(saved.startTime).toLocaleString()} (${saved.calendarType})`
  });

  return saved;
}

// ----------------------------------------------------
// ESTIMATES & QUOTES
// ----------------------------------------------------

export async function getEstimates(businessId: string): Promise<Estimate[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'estimates', 'GET_ESTIMATES');
  const all = getItem<Estimate[]>('estimates', SEED_ESTIMATES);
  return tenantFilterArray(all, validTenant, 'estimates');
}

export async function saveEstimate(estimate: Estimate): Promise<Estimate> {
  const targetTenant = estimate.tenant_id || estimate.tenantId || estimate.businessId;
  const validTenant = validateTenantContext(targetTenant, 'estimates', 'SAVE_ESTIMATE');
  const all = getItem<Estimate[]>('estimates', SEED_ESTIMATES);
  const index = all.findIndex(e => e.id === estimate.id);
  let saved: Estimate;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'estimates', estimate.id);
    saved = tenantValidateEntityMutation({ ...estimate, updatedAt: new Date().toISOString() }, validTenant, 'estimates') as Estimate;
    all[index] = saved;
  } else {
    const rawEstimate: Estimate = {
      ...estimate,
      id: estimate.id || `est-${Date.now()}`,
      businessId: validTenant,
      estimateNumber: estimate.estimateNumber || `EST-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: estimate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawEstimate, validTenant, 'estimates') as Estimate;
    all.unshift(saved);
  }

  setItem('estimates', all);
  return saved;
}

// ----------------------------------------------------
// FOLLOW-UP TASKS
// ----------------------------------------------------

export async function getFollowUpTasks(businessId: string): Promise<FollowUpTask[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'follow_ups', 'GET_FOLLOW_UPS');
  const all = getItem<FollowUpTask[]>('follow_ups', SEED_FOLLOW_UPS);
  return tenantFilterArray(all, validTenant, 'follow_ups');
}

export async function saveFollowUpTask(task: FollowUpTask): Promise<FollowUpTask> {
  const targetTenant = task.tenant_id || task.tenantId || task.businessId;
  const validTenant = validateTenantContext(targetTenant, 'follow_ups', 'SAVE_FOLLOW_UP');
  const all = getItem<FollowUpTask[]>('follow_ups', SEED_FOLLOW_UPS);
  const index = all.findIndex(f => f.id === task.id);
  let saved: FollowUpTask;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'follow_ups', task.id);
    saved = tenantValidateEntityMutation({ ...task }, validTenant, 'follow_ups') as FollowUpTask;
    all[index] = saved;
  } else {
    const rawTask: FollowUpTask = {
      ...task,
      id: task.id || `fu-${Date.now()}`,
      businessId: validTenant,
      createdAt: task.createdAt || new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawTask, validTenant, 'follow_ups') as FollowUpTask;
    all.unshift(saved);
  }

  setItem('follow_ups', all);
  return saved;
}

// ----------------------------------------------------
// RE-ENGAGEMENT AUDIENCES
// ----------------------------------------------------

export async function getReEngagementAudiences(businessId: string): Promise<ReEngagementAudience[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 're_engagement', 'GET_RE_ENGAGEMENT');
  const all = getItem<ReEngagementAudience[]>('re_engagement', SEED_RE_ENGAGEMENT);
  return tenantFilterArray(all, validTenant, 're_engagement');
}

export async function saveReEngagementAudience(aud: ReEngagementAudience): Promise<ReEngagementAudience> {
  const targetTenant = aud.tenant_id || aud.tenantId || aud.businessId;
  const validTenant = validateTenantContext(targetTenant, 're_engagement', 'SAVE_RE_ENGAGEMENT');
  const all = getItem<ReEngagementAudience[]>('re_engagement', SEED_RE_ENGAGEMENT);
  const index = all.findIndex(r => r.id === aud.id);
  let saved: ReEngagementAudience;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 're_engagement', aud.id);
    saved = tenantValidateEntityMutation({ ...aud }, validTenant, 're_engagement') as ReEngagementAudience;
    all[index] = saved;
  } else {
    const rawAud: ReEngagementAudience = {
      ...aud,
      id: aud.id || `re-${Date.now()}`,
      businessId: validTenant,
      createdAt: aud.createdAt || new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawAud, validTenant, 're_engagement') as ReEngagementAudience;
    all.unshift(saved);
  }

  setItem('re_engagement', all);
  return saved;
}

// ----------------------------------------------------
// CUSTOMER REVIEWS & REPUTATION
// ----------------------------------------------------

export async function getReviews(businessId: string): Promise<CustomerReview[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'reviews', 'GET_REVIEWS');
  const all = getItem<CustomerReview[]>('reviews', SEED_REVIEWS);
  return tenantFilterArray(all, validTenant, 'reviews');
}

export async function saveReview(review: CustomerReview): Promise<CustomerReview> {
  const targetTenant = review.tenant_id || review.tenantId || review.businessId;
  const validTenant = validateTenantContext(targetTenant, 'reviews', 'SAVE_REVIEW');
  const all = getItem<CustomerReview[]>('reviews', SEED_REVIEWS);
  const index = all.findIndex(r => r.id === review.id);
  let saved: CustomerReview;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'reviews', review.id);
    saved = tenantValidateEntityMutation({ ...review }, validTenant, 'reviews') as CustomerReview;
    all[index] = saved;
  } else {
    const rawReview: CustomerReview = {
      ...review,
      id: review.id || `rev-${Date.now()}`,
      businessId: validTenant
    };
    saved = tenantValidateEntityMutation(rawReview, validTenant, 'reviews') as CustomerReview;
    all.unshift(saved);
  }

  setItem('reviews', all);
  return saved;
}

// ----------------------------------------------------
// COLD OUTREACH CAMPAIGNS
// ----------------------------------------------------

function normalizeCampaign(c: ColdOutreachCampaign): ColdOutreachCampaign {
  const sent = c.metrics?.sent ?? c.sentCount ?? 0;
  const bounced = c.metrics?.bounced ?? c.bouncedCount ?? 0;
  const delivered = c.metrics?.delivered ?? Math.max(0, sent - bounced);
  const opened = c.metrics?.opened ?? c.openedCount ?? 0;
  const replied = c.metrics?.replied ?? c.repliedCount ?? 0;
  const unsubscribed = c.metrics?.unsubscribed ?? c.optOutCount ?? 0;

  const metrics = {
    sent,
    delivered,
    opened,
    replied,
    bounced,
    unsubscribed
  };

  const compliance = c.compliance || {
    canSpamCompliant: true,
    optOutIncluded: c.unsubscribeIncluded ?? true,
    dailySendLimit: 150
  };

  return {
    ...c,
    metrics,
    compliance,
    templateSubject: c.templateSubject || c.subject || 'Outreach Inquiry',
    templateBody: c.templateBody || c.bodyTemplate || 'Hello {{first_name}},\n\nConnecting regarding our services.'
  };
}

export async function getCampaigns(businessId?: string): Promise<ColdOutreachCampaign[]> {
  initializeDatabaseIfNeeded();
  const all = getItem<ColdOutreachCampaign[]>('campaigns', SEED_CAMPAIGNS);
  const normalized = all.map(normalizeCampaign);
  if (!businessId) return normalized;
  const validTenant = validateTenantContext(businessId, 'campaigns', 'GET_CAMPAIGNS');
  return tenantFilterArray(normalized, validTenant, 'campaigns');
}

export async function saveCampaign(camp: ColdOutreachCampaign): Promise<ColdOutreachCampaign> {
  const targetTenant = camp.tenant_id || camp.tenantId || camp.businessId;
  const validTenant = validateTenantContext(targetTenant, 'campaigns', 'SAVE_CAMPAIGN');
  const all = getItem<ColdOutreachCampaign[]>('campaigns', SEED_CAMPAIGNS);
  const index = all.findIndex(c => c.id === camp.id);
  let saved: ColdOutreachCampaign;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'campaigns', camp.id);
    saved = tenantValidateEntityMutation({ ...camp }, validTenant, 'campaigns') as ColdOutreachCampaign;
    all[index] = saved;
  } else {
    const rawCamp: ColdOutreachCampaign = {
      ...camp,
      id: camp.id || `camp-${Date.now()}`,
      businessId: validTenant,
      createdAt: camp.createdAt || new Date().toISOString()
    };
    saved = tenantValidateEntityMutation(rawCamp, validTenant, 'campaigns') as ColdOutreachCampaign;
    all.unshift(saved);
  }

  setItem('campaigns', all);
  return saved;
}

export const getColdOutreachCampaigns = getCampaigns;
export const saveColdOutreachCampaign = saveCampaign;

// ----------------------------------------------------
// CONVERSATIONS & CHAT
// ----------------------------------------------------

export async function getConversations(businessId?: string): Promise<Conversation[]> {
  initializeDatabaseIfNeeded();
  const all = getItem<Conversation[]>('conversations', []);
  if (!businessId) return all;
  const validTenant = validateTenantContext(businessId, 'conversations', 'GET_CONVERSATIONS');
  return tenantFilterArray(all, validTenant, 'conversations');
}

export async function saveConversation(conv: any): Promise<any> {
  const targetTenant = conv.tenant_id || conv.tenantId || conv.businessId || 'default';
  const all = getItem<Conversation[]>('conversations', []);
  const index = conv.id ? all.findIndex(c => c.id === conv.id) : -1;
  let saved: any;

  if (index >= 0) {
    saved = { ...all[index], ...conv, tenant_id: targetTenant, tenantId: targetTenant, businessId: targetTenant, updatedAt: new Date().toISOString() };
    all[index] = saved;
  } else {
    saved = {
      ...conv,
      id: conv.id || `conv-${Date.now()}`,
      tenant_id: targetTenant,
      tenantId: targetTenant,
      businessId: targetTenant,
      createdAt: conv.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    all.unshift(saved);
  }

  setItem('conversations', all);
  return saved;
}

export async function updateConversationStatus(
  arg1: string, 
  arg2: any, 
  arg3?: any
): Promise<void> {
  const convId = arg3 !== undefined ? arg2 : arg1;
  const status = arg3 !== undefined ? arg3 : arg2;
  const all = getItem<Conversation[]>('conversations', []);
  const item = all.find(c => c.id === convId);
  if (item) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    setItem('conversations', all);
  }
}

// ----------------------------------------------------
// DASHBOARD OVERVIEW & ANALYTICS
// ----------------------------------------------------

export async function getAnalyticsSummary(businessId?: string): Promise<AnalyticsSummary> {
  initializeDatabaseIfNeeded();
  const targetBizId = businessId || SUMMIT_ID;
  const validTenant = validateTenantContext(targetBizId, 'analytics', 'GET_ANALYTICS');
  const [conversations, leads, calls, missed, biz] = await Promise.all([
    getConversations(validTenant),
    getLeads(validTenant),
    getCalls(validTenant),
    getMissedCalls(validTenant),
    getBusinessById(validTenant)
  ]);

  const totalConversations = conversations.length;
  const resolvedConversations = conversations.filter(c => c.status === 'RESOLVED').length;
  const humanHandoffCount = conversations.filter(c =>
    c.status === 'HUMAN_REQUIRED' || c.status === 'HUMAN_ACTIVE'
  ).length;
  const leadsCapturedCount = conversations.filter(c => c.leadCaptured).length;
  const voiceMinutes = calls.reduce(
    (total, call) => total + Math.ceil((call.durationSeconds || 0) / 60),
    0
  );

  const responseTimes = conversations
    .map(conversation => {
      const messages = conversation.messages || [];
      const firstUserIndex = messages.findIndex(message => message.sender === 'user');
      if (firstUserIndex < 0) return null;
      const firstAgent = messages.slice(firstUserIndex + 1).find(
        message => message.sender === 'agent'
      );
      if (!firstAgent) return null;
      const firstUser = messages[firstUserIndex];
      const elapsed = new Date(firstAgent.timestamp).getTime() - new Date(firstUser.timestamp).getTime();
      return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed / 1000 : null;
    })
    .filter((seconds): seconds is number => seconds !== null);

  const avgResponseTimeSeconds = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, seconds) => sum + seconds, 0) / responseTimes.length)
    : 0;

  const leadConversionRate = totalConversations
    ? Number(((leadsCapturedCount / totalConversations) * 100).toFixed(1))
    : 0;

  const resolvedWithoutHumanRate = totalConversations
    ? Number(((resolvedConversations / totalConversations) * 100).toFixed(1))
    : 0;

  const questionCounts = new Map<string, number>();
  for (const conversation of conversations) {
    for (const message of conversation.messages || []) {
      if (message.sender !== 'user') continue;
      const question = message.text?.trim();
      if (!question || question.length < 3) continue;
      questionCounts.set(question, (questionCounts.get(question) || 0) + 1);
    }
  }

  const topQuestions = Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([question, count]) => ({ question, count }));

  const aiResolutionRate = resolvedWithoutHumanRate;

  return {
    totalConversations,
    totalLeads: leads.length,
    totalVoiceMinutes: voiceMinutes,
    avgResponseTimeSeconds,
    leadConversionRate,
    hotLeadsCount: leads.filter(l => l.scoreCategory === 'HOT').length,
    resolvedWithoutHumanRate,
    callsHandled: calls.length,
    missedCallsRecovered: missed.filter(m => m.textBackStatus === 'recovered').length,
    aiResolvedCount: resolvedConversations,
    humanHandoffCount,
    leadsCapturedCount,
    aiResolutionRate,
    voiceUsage: {
      usedMinutes: voiceMinutes,
      limitMinutes: biz?.maxMonthlyVoiceMinutes || 0
    },
    topQuestions
  };
}

export async function getOnboardingProgress(businessId?: string): Promise<{ completed: number; total: number; steps: OnboardingStep[] }> {
  const steps: OnboardingStep[] = [
    { key: 'knowledge', title: 'Knowledge Base', description: 'Train AI on services, FAQs & pricing', isCompleted: true, completed: true, id: '1', actionTab: 'knowledge', actionText: 'Manage KB' },
    { key: 'voice', title: 'Voice AI Studio', description: 'Configure AI phone agent voice & tone', isCompleted: true, completed: true, id: '2', actionTab: 'voice-studio', actionText: 'Tune Voice' },
    { key: 'personality', title: 'Personality & Tone', description: 'Set greeting, tone & custom guidelines', isCompleted: true, completed: true, id: '3', actionTab: 'agent-settings', actionText: 'Set Tone' },
    { key: 'branding', title: 'Branding & Theme', description: 'Match brand colors, avatar & logo', isCompleted: true, completed: true, id: '4', actionTab: 'agent-settings', actionText: 'Customize' },
    { key: 'installation', title: 'Deploy Channels', description: 'Embed chat widget or connect phone line', isCompleted: false, completed: false, id: '5', actionTab: 'widget', actionText: 'Embed' }
  ];
  return {
    completed: steps.filter(s => s.isCompleted).length,
    total: steps.length,
    steps
  };
}

export async function getUsageAlertStatus(businessId?: string): Promise<UsageAlertStatus> {
  const bizId = businessId || 'summit-home-services';
  const biz = await getBusinessById(bizId);
  const planKey = normalizePlanId(biz?.plan || 'growth');
  const planConfig = getPlanConfig(planKey);
  
  const conversations = await getConversations(bizId);
  const includedConvos = typeof planConfig.usageLimits.aiUsage === 'number' 
    ? planConfig.usageLimits.aiUsage 
    : 7500;
  
  const usedConvos = conversations.length > 0 
    ? Math.min(includedConvos, conversations.length * 35 + 1200) 
    : (planKey === 'starter' ? 1650 : planKey === 'growth' ? 5900 : 16200);
  const percentage = Math.min(100, Math.round((usedConvos / includedConvos) * 100));

  if (percentage >= 100) {
    return {
      hasAlert: true,
      alertLevel: '100%',
      alertMessage: `You have reached 100% of your included AI conversation limit (${usedConvos.toLocaleString()} / ${includedConvos.toLocaleString()}). Upgrade plan now to maintain automatic customer conversation processing.`,
      percentageUsed: percentage,
      message: 'Plan limit reached. Upgrade to the next tier to continue automated lead handling.'
    };
  } else if (percentage >= 90) {
    return {
      hasAlert: true,
      alertLevel: '90%',
      alertMessage: `Critical Usage Warning: ${percentage}% of monthly AI conversations used (${usedConvos.toLocaleString()} / ${includedConvos.toLocaleString()}). Upgrading recommended before 100% cap.`,
      percentageUsed: percentage,
      message: 'Approaching monthly conversation cap. Immediate upgrade recommended.'
    };
  } else if (percentage >= 80) {
    return {
      hasAlert: true,
      alertLevel: '80%',
      alertMessage: `Usage Alert: ${percentage}% of included AI conversations consumed (${usedConvos.toLocaleString()} / ${includedConvos.toLocaleString()}).`,
      percentageUsed: percentage,
      message: '80% threshold reached. Upgrade to ensure uninterrupted sales coverage.'
    };
  }

  return {
    hasAlert: false,
    alertLevel: 'NONE',
    alertMessage: 'AI conversation quotas and telephony trunks are operating well within monthly thresholds.',
    percentageUsed: percentage,
    message: 'All autonomous channels operating within normal enterprise quota.'
  };
}

export async function getUnansweredQuestions(businessId?: string): Promise<UnansweredQuestion[]> {
  return [
    { id: 'uq-1', question: 'Do you offer emergency after-hours consultations?', count: 4, reason: 'Schedule exception not covered in primary KB' },
    { id: 'uq-2', question: 'Are custom enterprise SLAs available for high-call volume practices?', count: 2, reason: 'Enterprise pricing requires team approval' }
  ];
}

export async function convertUnansweredQuestionToKnowledge(
  arg1: string, 
  arg2: string, 
  arg3?: string
): Promise<void> {
  const businessId = arg3 !== undefined ? arg1 : 'default';
  const questionId = arg3 !== undefined ? arg2 : arg1;
  const answer = arg3 !== undefined ? arg3 : arg2;
  await saveKnowledgeDoc({
    id: `kb-${Date.now()}`,
    businessId,
    title: `Resolved Query (${questionId})`,
    type: 'faq',
    content: answer,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

// ----------------------------------------------------
// KNOWLEDGE BASE / RAG
// ----------------------------------------------------

export async function getKnowledgeDocs(businessId: string): Promise<KnowledgeItem[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'knowledge', 'GET_KNOWLEDGE');
  const all = getItem<KnowledgeItem[]>('knowledge', SEED_KNOWLEDGE_DOCS);
  return tenantFilterArray(all, validTenant, 'knowledge');
}

export async function updateLeadStatus(
  arg1: string,
  arg2: any,
  arg3?: any
): Promise<void> {
  const businessId = arg3 !== undefined ? arg1 : undefined;
  const leadId = arg3 !== undefined ? arg2 : arg1;
  const status = arg3 !== undefined ? arg3 : arg2;
  const notes = arg3 !== undefined ? arg3 : undefined;

  // Production dashboard mutations must go through the authenticated,
  // tenant-scoped API. Do not silently write only to localStorage.
  if (typeof window !== 'undefined' && isProductionRuntime()) {
    const targetNotes = arg3 !== undefined && typeof arg3 === 'string' ? arg3 : undefined;
    const body: Record<string, string> = { status: String(status) };
    if (targetNotes !== undefined) body.notes = targetNotes;
    const data = await safeFetchJson('/api/leads/' + encodeURIComponent(leadId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!data?.success) throw new Error(data?.error || 'Unable to update lead.');
    return;
  }

  const allLeads = getItem<Lead[]>('leads', SEED_LEADS);
  const lead = allLeads.find(l => l.id === leadId);
  if (lead) {
    if (businessId) tenantAssertDocOwnership(lead, businessId, 'leads', leadId);
    lead.status = status;
    if (arg3 !== undefined && typeof arg3 === 'string') lead.notes = arg3;
    lead.updatedAt = new Date().toISOString();
    setItem('leads', allLeads);
  }
}

export async function saveKnowledgeDoc(doc: Partial<KnowledgeItem> & { businessId: string; title: string }): Promise<KnowledgeItem> {
  const targetTenant = doc.tenant_id || doc.tenantId || doc.businessId;
  const validTenant = validateTenantContext(targetTenant, 'knowledge', 'SAVE_KNOWLEDGE');
  const all = getItem<KnowledgeItem[]>('knowledge', SEED_KNOWLEDGE_DOCS);
  const index = doc.id ? all.findIndex(k => k.id === doc.id) : -1;
  let saved: KnowledgeItem;

  if (index >= 0) {
    tenantAssertDocOwnership(all[index], validTenant, 'knowledge', doc.id);
    saved = tenantValidateEntityMutation({ 
      ...all[index], 
      ...doc, 
      updatedAt: new Date().toISOString() 
    }, validTenant, 'knowledge') as KnowledgeItem;
    all[index] = saved;
  } else {
    const rawDoc: KnowledgeItem = {
      type: 'faq',
      content: '',
      status: 'active',
      ...doc,
      id: doc.id || `kb-${Date.now()}`,
      businessId: validTenant,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as KnowledgeItem;
    saved = tenantValidateEntityMutation(rawDoc, validTenant, 'knowledge') as KnowledgeItem;
    all.unshift(saved);
  }

  setItem('knowledge', all);
  return saved;
}

export async function deleteKnowledgeDoc(arg1: string, arg2?: string): Promise<void> {
  const idToDelete = arg2 !== undefined ? arg2 : arg1;
  const businessId = arg2 !== undefined ? arg1 : undefined;
  const all = getItem<KnowledgeItem[]>('knowledge', SEED_KNOWLEDGE_DOCS);
  const existing = all.find(k => k.id === idToDelete);
  if (existing && businessId) {
    tenantAssertDocOwnership(existing, businessId, 'knowledge', idToDelete);
  }
  const filtered = all.filter(k => k.id !== idToDelete);
  setItem('knowledge', filtered);
}

// ----------------------------------------------------
// INTEGRATIONS & DASHBOARD WIDGETS
// ----------------------------------------------------

export async function getIntegrations(businessId?: string): Promise<IntegrationStatus[]> {
  initializeDatabaseIfNeeded();
  const all = getItem<IntegrationStatus[]>('integrations', SEED_INTEGRATIONS);
  if (!businessId) return all;

  const validTenant = normalizeTenantId(businessId);
  return all.filter(integration => {
    const owner = normalizeTenantId(integration.tenantId || integration.businessId || '');
    // Legacy seed integrations without an owner are available as templates,
    // but are not treated as configured for any tenant.
    return owner === validTenant;
  });
}

export async function saveIntegrations(list: IntegrationStatus[]): Promise<void> {
  const all = getItem<IntegrationStatus[]>('integrations', SEED_INTEGRATIONS);
  for (const integration of list) {
    const owner = normalizeTenantId(integration.tenantId || integration.businessId || '');
    if (!owner) continue;

    const record = {
      ...integration,
      tenantId: owner,
      businessId: owner
    };

    const index = all.findIndex(existing =>
      existing.id === record.id &&
      normalizeTenantId(existing.tenantId || existing.businessId || '') === owner
    );

    if (index >= 0) {
      all[index] = record;
    } else {
      all.push(record);
    }
  }
  setItem('integrations', all);
  notifyDataChanged('integrations');
}

export async function getDashboardWidgets(businessId?: string): Promise<DashboardWidgetConfig[]> {
  initializeDatabaseIfNeeded();
  return getItem<DashboardWidgetConfig[]>('widgets', DEFAULT_DASHBOARD_WIDGETS);
}

export async function saveDashboardWidgets(widgets: DashboardWidgetConfig[]): Promise<void> {
  setItem('widgets', widgets);
}

// ----------------------------------------------------
// NOTIFICATIONS & AUDIT LOGS
// ----------------------------------------------------

export async function getNotifications(businessId: string): Promise<NotificationItem[]> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'notifications', 'GET_NOTIFICATIONS');
  const all = getItem<NotificationItem[]>('notifications', SEED_NOTIFICATIONS);
  return tenantFilterArray(all, validTenant, 'notifications');
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const all = getItem<NotificationItem[]>('notifications', SEED_NOTIFICATIONS);
  const item = all.find(n => n.id === id);
  if (item) {
    item.read = true;
    setItem('notifications', all);
  }
}

export async function markAllNotificationsAsRead(businessId: string): Promise<void> {
  const validTenant = validateTenantContext(businessId, 'notifications', 'MARK_ALL_NOTIFICATIONS');
  const all = getItem<NotificationItem[]>('notifications', SEED_NOTIFICATIONS);
  all.forEach(n => {
    if (normalizeTenantId(n.tenant_id || n.tenantId || n.businessId) === validTenant) {
      n.read = true;
    }
  });
  setItem('notifications', all);
}

export async function addNotification(notif: Partial<NotificationItem> & { businessId: string; type: NotificationItem['type']; title: string; message: string }): Promise<void> {
  const targetTenant = notif.tenant_id || notif.tenantId || notif.businessId;
  const validTenant = validateTenantContext(targetTenant, 'notifications', 'ADD_NOTIFICATION');
  const all = getItem<NotificationItem[]>('notifications', SEED_NOTIFICATIONS);
  const rawItem: NotificationItem = {
    read: false,
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    businessId: validTenant,
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };
  const newItem = tenantValidateEntityMutation(rawItem, validTenant, 'notifications') as NotificationItem;
  all.unshift(newItem);
  setItem('notifications', all);
}

export async function createBusiness(businessData: Partial<Business>): Promise<Business> {
  const list = await getAllBusinesses();
  const newId = businessData.id || (businessData.name ? businessData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : `biz-${Date.now()}`);
  const validTenant = validateTenantContext(newId, 'businesses', 'CREATE_BUSINESS');
  
  const rawBiz: Business = {
    id: validTenant,
    tenantId: validTenant,
    tenant_id: validTenant,
    name: businessData.name || 'New Business',
    industry: businessData.industry || 'General',
    description: businessData.description || '',
    website: businessData.website || '',
    supportEmail: businessData.supportEmail || '',
    phone: businessData.phone || '+1 (555) 000-0000',
    country: businessData.country || 'US',
    currency: businessData.currency || 'USD',
    timezone: businessData.timezone || 'America/New_York',
    primaryColor: businessData.primaryColor || '#2563eb',
    secondaryColor: businessData.secondaryColor || '#1e40af',
    plan: businessData.plan || 'GROWTH',
    status: businessData.status || 'active',
    agentSettings: businessData.agentSettings || {
      agentName: `${businessData.name || 'AI'} Receptionist`,
      welcomeMessage: `Hi, thank you for contacting ${businessData.name || 'us'}. How can we assist you today?`,
      businessDescription: businessData.description || '',
      tone: 'Professional',
      primaryColor: businessData.primaryColor || '#2563eb',
      secondaryColor: businessData.secondaryColor || '#1e40af',
      suggestedQuestions: ['What are your services?', 'Can I book an appointment?', 'What are your hours?']
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const newBiz = tenantValidateEntityMutation(rawBiz, validTenant, 'businesses') as Business;
  list.push(newBiz);
  setItem('businesses', list);
  return newBiz;
}

export async function updateBusiness(businessOrId: Business | string, updates?: Partial<Business>): Promise<Business> {
  const list = await getAllBusinesses();
  let targetId = typeof businessOrId === 'string' ? businessOrId : businessOrId.id;
  const validTenant = validateTenantContext(targetId, 'businesses', 'UPDATE_BUSINESS');
  const index = list.findIndex(b => normalizeTenantId(b.id) === validTenant);
  
  if (index >= 0) {
    const existing = list[index];
    const updatedData = typeof businessOrId === 'string' ? updates || {} : businessOrId;
    const merged: Business = tenantValidateEntityMutation({
      ...existing,
      ...updatedData,
      updatedAt: new Date().toISOString()
    }, validTenant, 'businesses') as Business;
    list[index] = merged;
    setItem('businesses', list);
    return merged;
  } else {
    return createBusiness(typeof businessOrId === 'string' ? { id: targetId, ...updates } : businessOrId);
  }
}

export async function updateBusinessSettings(businessId: string, settings: any): Promise<void> {
  const validTenant = validateTenantContext(businessId, 'businesses', 'UPDATE_SETTINGS');
  const biz = await getBusinessById(validTenant);
  if (biz) {
    biz.agentSettings = { ...biz.agentSettings, ...settings };
    await saveBusiness(biz);
  }
}

export async function deleteBusiness(businessId: string, actorEmail?: string): Promise<{ success: boolean; message: string }> {
  const validTenant = validateTenantContext(businessId, 'businesses', 'DELETE_TENANT');
  const list = await getAllBusinesses();
  const targetBiz = list.find(b => normalizeTenantId(b.id) === validTenant);
  const filtered = list.filter(b => normalizeTenantId(b.id) !== validTenant);
  setItem('businesses', filtered);
  notifyDataChanged('businesses');

  await addAuditLog({
    businessId: validTenant,
    actorEmail: actorEmail || 'platform-admin@ai-revenueos.internal',
    action: 'DELETE_TENANT',
    entity: 'TenantRegistry',
    details: `Tenant "${targetBiz?.name || validTenant}" permanently erased.`
  });

  return {
    success: true,
    message: `Tenant "${targetBiz?.name || validTenant}" was successfully and permanently deleted.`
  };
}

// Aliases for unified backwards-compatibility
export const subscribeToTenantRegistry = subscribeToDataChanges;
export const getBusinesses = getAllBusinesses;
export const resetDatabaseToSeed = resetAllToSeedData;
export const getKnowledgeItems = getKnowledgeDocs;
export async function addKnowledgeItem(arg1: any, arg2?: any, arg3?: any): Promise<KnowledgeItem> {
  const data = typeof arg1 === 'object' ? arg1 : arg2;
  return saveKnowledgeDoc(data);
}

export async function updateKnowledgeItem(arg1: any, arg2?: any, arg3?: any): Promise<KnowledgeItem> {
  if (typeof arg1 === 'string' && typeof arg2 === 'object') {
    return saveKnowledgeDoc({ ...arg2, id: arg1 });
  }
  return saveKnowledgeDoc(arg1);
}

export const deleteKnowledgeItem = deleteKnowledgeDoc;
export const markNotificationsAsRead = markAllNotificationsAsRead;

export async function getAuditLogs(businessId?: string): Promise<AuditLog[]> {
  initializeDatabaseIfNeeded();
  const all = getItem<AuditLog[]>('audit_logs', SEED_AUDIT_LOGS);
  if (!businessId) return all;
  const validTenant = validateTenantContext(businessId, 'audit_logs', 'GET_AUDIT_LOGS');
  return tenantFilterArray(all, validTenant, 'audit_logs');
}

export async function addAuditLog(
  businessIdOrObj: string | { businessId: string; actorEmail: string; action: string; entity?: string; details: string },
  actorEmail?: string, 
  action?: string, 
  entity?: string, 
  details?: string
): Promise<void> {
  const all = getItem<AuditLog[]>('audit_logs', SEED_AUDIT_LOGS);
  let newLog: AuditLog;

  if (typeof businessIdOrObj === 'object') {
    const validTenant = normalizeTenantId(businessIdOrObj.businessId) || 'platform';
    newLog = {
      id: `log-${Date.now()}`,
      tenant_id: validTenant,
      tenantId: validTenant,
      businessId: validTenant,
      actorEmail: businessIdOrObj.actorEmail || 'admin@ai-revenueos.internal',
      action: businessIdOrObj.action || 'ACTIVITY',
      entity: businessIdOrObj.entity || 'General',
      details: businessIdOrObj.details || '',
      timestamp: new Date().toISOString()
    };
  } else {
    const validTenant = normalizeTenantId(businessIdOrObj) || 'platform';
    newLog = {
      id: `log-${Date.now()}`,
      tenant_id: validTenant,
      tenantId: validTenant,
      businessId: validTenant,
      actorEmail: actorEmail || 'admin@ai-revenueos.internal',
      action: action || 'ACTIVITY',
      entity: entity || 'General',
      details: details || '',
      timestamp: new Date().toISOString()
    };
  }

  all.unshift(newLog);
  setItem('audit_logs', all.slice(0, 100));
}

// ----------------------------------------------------
// DYNAMIC PRICING & PLAN USAGE LIMITS REPOSITORY
// ----------------------------------------------------

export async function getAdminPlans(): Promise<Record<string, PlanConfig>> {
  initializeDatabaseIfNeeded();
  return getItem<Record<string, PlanConfig>>('admin_plan_configs', DEFAULT_PLAN_CONFIGS);
}

export async function saveAdminPlan(plan: PlanConfig): Promise<void> {
  initializeDatabaseIfNeeded();
  const current = await getAdminPlans();
  current[plan.id] = {
    ...plan,
    usageLimits: {
      ...plan.usageLimits,
      planId: plan.id
    }
  };
  setItem('admin_plan_configs', current);
}

export async function resetAdminPlansToDefault(): Promise<Record<string, PlanConfig>> {
  setItem('admin_plan_configs', DEFAULT_PLAN_CONFIGS);
  return DEFAULT_PLAN_CONFIGS;
}

export async function getBusinessBillingInfo(businessId: string): Promise<BillingInfo> {
  initializeDatabaseIfNeeded();
  const validTenant = validateTenantContext(businessId, 'billing', 'GET_BILLING');
  const biz = await getBusinessById(validTenant);
  const plans = await getAdminPlans();
  const planKey = normalizePlanId(biz?.plan || 'enterprise');
  const planConfig = plans[planKey] || plans.enterprise || DEFAULT_PLAN_CONFIGS.enterprise;

  const isIN = biz?.country === 'IN' || biz?.currency === 'INR';
  const currency = isIN ? 'INR' : 'USD';
  const planPricing = planConfig.pricing[currency] || planConfig.pricing.USD;

  const [calls, leads, docs, campaigns, appointments] = await Promise.all([
    getCalls(validTenant),
    getLeads(validTenant),
    getKnowledgeDocs(validTenant),
    getCampaigns(validTenant),
    getAppointments(validTenant)
  ]);

  const voiceMinutesUsed = calls.reduce((acc, c) => acc + Math.ceil((c.durationSeconds || 60) / 60), 0);
  const smsUsed = leads.length * 2 + appointments.length * 2;
  const whatsappUsed = 0;
  const emailUsed = campaigns.reduce((acc, c) => acc + (c.metrics?.sent || 0), 0);
  const aiOperationsUsed = (calls.length * 5) + (leads.length * 8);
  const contactsCount = leads.length;

  let serverBillingData: any = null;
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/billing/tenant/${encodeURIComponent(validTenant)}`, {
        headers: {
          'X-Tenant-ID': validTenant
        }
      });
      if (res.ok) {
        serverBillingData = await res.json();
      }
    } catch (e) {
      // fallback to local calculation
    }
  }

  const primaryPaymentMethod = serverBillingData?.paymentMethods?.find((pm: any) => pm.isPrimary) || serverBillingData?.paymentMethods?.[0] || null;

  const dynamicInvoices: InvoiceItem[] = serverBillingData?.invoices?.length > 0 
    ? serverBillingData.invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        description: inv.description,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        pdfUrl: inv.pdfUrl || '#'
      }))
    : [];

  const currentStatus = serverBillingData?.billing?.status || 'Active';
  const effectiveCurrency = (serverBillingData?.billing?.currency || currency) as CurrencyCode;

  return {
    businessId: validTenant,
    planId: serverBillingData?.billing?.planId || planConfig.id,
    planName: serverBillingData?.billing?.planName || planConfig.name,
    provider: serverBillingData?.billing?.provider || 'razorpay',
    status: currentStatus,
    currency: effectiveCurrency,
    implementationFee: serverBillingData?.billing?.implementationFee || planPricing.setupPrice,
    implementationFeePaid: serverBillingData?.billing?.implementationFeePaid ?? true,
    monthlyFee: serverBillingData?.billing?.monthlyFee || planPricing.monthlyPrice,
    billingCycle: 'monthly',
    nextBillingDate: serverBillingData?.billing?.nextBillingDate || '',
    autoRenew: serverBillingData?.billing?.autoRenew ?? false,
    paymentFailed: serverBillingData?.billing?.paymentFailed ?? false,
    paymentMethod: primaryPaymentMethod ? {
      id: primaryPaymentMethod.id,
      brand: primaryPaymentMethod.brand || 'Card',
      last4: primaryPaymentMethod.last4 || '****',
      expiry: primaryPaymentMethod.expiry || '',
      isDefault: primaryPaymentMethod.isPrimary ?? true,
      provider: primaryPaymentMethod.provider
    } : {
      brand: 'None',
      last4: '—',
      expiry: '',
      isDefault: false
    },
    paymentMethods: serverBillingData?.paymentMethods || [],
    transactions: serverBillingData?.transactions || [],
    usage: {
      voice: {
        used: voiceMinutesUsed,
        included: typeof planConfig.usageLimits.voiceMinutes === 'number' ? planConfig.usageLimits.voiceMinutes : 2500,
        unit: 'minutes'
      },
      sms: {
        used: smsUsed,
        included: typeof planConfig.usageLimits.smsMessages === 'number' ? planConfig.usageLimits.smsMessages : 2500,
        unit: 'messages'
      },
      whatsapp: {
        used: whatsappUsed,
        included: typeof planConfig.usageLimits.whatsappConversations === 'number' ? planConfig.usageLimits.whatsappConversations : 1000,
        unit: 'conversations'
      },
      email: {
        used: emailUsed,
        included: typeof planConfig.usageLimits.emailMessages === 'number' ? planConfig.usageLimits.emailMessages : 10000,
        unit: 'emails'
      },
      ai: {
        used: aiOperationsUsed,
        included: typeof planConfig.usageLimits.aiUsage === 'number' ? planConfig.usageLimits.aiUsage : 50000,
        unit: 'operations'
      },
      contacts: {
        used: contactsCount,
        included: typeof planConfig.usageLimits.contacts === 'number' ? planConfig.usageLimits.contacts : 10000,
        unit: 'contacts'
      },
      storage: {
        used: 18,
        included: 100,
        unit: 'GB'
      }
    },
    invoices: dynamicInvoices
  };
}

export async function addTenantPaymentMethod(
  businessId: string,
  methodData: { brand: string; last4: string; expiry: string; provider: string; isPrimary?: boolean }
): Promise<any> {
  const validTenant = validateTenantContext(businessId, 'payment_methods', 'ADD_PAYMENT_METHOD');
  const res = await fetch('/api/billing/payment-methods/add', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': validTenant
    },
    body: JSON.stringify({ businessId: validTenant, ...methodData })
  });
  return res.json();
}

export async function setTenantPrimaryPaymentMethod(businessId: string, paymentMethodId: string): Promise<any> {
  const validTenant = validateTenantContext(businessId, 'payment_methods', 'SET_PRIMARY_PAYMENT_METHOD');
  const res = await fetch('/api/billing/payment-methods/set-primary', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': validTenant
    },
    body: JSON.stringify({ businessId: validTenant, paymentMethodId })
  });
  return res.json();
}

export async function removeTenantPaymentMethod(businessId: string, paymentMethodId: string): Promise<any> {
  const validTenant = validateTenantContext(businessId, 'payment_methods', 'REMOVE_PAYMENT_METHOD');
  const res = await fetch('/api/billing/payment-methods/remove', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': validTenant
    },
    body: JSON.stringify({ businessId: validTenant, paymentMethodId })
  });
  return res.json();
}

export async function updateTenantSubscriptionPlan(businessId: string, planId: string, customPrice?: number): Promise<any> {
  const validTenant = validateTenantContext(businessId, 'billing', 'UPDATE_SUBSCRIPTION');
  const res = await fetch('/api/billing/subscription/update', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': validTenant
    },
    body: JSON.stringify({ businessId: validTenant, planId, customPrice })
  });
  return res.json();
}

export async function pauseTenantSubscription(businessId: string): Promise<any> {
  const validTenant = validateTenantContext(businessId, 'billing', 'PAUSE_SUBSCRIPTION');
  const res = await fetch('/api/billing/subscription/pause', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': validTenant
    },
    body: JSON.stringify({ businessId: validTenant })
  });
  return res.json();
}

export async function resumeTenantSubscription(businessId: string): Promise<any> {
  const validTenant = validateTenantContext(businessId, 'billing', 'RESUME_SUBSCRIPTION');
  const res = await fetch('/api/billing/subscription/resume', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': validTenant
    },
    body: JSON.stringify({ businessId: validTenant })
  });
  return res.json();
}

export async function cancelTenantSubscription(businessId: string): Promise<any> {
  const validTenant = validateTenantContext(businessId, 'billing', 'CANCEL_SUBSCRIPTION');
  const res = await fetch('/api/billing/subscription/cancel', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': validTenant
    },
    body: JSON.stringify({ businessId: validTenant })
  });
  return res.json();
}
