import { Plan, PlanUsageLimits, CurrencyCode } from '../types';
import { 
  SUPPORTED_CURRENCIES, 
  CurrencyConfig, 
  formatCurrencyAmount, 
  getCurrencyConfig
} from '../lib/currency';

export type { CurrencyCode, CurrencyConfig };
export { formatCurrencyAmount, getCurrencyConfig };

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = SUPPORTED_CURRENCIES;

export interface PlanPricing {
  monthlyPrice: number;
  setupPrice: number;
}

export type PlanKey = 'starter' | 'growth' | 'scale' | 'enterprise' | 'enterprise_custom' | string;

export interface PlanConfig {
  id: PlanKey;
  name: string;
  tagline: string;
  positioning: string;
  price: number; // USD base (numeric)
  setupFee: number; // USD setup base (numeric)
  currency: CurrencyCode;
  billing: 'monthly';
  aiConversations: number | string;
  voiceMinutes: number | string;
  dropdownLabel: string;
  isPopular?: boolean;
  badge?: string;
  isCustomPrice?: boolean;
  pricing: Partial<Record<CurrencyCode, PlanPricing>>;
  usageLimits: PlanUsageLimits;
  features: string[];
  ctaText: string;
  ctaType: 'buy_now' | 'demo' | 'book_demo' | 'sales' | 'enterprise_sales';
}

// ----------------------------------------------------
// FINAL GLOBAL COMMERCIAL PRICING (FIXED - NO DYNAMIC FX CONVERSION)
// MARKETS: INDIA (INR), USA (USD), UK (GBP)
// ----------------------------------------------------

