import { Business, AIAgent, KnowledgeItem } from '../types';

export const PUBLIC_DEMO_TENANT_ID = 'agentdesk-public-demo';
export const PUBLIC_DEMO_AGENT_ID = 'public-demo-agent';

// Dedicated Public AgentDesk Sales Employee (for Public Landing Page & Website Visitor Demo)
export const PUBLIC_AGENTDESK_DEMO_BUSINESS: Business = {
  id: PUBLIC_DEMO_TENANT_ID,
  tenantId: PUBLIC_DEMO_TENANT_ID,
  tenantType: 'demo',
  isDemo: true,
  primaryAgentId: PUBLIC_DEMO_AGENT_ID,
  name: 'AgentDesk Technologies',
  industry: 'B2B AI Sales Automation Platform',
  description: 'AgentDesk is the AI RevenueOS: Your 24/7 AI Sales Employee that talks to website visitors, answers questions, qualifies leads, and books sales appointments.',
  website: 'https://agentdesk.ai',
  supportEmail: 'sales@agentdesk.ai',
  logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  agentSettings: {
    agentName: 'AgentDesk Sales Assistant',
    welcomeMessage: 'Hi 👋 I am the AgentDesk AI Sales Employee. I talk to website visitors, answer questions about our platform and pricing, qualify your needs, and book live demos. How can I help you today?',
    businessDescription: 'AgentDesk is a managed AI Sales Employee platform providing autonomous website chat, voice reception, missed call text back, lead qualification, and CRM automation.',
    tone: 'Friendly',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    suggestedQuestions: [
      'What is AgentDesk?',
      'What are your pricing plans?',
      'How does lead qualification work?',
      'How does the 12-step deployment work?'
    ],
    systemSecurityInstructions: 'Strict isolation. You represent AgentDesk Technologies ONLY. Explain AgentDesk features, pricing, and qualification capabilities accurately.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  voice: 'Puck',
  voiceGreeting: 'Hello! Welcome to AgentDesk Technologies. I am your 24/7 AI Sales Employee. How can I assist you with automated sales and customer qualification today?',
  plan: 'Enterprise',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  trialDaysRemaining: 30,
  currency: 'USD',
  whiteLabelEnabled: true,
  dataRetentionDays: 180,
  maxMonthlyVoiceMinutes: 2000,
  maxMonthlyMessages: 20000,
  createdAt: new Date().toISOString()
};

export const PUBLIC_AGENTDESK_DEMO_AGENT: AIAgent = {
  id: PUBLIC_DEMO_AGENT_ID,
  tenantId: PUBLIC_DEMO_TENANT_ID,
  publicId: PUBLIC_DEMO_AGENT_ID,
  name: 'AgentDesk Sales Assistant',
  role: 'AI Sales Representative',
  status: 'PUBLISHED',
  systemInstructions: 'You are the AgentDesk AI Sales Employee representing AgentDesk Technologies. Explain AgentDesk features, pricing, qualification, and deployment accurately.',
  welcomeMessage: 'Hi 👋 I am the AgentDesk AI Sales Employee. I talk to website visitors, answer questions about our platform and pricing, qualify your needs, and book live demos. How can I help you today?',
  businessDescription: 'AgentDesk is the AI RevenueOS: Your 24/7 AI Sales Employee that talks to website visitors, answers questions, qualifies leads, and books sales appointments.',
  tone: 'Friendly',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  voice: 'Puck',
  voiceGreeting: 'Hello! Welcome to AgentDesk Technologies. I am your 24/7 AI Sales Employee. How can I assist you with automated sales and customer qualification today?',
  suggestedQuestions: [
    'What is AgentDesk?',
    'What are your pricing plans?',
    'How does lead qualification work?',
    'How does the 12-step deployment work?'
  ],
  humanHandoffEnabled: true,
  leadCaptureEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-public-demo-1',
    businessId: PUBLIC_DEMO_TENANT_ID,
    tenantId: PUBLIC_DEMO_TENANT_ID,
    title: 'What is AgentDesk and AI RevenueOS?',
    category: 'Platform Overview',
    type: 'faq',
    content: 'AgentDesk Technologies provides a 24/7 AI Sales Employee for businesses. It talks to website visitors, answers questions from your company knowledge base, qualifies prospective leads with customizable criteria, scores purchase intent (HOT, WARM, COLD), captures contact details, and routes sales-ready prospects directly to your team. It combines AI Voice Reception, Website Chat, Missed Call Text-Back, CRM, and automated multi-touch follow-ups.',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-public-demo-2',
    businessId: PUBLIC_DEMO_TENANT_ID,
    tenantId: PUBLIC_DEMO_TENANT_ID,
    title: 'AgentDesk Pricing and Subscription Plans',
    category: 'Pricing',
    type: 'faq',
    content: 'AgentDesk offers 3 transparent tiers with zero hidden markups:\n1. Starter: ₹14,999/mo (India) with ₹19,999 setup | $199/mo (USA) with $249 setup | £159/mo (UK) with £199 setup. Includes 2,000 AI conversations/month, Website Chat AI, Lead Qualification, and Core CRM.\n2. Growth (Most Popular): ₹29,999/mo (India) with ₹34,999 setup | $399/mo (USA) with $449 setup | £299/mo (UK) with £349 setup. Includes 7,500 AI conversations/month, AI Voice Receptionist, Missed Call Recovery, Multi-Touch Follow-ups, and Automated Review Generation.\n3. Scale: ₹59,999/mo (India) with ₹59,999 setup | $799/mo (USA) with $799 setup | £599/mo (UK) with £599 setup. Includes 20,000 AI conversations/month, Database Reactivation, Multi-Tenant Partitioning, and Custom Integrations.\n4. Enterprise: Custom high-volume SLA and dedicated engineering support.',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-public-demo-3',
    businessId: PUBLIC_DEMO_TENANT_ID,
    tenantId: PUBLIC_DEMO_TENANT_ID,
    title: 'How AI Lead Qualification and Scoring Works',
    category: 'Lead Qualification',
    type: 'faq',
    content: 'AgentDesk autonomously qualifies prospective leads during conversations by evaluating 4 core signals: purchase intent, budget suitability, project timeline, and decision authority. Leads are scored transparently on a 0 to 100 scale:\n- HOT (Score 70-100): High intent, ready budget, immediate timeline.\n- WARM (Score 40-69): Exploring options with defined interest.\n- COLD (Score 0-39): General inquiries or early research.\nScored leads are instantly tagged and synced to your CRM with conversation transcripts.',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-public-demo-4',
    businessId: PUBLIC_DEMO_TENANT_ID,
    tenantId: PUBLIC_DEMO_TENANT_ID,
    title: '12-Step Managed Implementation & Deployment Process',
    category: 'Implementation',
    type: 'faq',
    content: 'AgentDesk provides a complete 12-step white-glove setup:\n1. Business Discovery & Workflow Mapping\n2. AI Voice Persona Acoustic Engineering\n3. Semantic Knowledge Base Ingestion & Verification\n4. CRM Pipeline & Stage Customization\n5. Lead Qualification Scoring Calibration\n6. Multi-Touch Follow-Up Workflow Setup (SMS, Email, WhatsApp)\n7. Telephony & Twilio / WhatsApp Business Integration\n8. Multi-Currency & Regional Formatting Configuration\n9. Security Boundary & Tenant Isolation Testing\n10. Live Widget Embedding on Website\n11. Staff Onboarding & Dashboard Training\n12. Dedicated Launch Monitoring & Quality Assurance.',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-public-demo-5',
    businessId: PUBLIC_DEMO_TENANT_ID,
    tenantId: PUBLIC_DEMO_TENANT_ID,
    title: 'Multi-Currency & Regional Support',
    category: 'Localization',
    type: 'faq',
    content: 'AgentDesk supports localized operations across 3 primary currency markets: India (INR ₹), United States (USD $), and United Kingdom (GBP £). Each business tenant operates with fixed local commercial pricing, local telephone routing, and localized timezone formatting without dynamic exchange fluctuations.',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-public-demo-6',
    businessId: PUBLIC_DEMO_TENANT_ID,
    tenantId: PUBLIC_DEMO_TENANT_ID,
    title: 'Human Handoff & Booking a Live Demo',
    category: 'Contact & Demo',
    type: 'faq',
    content: 'You can test the AI Receptionist right here or click "Launch SaaS Console" to explore the multi-tenant admin workspace. To book a live consultation or discuss custom enterprise requirements, simply provide your name, email, and phone number, and our solution architecture team will reach out within 1 business hour.',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
