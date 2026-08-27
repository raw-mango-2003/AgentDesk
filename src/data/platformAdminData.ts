import { Business, AIAgent, KnowledgeItem } from '../types';

export const PLATFORM_ADMIN_TENANT_ID = 'platform';
export const PLATFORM_ADMIN_AGENT_ID = 'platform-admin-agent';

// Dedicated Platform Admin Business Entity (Independent from Public Demo and Customer Tenants)
export const PLATFORM_ADMIN_BUSINESS: Business = {
  id: PLATFORM_ADMIN_TENANT_ID,
  tenantId: PLATFORM_ADMIN_TENANT_ID,
  tenantType: 'customer',
  isDemo: false,
  primaryAgentId: PLATFORM_ADMIN_AGENT_ID,
  name: 'AgentDesk Platform',
  industry: 'B2B AI Sales Automation Platform',
  description: 'Official AgentDesk Platform AI Sales & Support Employee. Manages platform sales inquiries, lead qualification, and customer assistance.',
  website: 'https://agentdesk.ai',
  supportEmail: 'support@agentdesk.ai',
  phone: '+1 (800) 555-0199',
  address: '100 Innovation Way, Suite 400, San Francisco, CA 94107',
  country: 'US',
  currency: 'USD',
  timezone: 'America/New_York',
  locale: 'en-US',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
  agentSettings: {
    agentName: 'AgentDesk AI',
    welcomeMessage: 'Hello! I am the AgentDesk AI Sales Assistant.',
    businessDescription: 'AgentDesk is the AI RevenueOS: Your 24/7 AI Sales Employee that talks to website visitors, answers questions, qualifies leads, and books sales appointments.',
    tone: 'Friendly',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    suggestedQuestions: [
      'What is AgentDesk and how does it work?',
      'What are the pricing tiers and limits?',
      'How does lead qualification work?',
      'How do I deploy an AI agent on my site?'
    ],
    systemSecurityInstructions: 'Strict platform admin isolation. You represent the AgentDesk Platform directly. Answer questions accurately based on the latest Platform Admin knowledge base.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true,
    minQualificationScore: 65,
    qualificationRules: [
      { id: 'pq-1', question: 'What is your primary use case (Website Chat, AI Voice Reception, Lead Recovery)?', field: 'service_interest', required: true, scoreWeight: 35 },
      { id: 'pq-2', question: 'What is your estimated monthly conversation volume?', field: 'budget', required: true, scoreWeight: 35 },
      { id: 'pq-3', question: 'When are you looking to launch your AI sales employee?', field: 'timeline', required: false, scoreWeight: 30 }
    ]
  },
  voice: 'Puck',
  voiceGreeting: 'Hello! Welcome to AgentDesk. I am your AgentDesk AI Assistant. How can I assist your business with autonomous sales and qualification today?',
  plan: 'Enterprise',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  trialDaysRemaining: 365,
  whiteLabelEnabled: true,
  dataRetentionDays: 365,
  maxMonthlyVoiceMinutes: 10000,
  maxMonthlyMessages: 100000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: new Date().toISOString()
};

// Dedicated Platform Admin AI Agent Entity (ownershipType = 'PLATFORM')
export const PLATFORM_ADMIN_AGENT: AIAgent = {
  id: PLATFORM_ADMIN_AGENT_ID,
  tenantId: PLATFORM_ADMIN_TENANT_ID,
  ownershipType: 'PLATFORM',
  publicId: PLATFORM_ADMIN_AGENT_ID,
  name: 'AgentDesk AI',
  role: 'AgentDesk Platform AI Assistant',
  status: 'PUBLISHED',
  systemInstructions: 'You are the AgentDesk AI Assistant representing the AgentDesk Platform directly. Explain AgentDesk features, pricing, deployment, lead scoring, and support procedures accurately.',
  customInstructions: 'Strict platform isolation. You represent AgentDesk Platform ONLY.',
  welcomeMessage: 'Hello! I am the AgentDesk AI Sales Assistant.',
  businessDescription: 'AgentDesk is the AI RevenueOS: Your 24/7 AI Sales Employee that talks to website visitors, answers questions, qualifies leads, and books sales appointments.',
  tone: 'Friendly',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  voice: 'Puck',
  voiceGreeting: 'Hello! Welcome to AgentDesk. I am your AgentDesk AI Assistant. How can I assist your business with autonomous sales and qualification today?',
  suggestedQuestions: [
    'What is AgentDesk and how does it work?',
    'What are the pricing tiers and limits?',
    'How does lead qualification work?',
    'How do I deploy an AI agent on my site?'
  ],
  humanHandoffEnabled: true,
  leadCaptureEnabled: true,
  minQualificationScore: 65,
  qualificationRules: [
    { id: 'pq-1', question: 'What is your primary use case (Website Chat, AI Voice Reception, Lead Recovery)?', field: 'service_interest', required: true, scoreWeight: 35 },
    { id: 'pq-2', question: 'What is your estimated monthly conversation volume?', field: 'budget', required: true, scoreWeight: 35 },
    { id: 'pq-3', question: 'When are you looking to launch your AI sales employee?', field: 'timeline', required: false, scoreWeight: 30 }
  ],
  businessHours: 'Mon - Fri: 9:00 AM - 6:00 PM EST (AI operates 24/7)',
  supportEmail: 'support@agentdesk.ai',
  supportPhone: '+1 (800) 555-0199',
  website: 'https://agentdesk.ai',
  productsServices: 'Website Chat AI, AI Voice Receptionist, Missed Call Text-Back, Autonomous Lead Scoring & CRM, Multi-Touch Follow-ups',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: new Date().toISOString()
};