const CANONICAL_PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: '1 website, 1 AI Sales Agent & 2,000 AI conversations/month with CRM foundation.',
    positioning: 'For businesses starting with AI-powered customer engagement.',
    price: 14999,
    setupFee: 19999,
    currency: 'INR',
    billing: 'monthly',
    aiConversations: 2000,
    voiceMinutes: 250,
    dropdownLabel: 'Starter (₹14,999/mo + ₹19,999 setup • 2,000 AI Convos)',
    isPopular: false,
    ctaText: 'Buy Now',
    ctaType: 'buy_now',
    pricing: {
      INR: { monthlyPrice: 14999, setupPrice: 19999 },
      USD: { monthlyPrice: 199, setupPrice: 249 },
      GBP: { monthlyPrice: 159, setupPrice: 199 }
    },
    usageLimits: {
      planId: 'starter',
      voiceMinutes: 250,
      smsMessages: 500,
      whatsappConversations: 250,
      emailMessages: 2500,
      aiUsage: 2000, // 2,000 AI conversations/month
      contacts: 1000,
      teamMembers: 2,
      knowledgeDocuments: 25,
      storage: '5 GB',
      allowOverage: true
    },
    features: [
      '1 website',
      '1 AI Sales Agent',
      '2,000 AI conversations/month',
      'Lead capture',
      'Lead qualification',
      'HOT/WARM/COLD scoring',
      'Business knowledge base',
      'Basic analytics',
      'Basic follow-up',
      'Human handoff',
      'Standard support'
    ]
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'Advanced qualification, lead scoring, appointment capture, CRM & WhatsApp integration.',
    positioning: 'For growing businesses that need automated lead conversion.',
    badge: 'MOST POPULAR',
    isPopular: true,
    price: 29999,
    setupFee: 34999,
    currency: 'INR',
    billing: 'monthly',
    aiConversations: 7500,
    voiceMinutes: 1000,
    dropdownLabel: 'Growth (₹29,999/mo + ₹34,999 setup • 7,500 AI Convos)',
    ctaText: 'Buy Now',
    ctaType: 'buy_now',
    pricing: {
      INR: { monthlyPrice: 29999, setupPrice: 34999 },
      USD: { monthlyPrice: 399, setupPrice: 449 },
      GBP: { monthlyPrice: 299, setupPrice: 349 }
    },
    usageLimits: {
      planId: 'growth',
      voiceMinutes: 1000,
      smsMessages: 2500,
      whatsappConversations: 1000,
      emailMessages: 10000,
      aiUsage: 7500, // 7,500 AI conversations/month
      contacts: 5000,
      teamMembers: 5,
      knowledgeDocuments: 100,
      storage: '20 GB',
      allowOverage: true
    },
    features: [
      '1 website',
      '1 AI Sales Agent',
      '7,500 AI conversations/month',
      'Everything in Starter',
      'Advanced qualification',
      'Advanced lead scoring',
      'Appointment/demo capture',
      'Follow-up automation',
      'CRM/webhook integration',
      'WhatsApp integration',
      'Advanced analytics',
      'Advanced workflows',
      'Priority support'
    ]
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    tagline: 'Multiple websites, multiple AI agents & 20,000 AI conversations/month with monthly optimization.',
    positioning: 'For scaling companies requiring multi-agent AI and advanced automations.',
    price: 59999,
    setupFee: 59999,
    currency: 'INR',
    billing: 'monthly',
    aiConversations: 20000,
    voiceMinutes: 3000,
    dropdownLabel: 'Scale (₹59,999/mo + ₹59,999 setup • 20,000 AI Convos)',
    ctaText: 'Buy Now',
    ctaType: 'buy_now',
    pricing: {
      INR: { monthlyPrice: 59999, setupPrice: 59999 },
      USD: { monthlyPrice: 799, setupPrice: 799 },
      GBP: { monthlyPrice: 599, setupPrice: 599 }
    },
    usageLimits: {
      planId: 'scale',
      voiceMinutes: 3000,
      smsMessages: 5000,
      whatsappConversations: 3000,
      emailMessages: 25000,
      aiUsage: 20000, // 20,000 AI conversations/month
      contacts: 20000,
      teamMembers: 15,
      knowledgeDocuments: 300,
      storage: '100 GB',
      allowOverage: true
    },
    features: [
      'Multiple websites',
      'Multiple AI agents',
      '20,000 AI conversations/month',
      'Everything in Growth',
      'Advanced automation',
      'Advanced integrations',
      'Custom workflows',
      'Advanced analytics',
      'Priority support',
      'Monthly optimization'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Bespoke infrastructure, dedicated private models, multi-franchise hierarchies & custom SLAs.',
    positioning: 'For multi-location organizations, franchises & high-volume custom architectures.',
    isCustomPrice: true,
    price: 0,
    setupFee: 0,
    currency: 'INR',
    billing: 'monthly',
    aiConversations: 'Custom',
    voiceMinutes: 'Custom',
    dropdownLabel: 'Enterprise (Custom Architecture & SLA)',
    ctaText: 'Contact Sales',
    ctaType: 'sales',
    pricing: {
      INR: { monthlyPrice: 0, setupPrice: 0 },
      USD: { monthlyPrice: 0, setupPrice: 0 },
      GBP: { monthlyPrice: 0, setupPrice: 0 }
    },
    usageLimits: {
      planId: 'enterprise',
      voiceMinutes: 10000,
      smsMessages: 25000,
      whatsappConversations: 10000,
      emailMessages: 100000,
      aiUsage: 'Custom Volume',
      contacts: 'Custom Volume',
      teamMembers: 'Unlimited',
      knowledgeDocuments: 'Unlimited',
      storage: 'Dedicated Private Cloud',
      allowOverage: false
    },
    features: [
      'Custom deployments',
      'Multiple dedicated AI agents',
      'Custom AI conversation volume',
      'Dedicated account manager',
      'Custom integrations & APIs',
      'Multi-location & franchise support',
      'Bespoke SLA (99.95%+)',
      'Private cloud / security guardrails',
      'Continuous AI model optimization'
    ]
  }
};

// Single canonical pricing registry. Legacy aliases are read-only compatibility exports.\nexport const PLAN_CONFIGS = CANONICAL_PLAN_CONFIGS;\nexport const DEFAULT_PLAN_CONFIGS = PLAN_CONFIGS;

export function normalizePlanId(plan: string | undefined): PlanKey {
  if (!plan) return 'growth';
  const lower = plan.toLowerCase().trim();
  if (lower.startsWith('start')) return 'starter';
  if (lower.startsWith('grow') || lower.startsWith('pro') || lower.startsWith('bus')) return 'growth';
  if (lower.startsWith('scal')) return 'scale';
  if (lower.startsWith('enter') || lower.includes('custom')) return 'enterprise';
  return 'growth';
}

export function getPlanConfig(planId: string | undefined): PlanConfig {
  const key = normalizePlanId(planId);
  return PLAN_CONFIGS[key] || PLAN_CONFIGS.growth;
}

export function getPlanPricing(plan: PlanConfig, targetCurrency: CurrencyCode = 'INR'): PlanPricing {
  if (plan.isCustomPrice) {
    return { monthlyPrice: 0, setupPrice: 0 };
  }
  
  if (plan.pricing && plan.pricing[targetCurrency]) {
    return plan.pricing[targetCurrency]!;
  }
  
  if (targetCurrency === 'INR' && plan.pricing?.INR) return plan.pricing.INR;
  if (targetCurrency === 'USD' && plan.pricing?.USD) return plan.pricing.USD;
  if (targetCurrency === 'GBP' && plan.pricing?.GBP) return plan.pricing.GBP;

  return {
    monthlyPrice: plan.price,
    setupPrice: plan.setupFee
  };
}

export function formatPrice(amount: number, currencyCode: CurrencyCode = 'INR'): string {
  if (amount === 0) return 'Custom';
  return formatCurrencyAmount(amount, currencyCode);
}

export function formatPlanDropdownLabel(planId: string, currency: CurrencyCode = 'INR'): string {
  const config = getPlanConfig(planId);
  const pricing = getPlanPricing(config, currency);
  if (config.isCustomPrice) {
    return `${config.name} (Custom Pricing)`;
  }
  const formattedMonthly = formatCurrencyAmount(pricing.monthlyPrice, currency);
  const formattedSetup = formatCurrencyAmount(pricing.setupPrice, currency);
  return `${config.name} (${formattedMonthly}/mo + ${formattedSetup} setup)`;
}

export function getRecommendedCurrency(): CurrencyCode {
  return 'INR';
}

// ----------------------------------------------------
// USAGE LIMITS & TELEMETRY THRESHOLDS
// ----------------------------------------------------

export interface UsageThresholdStatus {
  usedConversations: number;
  limitConversations: number;
  percentage: number;
  totalMessages: number;
  totalTokens: number;
  estimatedApiCost: number;
  costCurrency: CurrencyCode;
  alertLevel: 'NORMAL' | 'WARNING_80' | 'WARNING_90' | 'LIMIT_ENFORCED_100';
  isEnforced: boolean;
  badgeColor: string;
  bannerMessage: string;
}

export function calculateUsageThreshold(
  usedConvos: number,
  limitConvos: number,
  currency: CurrencyCode = 'INR'
): UsageThresholdStatus {
  const limit = limitConvos > 0 ? limitConvos : 7500;
  const pct = Math.min(100, Math.round((usedConvos / limit) * 100));
  
  // Approximate realistic telemetry
  const totalMessages = usedConvos * 6 + 1420;
  const totalTokens = usedConvos * 850 + 250000;
  
  // Estimated API cost: ~$0.0006 per 1k tokens
  const costUSD = (totalTokens / 1000) * 0.0006;
  const costMultiplier = currency === 'INR' ? 86.5 : currency === 'GBP' ? 0.79 : 1.0;
  const estimatedApiCost = Math.round(costUSD * costMultiplier * 100) / 100;

  let alertLevel: UsageThresholdStatus['alertLevel'] = 'NORMAL';
  let isEnforced = false;
  let badgeColor = 'emerald';
  let bannerMessage = 'AI operations running smoothly within plan quota.';

  if (pct >= 100) {
    alertLevel = 'LIMIT_ENFORCED_100';
    isEnforced = true;
    badgeColor = 'rose';
    bannerMessage = '100% Plan limit reached. Upgrade plan now to resume automatic conversation processing.';
  } else if (pct >= 90) {
    alertLevel = 'WARNING_90';
    isEnforced = false;
    badgeColor = 'orange';
    bannerMessage = 'Critical Usage Alert (90%): You have consumed 90% of your monthly conversations. Automated processing will pause at 100%.';
  } else if (pct >= 80) {
    alertLevel = 'WARNING_80';
    isEnforced = false;
    badgeColor = 'amber';
    bannerMessage = 'Usage Warning (80%): You have reached 80% of your included conversation allowance. Upgrade to ensure uninterrupted sales coverage.';
  }

  return {
    usedConversations: usedConvos,
    limitConversations: limit,
    percentage: pct,
    totalMessages,
    totalTokens,
    estimatedApiCost,
    costCurrency: currency,
    alertLevel,
    isEnforced,
    badgeColor,
    bannerMessage
  };
}