// Platform Admin Knowledge Base (Strictly scoped to tenantId: 'platform')
export const PLATFORM_ADMIN_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-platform-admin-1',
    businessId: PLATFORM_ADMIN_TENANT_ID,
    tenantId: PLATFORM_ADMIN_TENANT_ID,
    title: 'What is AgentDesk and AI RevenueOS?',
    category: 'Platform Overview',
    type: 'faq',
    content: 'AgentDesk is the AI RevenueOS: a managed 24/7 AI Sales Employee that talks to website visitors, answers questions from your company knowledge base, qualifies prospective leads with customizable criteria, scores purchase intent (HOT, WARM, COLD), captures contact details, and routes sales-ready prospects directly to your team. It combines AI Voice Reception, Website Chat, Missed Call Text-Back, CRM, and automated multi-touch follow-ups.',
    status: 'active',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-platform-admin-2',
    businessId: PLATFORM_ADMIN_TENANT_ID,
    tenantId: PLATFORM_ADMIN_TENANT_ID,
    title: 'AgentDesk Pricing and Subscription Plans',
    category: 'Pricing',
    type: 'faq',
    content: 'AgentDesk offers 3 transparent tiers with zero hidden markups:\n1. Starter: ₹14,999/mo (India) with ₹19,999 setup | $199/mo (USA) with $249 setup | £159/mo (UK) with £199 setup. Includes 2,000 AI conversations/month, Website Chat AI, Lead Qualification, and Core CRM.\n2. Growth (Most Popular): ₹29,999/mo (India) with ₹34,999 setup | $399/mo (USA) with $449 setup | £299/mo (UK) with £349 setup. Includes 7,500 AI conversations/month, AI Voice Receptionist, Missed Call Recovery, Multi-Touch Follow-ups, and Automated Review Generation.\n3. Scale: ₹59,999/mo (India) with ₹59,999 setup | $799/mo (USA) with $799 setup | £599/mo (UK) with £599 setup. Includes 20,000 AI conversations/month, Database Reactivation, Multi-Tenant Partitioning, and Custom Integrations.\n4. Enterprise: Custom high-volume SLA, custom SLAs, and dedicated engineering support.',
    status: 'active',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-platform-admin-3',
    businessId: PLATFORM_ADMIN_TENANT_ID,
    tenantId: PLATFORM_ADMIN_TENANT_ID,
    title: 'How AI Lead Qualification and Scoring Works',
    category: 'Lead Qualification',
    type: 'faq',
    content: 'AgentDesk autonomously qualifies prospective leads during conversations by evaluating 4 core signals: purchase intent, budget suitability, project timeline, and decision authority. Leads are scored transparently on a 0 to 100 scale:\n- HOT (Score 70-100): High intent, ready budget, immediate timeline.\n- WARM (Score 40-69): Exploring options with defined interest.\n- COLD (Score 0-39): General inquiries or early research.\nScored leads are instantly tagged and synced to your CRM with conversation transcripts.',
    status: 'active',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-platform-admin-4',
    businessId: PLATFORM_ADMIN_TENANT_ID,
    tenantId: PLATFORM_ADMIN_TENANT_ID,
    title: '12-Step Managed Implementation & Deployment Process',
    category: 'Implementation',
    type: 'faq',
    content: 'AgentDesk provides a complete 12-step white-glove setup:\n1. Business Discovery & Workflow Mapping\n2. AI Voice Persona Acoustic Engineering\n3. Semantic Knowledge Base Ingestion & Verification\n4. CRM Pipeline & Stage Customization\n5. Lead Qualification Scoring Calibration\n6. Multi-Touch Follow-Up Workflow Setup (SMS, Email, WhatsApp)\n7. Telephony & Twilio / WhatsApp Business Integration\n8. Multi-Currency & Regional Formatting Configuration\n9. Security Boundary & Tenant Isolation Testing\n10. Live Widget Embedding on Website\n11. Staff Onboarding & Dashboard Training\n12. Dedicated Launch Monitoring & Quality Assurance.',
    status: 'active',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-platform-admin-5',
    businessId: PLATFORM_ADMIN_TENANT_ID,
    tenantId: PLATFORM_ADMIN_TENANT_ID,
    title: 'Platform Architecture & Strict Multi-Tenant Isolation',
    category: 'Architecture & Security',
    type: 'faq',
    content: 'AgentDesk enforces strict multi-tenant isolation across database records, conversation sessions, and semantic vector knowledge stores. Every customer tenant has a dedicated cryptographic partition and tenant ID barrier. Platform Admin, Public Demo, Demo Tenant, and Customer Tenants operate in 4 distinct isolated contexts with zero cross-tenant data leakage.',
    status: 'active',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-platform-admin-6',
    businessId: PLATFORM_ADMIN_TENANT_ID,
    tenantId: PLATFORM_ADMIN_TENANT_ID,
    title: 'Support SLA, Contact Details, and Human Handoff',
    category: 'Support & Contact',
    type: 'faq',
    content: 'Platform support is available 24/7 via support@agentdesk.ai and phone at +1 (800) 555-0199. For urgent issues, ticket response times are under 1 hour for Enterprise clients and under 4 hours for Growth clients. Human handoff can be triggered automatically during live customer conversations when high complexity or custom requests are detected.',
    status: 'active',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  }
];