// ----------------------------------------------------
// PLAN FEATURE FLAGS & GATING CONFIGURATION
// ----------------------------------------------------

export type PlanFeatureKey =
  | 'ai_website_receptionist'
  | 'ai_voice_receptionist'
  | 'missed_call_textback'
  | 'lead_capture'
  | 'ai_lead_qualification'
  | 'ai_lead_scoring'
  | 'automated_lead_followup'
  | 'customer_reengagement'
  | 'database_reactivation'
  | 'appointment_booking'
  | 'appointment_reminders'
  | 'review_management'
  | 'estimate_followup'
  | 'full_crm'
  | 'ai_copilot'
  | 'cold_outreach'
  | 'advanced_analytics'
  | 'custom_dashboard'
  | 'workflow_automation'
  | 'multiple_ai_agents'
  | 'custom_integrations'
  | 'multi_location'
  | 'whitelabel'
  | 'priority_support'
  | 'continuous_ai_optimization';

export const PLAN_FEATURE_FLAGS: Record<PlanFeatureKey, {
  name: string;
  minPlan: 'starter' | 'growth' | 'scale' | 'enterprise';
}> = {
  ai_website_receptionist: { name: 'AI Website Receptionist', minPlan: 'starter' },
  lead_capture: { name: 'Lead Capture', minPlan: 'starter' },
  appointment_booking: { name: 'Appointment Booking', minPlan: 'starter' },
  ai_voice_receptionist: { name: 'AI Voice Receptionist', minPlan: 'growth' },
  missed_call_textback: { name: 'Missed-Call Text Back', minPlan: 'growth' },
  ai_lead_qualification: { name: 'AI Lead Qualification', minPlan: 'starter' },
  ai_lead_scoring: { name: 'AI Lead Scoring (HOT/WARM/COLD)', minPlan: 'starter' },
  automated_lead_followup: { name: 'Automated Lead Follow-Up', minPlan: 'growth' },
  appointment_reminders: { name: 'Appointment Reminders', minPlan: 'growth' },
  review_management: { name: 'Review Management', minPlan: 'growth' },
  estimate_followup: { name: 'Estimate Follow-Up', minPlan: 'growth' },
  workflow_automation: { name: 'Workflow Automation', minPlan: 'growth' },
  customer_reengagement: { name: 'Customer Re-Engagement', minPlan: 'scale' },
  database_reactivation: { name: 'Database Reactivation', minPlan: 'scale' },
  full_crm: { name: 'Full CRM & Deals Pipeline', minPlan: 'growth' },
  ai_copilot: { name: 'AI Copilot Assistant', minPlan: 'scale' },
  cold_outreach: { name: 'Cold Outreach System', minPlan: 'scale' },
  advanced_analytics: { name: 'Advanced Analytics', minPlan: 'growth' },
  custom_dashboard: { name: 'Custom Dashboard', minPlan: 'scale' },
  multiple_ai_agents: { name: 'Multiple AI Agents', minPlan: 'scale' },
  custom_integrations: { name: 'Custom Integrations', minPlan: 'scale' },
  multi_location: { name: 'Multi-location Support', minPlan: 'scale' },
  whitelabel: { name: 'White-label Capability', minPlan: 'enterprise' },
  priority_support: { name: 'Priority Support', minPlan: 'growth' },
  continuous_ai_optimization: { name: 'Continuous AI Optimization', minPlan: 'scale' }
};

const PLAN_HIERARCHY: Record<string, number> = {
  starter: 1,
  growth: 2,
  scale: 3,
  enterprise: 4
};

export function isFeatureAllowed(featureKey: PlanFeatureKey, userPlan: string | undefined): boolean {
  const normalized = normalizePlanId(userPlan);
  const required = PLAN_FEATURE_FLAGS[featureKey]?.minPlan || 'starter';
  return (PLAN_HIERARCHY[normalized] || 1) >= (PLAN_HIERARCHY[required] || 1);
}

export function getFeatureGateInfo(featureKey: PlanFeatureKey, userPlan: string | undefined): {
  allowed: boolean;
  requiredPlanName: string;
  currentPlanName: string;
} {
  const normalized = normalizePlanId(userPlan);
  const required = PLAN_FEATURE_FLAGS[featureKey]?.minPlan || 'starter';
  const allowed = (PLAN_HIERARCHY[normalized] || 1) >= (PLAN_HIERARCHY[required] || 1);

  return {
    allowed,
    requiredPlanName: PLAN_CONFIGS[required]?.name || 'Growth',
    currentPlanName: PLAN_CONFIGS[normalized]?.name || 'Starter'
  };
}

export const COMMUNICATION_USAGE_DISCLOSURE = {
  title: 'Platform-Managed Telephony & Messaging Infrastructure',
  sectionTitle: 'Platform-Managed Telephony & Messaging Infrastructure',
  headline: 'All AI Voice telephony trunks, SMS routing, and WhatsApp Business API gateways are natively provisioned and managed by AgentDesk Technologies.',
  subtext: 'Standard monthly allowances are included in your platform fee. Transparent metered rates apply for high-volume overages with zero carrier setup headaches.',
  summary: 'AI RevenueOS operates as an autonomous, fully hosted Managed AI Service. Voice AI telephony trunks, SMS routing, and WhatsApp Business API gateways are pre-provisioned, monitored, and scaled natively by AgentDesk Technologies.',
  categories: [
    { name: 'AI Voice Receptionist Telephony', description: 'Inbound & outbound conversational voice minutes with real-time speech synthesis and sentiment detection.', includedEnterprise: '2,500 Mins / Month' },
    { name: 'Missed-Call SMS & Drips', description: 'Two-way SMS text messaging, missed call instant recovery, estimate follow-ups, and review requests.', includedEnterprise: '5,000 Texts / Month' },
    { name: 'WhatsApp Business API', description: 'Meta-verified official WhatsApp Business Cloud API session windows and template notifications.', includedEnterprise: '3,000 Convos / Month' },
    { name: 'Cold Outreach & Email Delivery', description: 'High-deliverability dedicated SMTP pools, SPF/DKIM verification, and spam throttling.', includedEnterprise: '15,000 Emails / Month' },
    { name: 'Autonomous AI Processing', description: 'Gemini 2.5 Flash neural processing, RAG vector retrieval, and live call transcripts.', includedEnterprise: 'Controlled Quota per Plan' },
    { name: 'Knowledge Base Vector Docs', description: 'Indexed service manuals, PDFs, website URLs, and pricing tables for grounding.', includedEnterprise: '150 Documents' }
  ],
  items: [
    {
      title: 'Included Base Tier Quotas',
      desc: 'Each plan includes dedicated monthly pools of AI Conversations (2,000 for Starter, 7,500 for Growth, 20,000 for Scale), Voice AI minutes, and SMS/WhatsApp sessions.'
    },
    {
      title: 'Transparent Overages & No Contract Traps',
      desc: 'Usage exceeding plan allowances is billed on a transparent per-minute/per-message basis directly through your organization billing ledger.'
    },
    {
      title: 'Zero Telecom Setup Required',
      desc: 'No requirement to purchase third-party Twilio, Telnyx, or Meta developer accounts unless custom BYO-carrier routing is requested under Enterprise.'
    }
  ]
};

export const PLATFORM_MANAGED_OPERATIONS = {
  title: 'Platform & Managed AI Operations',
  description: 'Enterprise-grade hosting, multi-agent AI execution, automated database backups, continuous model fine-tuning, and dedicated account supervision.',
  includedItems: [
    '24/7 AI Voice & Telephony Trunk Supervision',
    'Semantic Knowledge Base Auto-Sync & Reindexing',
    'Real-time Multi-Touch Follow-Up Automations',
    'Dedicated Cloud Database & Tenant Isolation',
    'SOC-2 Type II Compliant Security Guardrails',
    'Weekly Conversion Rate Optimization Audits'
  ],
  company: 'AgentDesk Technologies',
  product: 'AI RevenueOS',
  tagline: 'ONE AI SYSTEM FOR EVERY CUSTOMER INTERACTION',
  slaUptime: '99.95% Enterprise SLA',
  soc2Compliance: 'SOC-2 Type II Certified Data Privacy',
  voiceLatency: '< 450ms Realtime Voice Pipeline',
  globalPresence: 'India, USA, UK and Global Multi-Region Edge'
};

export const PRICING_PLANS: PlanConfig[] = Object.values(PLAN_CONFIGS);

export const IMPLEMENTATION_EXPLANATION = {
  title: '12-Step Enterprise Implementation Methodology',
  summary: 'Every AI RevenueOS deployment is built, tuned, and monitored through our white-glove engineering roadmap to guarantee flawless performance and immediate revenue lift.',
  steps: [
    { step: 1, title: 'Discovery & Business Audit', desc: 'Deep dive into call volumes, FAQs, lead qualification criteria, and CRM workflows.' },
    { step: 2, title: 'Knowledge Base Ingestion', desc: 'Semantic indexing of service catalogs, pricing guides, PDFs, warranty terms, and FAQs.' },
    { step: 3, title: 'AI Voice & Chat Persona Tuning', desc: 'Customization of conversational voice tone, polite boundary guardrails, and brand voice.' },
    { step: 4, title: 'CRM & Pipeline Configuration', desc: 'Custom deal stages, automated contact tagging, and qualification scoring formulas.' },
    { step: 5, title: 'Missed-Call Text Back Setup', desc: 'Configuring instant SMS/WhatsApp recovery sequences with personalized customer prompts.' },
    { step: 6, title: 'Multi-Touch Follow-Up Sequencing', desc: 'Day 0 to Day 7 automated outreach templates across email, SMS, and WhatsApp.' },
    { step: 7, title: 'Telephony & Calendar Integration', desc: 'SIP trunking, 10DLC registration, WebRTC client setup, and 2-way Google Calendar sync.' },
    { step: 8, title: 'Review & Reputation Automations', desc: 'Post-service review requests and AI sentiment escalation triage routing.' },
    { step: 9, title: 'Rigorous Simulation & QA', desc: 'Testing edge cases, accents, complex booking requests, and objection handling.' },
    { step: 10, title: 'Staff Onboarding & Walkthrough', desc: 'Live team training on SaaS console, human handoff triggers, and mobile alerts.' },
    { step: 11, title: 'Production Go-Live Launch', desc: 'Live traffic routing with active engineer supervision during the initial 48 hours.' },
    { step: 12, title: 'Continuous Model Optimization', desc: 'Weekly transcript audits, prompt refinement, and conversion rate enhancement.' }
  ]
};

export const ENTERPRISE_CONSOLIDATION_VALUE = {
  title: 'Consolidate 10+ Disjointed Subscriptions into One AI Platform',
  subtitle: 'Save up to 70% in monthly software overhead while eliminating lead slippage between disconnected tools.',
  categories: [
    { name: 'AI Voice Telephony', replaces: 'Answering services, virtual receptionists ($1,200+/mo)' },
    { name: 'Website Chatbot', replaces: 'Intercom, Drift, generic bot widgets ($300+/mo)' },
    { name: 'Missed Call Recovery', replaces: 'Custom Zapier automations, third-party text back ($200+/mo)' },
    { name: 'Lead Qualification', replaces: 'Manual intake coordinators, SDR screening hours ($3,000+/mo)' },
    { name: 'CRM & Pipeline', replaces: 'HubSpot Pro, Salesforce seats, Pipedrive ($500+/mo)' },
    { name: 'Automated Follow-Up', replaces: 'ActiveCampaign, Klaviyo SMS, Mailchimp ($350+/mo)' },
    { name: 'Appointment Booking', replaces: 'Calendly, Acuity, Chili Piper ($100+/mo)' },
    { name: 'Review Generation', replaces: 'BirdEye, Podium, Birdeye ($400+/mo)' },
    { name: 'Quote Follow-Up', replaces: 'PandaDoc, Proposify alerts ($150+/mo)' },
    { name: 'Cold Outreach Engine', replaces: 'Apollo, Lemlist, Instantly ($300+/mo)' }
  ],
  revenueFlow: [
    { stage: 'Inbound Signal', desc: 'Inbound call, website chat, or form submitted 24/7' },
    { stage: 'AI Qualification', desc: 'Evaluates budget, timeline & scores lead 1-100 instantly' },
    { stage: 'Instant Booking', desc: 'Books calendar slot or dispatches technician on-call' },
    { stage: 'Autonomous Nudge', desc: 'Follows up via SMS/WhatsApp until estimate is approved' },
    { stage: 'Cash Collected', desc: 'Review requested & contact enrolled in re-engagement loop' }
  ]
};

export interface PlanComparisonRow {
  category: string;
  feature: string;
  starter: boolean | string;
  growth: boolean | string;
  scale: boolean | string;
  enterprise: boolean | string;
}

export const PLAN_COMPARISON_TABLE: PlanComparisonRow[] = [
  { category: 'Websites & Agents', feature: 'Websites Included', starter: '1 Website', growth: '1 Website', scale: 'Multiple Websites', enterprise: 'Unlimited' },
  { category: 'Websites & Agents', feature: 'AI Sales Agents', starter: '1 AI Agent', growth: '1 AI Agent', scale: 'Multiple AI Agents', enterprise: 'Dedicated Agents' },
  { category: 'Usage Allowance', feature: 'AI Conversations / Month', starter: '2,000 / mo', growth: '7,500 / mo', scale: '20,000 / mo', enterprise: 'Custom Volume' },
  { category: 'Lead Conversion', feature: 'Lead Capture & Storage', starter: true, growth: true, scale: true, enterprise: true },
  { category: 'Lead Conversion', feature: 'Lead Qualification (HOT/WARM/COLD)', starter: true, growth: true, scale: true, enterprise: true },
  { category: 'Lead Conversion', feature: 'Appointment / Demo Capture', starter: false, growth: true, scale: true, enterprise: true },
  { category: 'Knowledge & AI', feature: 'Business Knowledge Base', starter: true, growth: true, scale: true, enterprise: true },
  { category: 'Automation', feature: 'Follow-Up Automation', starter: 'Basic', growth: 'Advanced Multi-touch', scale: 'Custom Workflows', enterprise: 'Autonomous Pipelines' },
  { category: 'Integrations', feature: 'CRM & Webhook Integration', starter: false, growth: true, scale: true, enterprise: 'Custom APIs' },
  { category: 'Integrations', feature: 'WhatsApp Integration', starter: false, growth: true, scale: true, enterprise: true },
  { category: 'Analytics', feature: 'Analytics & Reporting', starter: 'Basic', growth: 'Advanced', scale: 'Advanced + BI', enterprise: 'Executive BI' },
  { category: 'Operations', feature: 'Human Handoff', starter: true, growth: true, scale: true, enterprise: true },
  { category: 'Operations', feature: 'Monthly AI Optimization', starter: false, growth: false, scale: true, enterprise: 'Continuous SLA' },
  { category: 'Support', feature: 'Support Level', starter: 'Standard Support', growth: 'Priority Support', scale: 'Priority + Manager', enterprise: 'Dedicated 24/7 SLA' }
];

