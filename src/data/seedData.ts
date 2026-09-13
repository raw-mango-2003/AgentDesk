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
  AuditLog
} from '../types';
import { 
  PUBLIC_AGENTDESK_DEMO_BUSINESS, 
  PUBLIC_AGENTDESK_DEMO_AGENT, 
  PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS, 
  PUBLIC_DEMO_TENANT_ID, 
  PUBLIC_DEMO_AGENT_ID 
} from './publicDemo';
import {
  PLATFORM_ADMIN_BUSINESS,
  PLATFORM_ADMIN_AGENT,
  PLATFORM_ADMIN_KNOWLEDGE_ITEMS,
  PLATFORM_ADMIN_TENANT_ID,
  PLATFORM_ADMIN_AGENT_ID
} from './platformAdminData';

export {
  PUBLIC_AGENTDESK_DEMO_BUSINESS, 
  PUBLIC_AGENTDESK_DEMO_AGENT, 
  PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS, 
  PUBLIC_DEMO_TENANT_ID, 
  PUBLIC_DEMO_AGENT_ID,
  PLATFORM_ADMIN_BUSINESS,
  PLATFORM_ADMIN_AGENT,
  PLATFORM_ADMIN_KNOWLEDGE_ITEMS,
  PLATFORM_ADMIN_TENANT_ID,
  PLATFORM_ADMIN_AGENT_ID
};

export const SUMMIT_ID = 'summit-home-services';
export const SHARMA_ID = 'sharma-dental-care';
export const LONDON_ID = 'london-growth-partners';
export const ACME_TENANT_ID = 'tenant_acme_123';
export const BETA_TENANT_ID = 'tenant_beta_789';

export const SUMMIT_AGENT_ID = 'agent_summit_001';
export const SHARMA_AGENT_ID = 'agent_sharma_002';
export const LONDON_AGENT_ID = 'agent_london_003';
export const ACME_AGENT_ID = 'agent_acme_456';
export const BETA_AGENT_ID = 'agent_beta_101';

export const SEED_AGENTS: AIAgent[] = [
  PLATFORM_ADMIN_AGENT,
  PUBLIC_AGENTDESK_DEMO_AGENT,
  {
    id: SUMMIT_AGENT_ID,
    publicId: SUMMIT_AGENT_ID,
    tenantId: SUMMIT_ID,
    name: 'Sarah - Summit AI Receptionist',
    role: 'AI Receptionist & Service Dispatcher',
    welcomeMessage: 'Hello! Welcome to Summit Home Services. I can help you schedule emergency repairs, get an instant estimate, or answer questions about our HVAC and plumbing services. How can I help you today?',
    businessDescription: 'Austin top-rated 24/7 HVAC maintenance, tankless water heater installation, drain clearing, and roof leak repairs.',
    tone: 'Professional',
    status: 'PUBLISHED',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    isDemo: true,
    humanHandoffEnabled: true,
    leadCaptureEnabled: true,
    minQualificationScore: 65,
    suggestedQuestions: [
      'Need 24/7 emergency AC or plumbing repair',
      'Book annual HVAC maintenance checkup',
      'Request an estimate for new heat pump installation',
      'What are your service call fees & warranty?'
    ],
    systemInstructions: 'Always prioritize emergency leaks or AC failure in hot Austin weather. Ask for property address, urgency timeline, and offer immediate technician dispatch slots.',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: ACME_AGENT_ID,
    publicId: ACME_AGENT_ID,
    tenantId: ACME_TENANT_ID,
    name: 'Acme Sales Agent',
    role: 'AI Accounting Software Advisor',
    welcomeMessage: 'Welcome to Acme Technologies. How can I help you with our cloud accounting software and financial management tools today?',
    businessDescription: 'Acme Technologies sells cloud accounting software, financial reporting, real-time invoicing, and automated bookkeeping tools for modern businesses.',
    tone: 'Professional',
    status: 'PUBLISHED',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    isDemo: false,
    humanHandoffEnabled: true,
    leadCaptureEnabled: true,
    minQualificationScore: 60,
    suggestedQuestions: [
      'What accounting software plans do you offer?',
      'Do you provide automated invoicing & payroll integration?',
      'How much does Acme Accounting Software cost?',
      'Can I request a product demo or free trial?'
    ],
    systemInstructions: 'You are the official AI sales advisor for Acme Technologies. We sell accounting software, bookkeeping tools, invoicing, and payroll solutions. We do NOT provide recruitment or staffing services.',
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: BETA_AGENT_ID,
    publicId: BETA_AGENT_ID,
    tenantId: BETA_TENANT_ID,
    name: 'Beta Sales Agent',
    role: 'AI Recruitment & Talent Specialist',
    welcomeMessage: 'Welcome to Beta Solutions. How can I assist you with our executive recruitment and technical staffing services today?',
    businessDescription: 'Beta Solutions provides executive search, technical recruitment, and workforce talent acquisition services.',
    tone: 'Consultative',
    status: 'PUBLISHED',
    primaryColor: '#7c3aed',
    secondaryColor: '#0f172a',
    isDemo: false,
    humanHandoffEnabled: true,
    leadCaptureEnabled: true,
    minQualificationScore: 65,
    suggestedQuestions: [
      'What recruitment and staffing services do you provide?',
      'How do you source senior engineering and executive talent?',
      'What are your search retainers and placement fees?',
      'Can I speak with a recruitment consultant?'
    ],
    systemInstructions: 'You are the official AI representative for Beta Solutions. We provide recruitment, executive search, and staffing services. We do NOT sell accounting software.',
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: SHARMA_AGENT_ID,
    publicId: SHARMA_AGENT_ID,
    tenantId: SHARMA_ID,
    name: 'Aarav - Sharma Dental Assistant',
    role: 'Dental Reception & Appointment Coordinator',
    welcomeMessage: 'Namaste! Welcome to Sharma Dental Care, Indiranagar. I can help you book a dentist appointment, check treatment costs, or arrange instant WhatsApp consultation. What can I do for you today?',
    businessDescription: 'Bangalore leading painless dentistry practice with 15+ years experience, German 3D CBCT imaging, and certified Invisalign providers.',
    tone: 'Friendly',
    status: 'PUBLISHED',
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    isDemo: false,
    humanHandoffEnabled: true,
    leadCaptureEnabled: true,
    minQualificationScore: 60,
    suggestedQuestions: [
      'Book consultation for Dental Implants',
      'Cost of Invisalign clear aligners vs braces',
      'Emergency treatment for severe toothache',
      'Available slots for Dr. Sharma this Saturday'
    ],
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-08-21T11:30:00Z'
  },
  {
    id: LONDON_AGENT_ID,
    publicId: LONDON_AGENT_ID,
    tenantId: LONDON_ID,
    name: 'Victoria - Advisory Executive',
    role: 'Corporate Advisory & Partner Coordinator',
    welcomeMessage: 'Good day! Welcome to London Growth Partners. I can arrange an initial partner consultation, share our advisory case studies, or answer questions regarding our M&A and scaling frameworks.',
    businessDescription: 'London executive advisory firm serving venture-backed scaleups and corporate enterprise clients.',
    tone: 'Professional',
    status: 'PUBLISHED',
    primaryColor: '#6366f1',
    secondaryColor: '#0f172a',
    isDemo: false,
    humanHandoffEnabled: true,
    leadCaptureEnabled: true,
    minQualificationScore: 70,
    suggestedQuestions: [
      'Book partner discovery call',
      'M&A and corporate advisory capabilities',
      'Expansion strategy packages and retainers',
      'Request our 2026 European Tech Benchmarks'
    ],
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z'
  }
];

export const SEED_BUSINESSES: Business[] = [
  PLATFORM_ADMIN_BUSINESS,
  PUBLIC_AGENTDESK_DEMO_BUSINESS,
  {
    id: SUMMIT_ID,
    tenantId: SUMMIT_ID,
    tenantType: 'demo',
    isDemo: true,
    primaryAgentId: SUMMIT_AGENT_ID,
    organizationId: 'org-summit-us',
    name: 'Summit Home Services',
    industry: 'HVAC, Plumbing & Roofing',
    description: 'Premier residential & commercial HVAC, emergency plumbing, and roofing contractor serving Greater Austin and Central Texas.',
    website: 'https://summithomeservices.example.com',
    supportEmail: 'service@summithome.com',
    phone: '+1 (512) 890-4411',
    address: '4200 South Congress Ave, Austin, TX 78745',
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    locale: 'en-US',
    phoneCountryCode: '+1',
    dateFormat: 'MM/DD/YYYY',
    primaryChannel: 'SMS',
    businessHours: 'Mon - Sun: 7:00 AM - 8:00 PM (24/7 Emergency Dispatch)',
    primaryColor: '#0284c7', // Sky Blue
    secondaryColor: '#0f172a',
    plan: 'ENTERPRISE',
    status: 'active',
    agentSettings: {
      agentName: 'Sarah',
      welcomeMessage: 'Hello! Welcome to Summit Home Services. I can help you schedule emergency repairs, get an instant estimate, or answer questions about our HVAC and plumbing services. How can I help you today?',
      businessDescription: 'Austin top-rated 24/7 HVAC maintenance, tankless water heater installation, drain clearing, and roof leak repairs.',
      tone: 'Professional',
      primaryColor: '#0284c7',
      secondaryColor: '#0f172a',
      humanHandoffEnabled: true,
      leadCaptureEnabled: true,
      minQualificationScore: 65,
      suggestedQuestions: [
        'Need 24/7 emergency AC or plumbing repair',
        'Book annual HVAC maintenance checkup',
        'Request an estimate for new heat pump installation',
        'What are your service call fees & warranty?'
      ],
      customInstructions: 'Always prioritize emergency leaks or AC failure in hot Austin weather. Ask for property address, urgency timeline, and offer immediate technician dispatch slots.',
      qualificationRules: [
        { id: 'q1', question: 'What service do you require?', field: 'service_interest', required: true, scoreWeight: 25 },
        { id: 'q2', question: 'How urgent is this repair (immediate, this week, planning)?', field: 'timeline', required: true, scoreWeight: 30 },
        { id: 'q3', question: 'What is your estimated budget or insurance coverage?', field: 'budget', required: false, scoreWeight: 20 },
        { id: 'q4', question: 'What is your street address or zip code in Austin area?', field: 'location', required: true, scoreWeight: 25 }
      ]
    },
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: ACME_TENANT_ID,
    tenantId: ACME_TENANT_ID,
    tenantType: 'customer',
    isDemo: false,
    primaryAgentId: ACME_AGENT_ID,
    organizationId: 'org-acme-tech',
    name: 'Acme Technologies',
    industry: 'B2B Accounting & FinTech Software',
    description: 'We sell accounting software. Acme Technologies provides modern cloud accounting software, automated invoicing, payroll integrations, and tax compliance solutions for growing businesses.',
    website: 'https://acmetech.example.com',
    supportEmail: 'sales@acmetech.example.com',
    phone: '+1 (415) 555-0199',
    address: '500 Howard St, San Francisco, CA 94105',
    country: 'US',
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    phoneCountryCode: '+1',
    dateFormat: 'MM/DD/YYYY',
    primaryChannel: 'SMS',
    businessHours: 'Mon - Fri: 8:00 AM - 6:00 PM PST',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    plan: 'GROWTH',
    status: 'active',
    agentSettings: {
      agentName: 'Acme Sales Agent',
      welcomeMessage: 'Welcome to Acme Technologies. How can I help you with our cloud accounting software and financial management tools today?',
      businessDescription: 'Acme Technologies sells cloud accounting software, financial reporting, real-time invoicing, and automated bookkeeping tools for modern businesses.',
      tone: 'Professional',
      primaryColor: '#0284c7',
      secondaryColor: '#0f172a',
      humanHandoffEnabled: true,
      leadCaptureEnabled: true,
      minQualificationScore: 60,
      suggestedQuestions: [
        'What accounting software plans do you offer?',
        'Do you provide automated invoicing & payroll integration?',
        'How much does Acme Accounting Software cost?',
        'Can I request a product demo or free trial?'
      ],
      customInstructions: 'We sell accounting software. Emphasize multi-entity bookkeeping, real-time financial dashboards, and seamless payroll integrations.',
      qualificationRules: [
        { id: 'q1', question: 'How many employees or monthly invoices does your company manage?', field: 'budget', required: true, scoreWeight: 35 },
        { id: 'q2', question: 'What accounting system are you currently migrating from?', field: 'service_interest', required: true, scoreWeight: 35 },
        { id: 'q3', question: 'When are you planning to deploy your new accounting system?', field: 'timeline', required: true, scoreWeight: 30 }
      ]
    },
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: BETA_TENANT_ID,
    tenantId: BETA_TENANT_ID,
    tenantType: 'customer',
    isDemo: false,
    primaryAgentId: BETA_AGENT_ID,
    organizationId: 'org-beta-solutions',
    name: 'Beta Solutions',
    industry: 'Recruitment & Talent Acquisition',
    description: 'We provide recruitment services. Beta Solutions specializes in technical talent placement, executive headhunting, and enterprise staffing solutions across tech, finance, and engineering sectors.',
    website: 'https://betasolutions.example.com',
    supportEmail: 'contact@betasolutions.example.com',
    phone: '+1 (212) 555-0188',
    address: '350 5th Ave, New York, NY 10118',
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    locale: 'en-US',
    phoneCountryCode: '+1',
    dateFormat: 'MM/DD/YYYY',
    primaryChannel: 'SMS',
    businessHours: 'Mon - Fri: 9:00 AM - 6:00 PM EST',
    primaryColor: '#7c3aed',
    secondaryColor: '#0f172a',
    plan: 'STARTER',
    status: 'active',
    agentSettings: {
      agentName: 'Beta Sales Agent',
      welcomeMessage: 'Welcome to Beta Solutions. How can I assist you with our executive recruitment and technical staffing services today?',
      businessDescription: 'Beta Solutions provides executive search, technical recruitment, and workforce talent acquisition services.',
      tone: 'Consultative',
      primaryColor: '#7c3aed',
      secondaryColor: '#0f172a',
      humanHandoffEnabled: true,
      leadCaptureEnabled: true,
      minQualificationScore: 65,
      suggestedQuestions: [
        'What recruitment and staffing services do you provide?',
        'How do you source senior engineering and executive talent?',
        'What are your search retainers and placement fees?',
        'Can I speak with a recruitment consultant?'
      ],
      customInstructions: 'We provide recruitment services. Emphasize executive headhunting, engineering vetting pipelines, and high placement retention rates.',
      qualificationRules: [
        { id: 'q1', question: 'What roles or seniority levels are you hiring for?', field: 'service_interest', required: true, scoreWeight: 35 },
        { id: 'q2', question: 'How many positions are open this quarter?', field: 'budget', required: true, scoreWeight: 35 },
        { id: 'q3', question: 'What is your target hire start date?', field: 'timeline', required: true, scoreWeight: 30 }
      ]
    },
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: SHARMA_ID,
    tenantId: SHARMA_ID,
    tenantType: 'customer',
    isDemo: false,
    primaryAgentId: SHARMA_AGENT_ID,
    organizationId: 'org-sharma-in',
    name: 'Sharma Dental Care',
    industry: 'Multispecialty Dental Clinic',
    description: 'Advanced dental clinic specializing in painless root canals, Invisalign clear aligners, dental implants, teeth whitening, and pediatric dentistry in Bangalore.',
    website: 'https://sharmadental.example.com',
    supportEmail: 'care@sharmadental.in',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bangalore, Karnataka 560038',
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    phoneCountryCode: '+91',
    dateFormat: 'DD/MM/YYYY',
    primaryChannel: 'WhatsApp',
    businessHours: 'Mon - Sat: 9:00 AM - 8:30 PM | Sun: 10:00 AM - 2:00 PM',
    primaryColor: '#059669', // Emerald Green
    secondaryColor: '#0f172a',
    plan: 'GROWTH',
    status: 'active',
    agentSettings: {
      agentName: 'Aarav',
      welcomeMessage: 'Namaste! Welcome to Sharma Dental Care, Indiranagar. I can help you book a dentist appointment, check treatment costs, or arrange instant WhatsApp consultation. What can I do for you today?',
      businessDescription: 'Bangalore leading painless dentistry practice with 15+ years experience, German 3D CBCT imaging, and certified Invisalign providers.',
      tone: 'Friendly',
      primaryColor: '#059669',
      secondaryColor: '#0f172a',
      humanHandoffEnabled: true,
      leadCaptureEnabled: true,
      minQualificationScore: 60,
      suggestedQuestions: [
        'Book consultation for Dental Implants',
        'Cost of Invisalign clear aligners vs braces',
        'Emergency treatment for severe toothache',
        'Available slots for Dr. Sharma this Saturday'
      ],
      customInstructions: 'Politely verify pain level, dental history, and preferred clinic timing. Offer WhatsApp confirmation with Google Maps location pinned.',
      qualificationRules: [
        { id: 'q1', question: 'Which dental treatment are you interested in?', field: 'service_interest', required: true, scoreWeight: 30 },
        { id: 'q2', question: 'Are you currently experiencing acute pain or sensitivity?', field: 'timeline', required: true, scoreWeight: 25 },
        { id: 'q3', question: 'Are you looking for EMI/financing options?', field: 'budget', required: false, scoreWeight: 20 },
        { id: 'q4', question: 'Preferred clinic visit timing (Morning / Evening)?', field: 'location', required: true, scoreWeight: 25 }
      ]
    },
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-08-21T11:30:00Z'
  },
  {
    id: LONDON_ID,
    tenantId: LONDON_ID,
    tenantType: 'customer',
    isDemo: false,
    primaryAgentId: LONDON_AGENT_ID,
    organizationId: 'org-london-uk',
    name: 'London Growth Partners',
    industry: 'B2B Strategy & Corporate Advisory',
    description: 'Premier London-based consultancy accelerating mid-market tech, fintech, and cross-border expansion across the UK & Europe.',
    website: 'https://londongrowthpartners.co.uk',
    supportEmail: 'clientdesk@londongrowthpartners.co.uk',
    phone: '+44 20 7946 0912',
    address: '30 St Mary Axe, City of London, London EC3A 8EP',
    country: 'GB',
    currency: 'GBP',
    timezone: 'Europe/London',
    locale: 'en-GB',
    phoneCountryCode: '+44',
    dateFormat: 'DD/MM/YYYY',
    primaryChannel: 'SMS',
    businessHours: 'Mon - Fri: 8:30 AM - 6:00 PM GMT',
    primaryColor: '#6366f1', // Indigo
    secondaryColor: '#0f172a',
    plan: 'ENTERPRISE',
    status: 'active',
    agentSettings: {
      agentName: 'Victoria',
      welcomeMessage: 'Good day! Welcome to London Growth Partners. I can arrange an initial partner consultation, share our advisory case studies, or answer questions regarding our M&A and scaling frameworks.',
      businessDescription: 'London executive advisory firm serving venture-backed scaleups and corporate enterprise clients.',
      tone: 'Professional',
      primaryColor: '#6366f1',
      secondaryColor: '#0f172a',
      humanHandoffEnabled: true,
      leadCaptureEnabled: true,
      minQualificationScore: 70,
      suggestedQuestions: [
        'Book partner discovery call',
        'M&A and corporate advisory capabilities',
        'Expansion strategy packages and retainers',
        'Request our 2026 European Tech Benchmarks'
      ],
      customInstructions: 'Inquire regarding company ARR, funding stage, and key advisory objectives before booking senior partner review.',
      qualificationRules: [
        { id: 'q1', question: 'What is your current company revenue / funding stage?', field: 'budget', required: true, scoreWeight: 35 },
        { id: 'q2', question: 'What is the primary advisory focus (M&A, Growth, Capital)?', field: 'service_interest', required: true, scoreWeight: 35 },
        { id: 'q3', question: 'When do you aim to kick off this strategic mandate?', field: 'timeline', required: true, scoreWeight: 30 }
      ]
    },
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z'
  }
];

export const SEED_KNOWLEDGE_DOCS: KnowledgeItem[] = [
  ...PLATFORM_ADMIN_KNOWLEDGE_ITEMS,
  ...PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS,
  // Acme Technologies Knowledge (Accounting Software)
  {
    id: 'kb-acme-1',
    businessId: ACME_TENANT_ID,
    tenantId: ACME_TENANT_ID,
    title: 'Acme Cloud Accounting Software & Core Features',
    type: 'document',
    fileName: 'Acme_Accounting_Platform_Guide.pdf',
    fileSize: '1.8 MB',
    chunkCount: 14,
    status: 'active',
    content: `We sell accounting software. Acme Technologies is a specialized provider of modern cloud accounting software and financial management tools.
- Core Capabilities: Automated bookkeeping, real-time invoicing, expense tracking, multi-entity reconciliation, tax compliance, and payroll integration.
- Subscription Plans:
  * Starter: $199/month - up to 5 users, automated bank feeds, basic invoicing.
  * Growth: $399/month - unlimited users, multi-currency accounting, automated invoice chasing, payroll sync.
  * Enterprise: Custom pricing - dedicated account manager, custom ERP integrations, SLA guarantee.
- Integrations: Stripe, Razorpay, QuickBooks migration tool, NetSuite export.
- Note: Acme Technologies specializes purely in financial & accounting software. We do NOT provide recruitment, staffing, or human resource headhunting services.`,
    category: 'Product Overview & Pricing',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z'
  },
  {
    id: 'kb-acme-2',
    businessId: ACME_TENANT_ID,
    tenantId: ACME_TENANT_ID,
    title: 'Acme Invoicing, Tax Compliance & Onboarding FAQ',
    type: 'website',
    sourceUrl: 'https://acmetech.example.com/accounting-features',
    chunkCount: 8,
    status: 'active',
    content: `Acme Accounting Frequently Asked Questions:
Q: What does your company do?
A: We sell accounting software. Acme Technologies provides automated cloud accounting, tax preparation exports, and recurring billing software for businesses.
Q: How long does data migration take?
A: 1-click migration from legacy spreadsheets or older accounting systems takes under 15 minutes.
Q: Is there a free trial?
A: Yes, we offer a 14-day full feature trial with no credit card required.`,
    category: 'FAQ & Migration',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z'
  },

  // Beta Solutions Knowledge (Recruitment Services)
  {
    id: 'kb-beta-1',
    businessId: BETA_TENANT_ID,
    tenantId: BETA_TENANT_ID,
    title: 'Beta Solutions Recruitment & Talent Placement Services',
    type: 'document',
    fileName: 'Beta_Recruitment_Services_2026.pdf',
    fileSize: '2.1 MB',
    chunkCount: 16,
    status: 'active',
    content: `We provide recruitment services. Beta Solutions is a premier executive search, technical recruitment, and workforce talent acquisition firm.
- Service Offerings:
  * Executive Search: Retained search for VP and C-level executive talent across tech and finance.
  * Technical Staffing: Dedicated pipeline for senior software engineers, AI researchers, product managers, and data leaders.
  * Contract & Interim Placement: Rapid deployment of vetted technical contractors within 48-72 hours.
- Fee Structure:
  * Contingency Placement: 18-22% of first-year base salary, with a 90-day replacement guarantee.
  * Retained Search: 30% total retainer with dedicated headhunting team.
- Guarantee: 100% replacement guarantee if a candidate leaves within 90 days.
- Note: Beta Solutions is strictly a recruitment and staffing firm. We do NOT sell accounting or financial software.`,
    category: 'Services & Fees',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z'
  },
  {
    id: 'kb-beta-2',
    businessId: BETA_TENANT_ID,
    tenantId: BETA_TENANT_ID,
    title: 'Beta Solutions Candidate Vetting & FAQ',
    type: 'website',
    sourceUrl: 'https://betasolutions.example.com/recruitment-faq',
    chunkCount: 6,
    status: 'active',
    content: `Beta Solutions Recruitment FAQ:
Q: What does your company do?
A: We provide recruitment services. Beta Solutions connects high-growth companies with top-tier executive and technical talent.
Q: What sectors do you recruit for?
A: Artificial Intelligence, Software Engineering, FinTech, Healthcare, and Corporate Leadership.
Q: How fast is candidate delivery?
A: Initial qualified shortlist presented within 5 business days.`,
    category: 'FAQ & Candidate Sourcing',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z'
  },

  // Summit Home Services Knowledge
  {
    id: 'kb-summit-1',
    businessId: SUMMIT_ID,
    title: 'HVAC Services & Emergency Dispatch Rates',
    type: 'pdf',
    fileName: 'Summit_HVAC_Services_2026.pdf',
    fileSize: '2.4 MB',
    chunkCount: 18,
    status: 'active',
    content: `Summit Home Services provides complete residential HVAC solutions in Austin, Round Rock, Westlake, and Buda.
- Diagnostic & Dispatch Fee: $89 (waived when repair service approved).
- 24/7 Emergency AC Outage Service: $129 dispatch fee outside standard hours.
- Seasonal Tune-Up Package: $149 per system (includes 21-point coil inspection, refrigerant check, electrical tests, drain cleaning).
- New Heat Pump & AC Replacement: Systems range from $5,800 to $14,500 with 10-year warranty and 0% APR financing up to 36 months.
- Response Time: Under 90 minutes for priority emergency calls.`,
    category: 'Pricing & Services',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-08-15T12:00:00Z'
  },
  {
    id: 'kb-summit-2',
    businessId: SUMMIT_ID,
    title: 'Plumbing & Water Heater Installation Guide',
    type: 'docx',
    fileName: 'Plumbing_Standard_Procedures.docx',
    fileSize: '1.1 MB',
    chunkCount: 12,
    status: 'active',
    content: `Plumbing Services Overview:
- Tankless Water Heater Installs: Navien & Rinnai units starting at $2,850 turnkey.
- Hydro-Jet Drain Cleaning: $395 with video camera inspection included.
- Slab Leak Detection: Acoustic sensor & thermal scanning $350.
- Master Plumber license #MP-49102. Fully insured up to $2,000,000.`,
    category: 'Plumbing',
    createdAt: '2026-03-05T14:00:00Z',
    updatedAt: '2026-08-10T09:00:00Z'
  },
  {
    id: 'kb-summit-3',
    businessId: SUMMIT_ID,
    title: 'Website FAQ & Service Area Map',
    type: 'website',
    sourceUrl: 'https://summithomeservices.example.com/faqs',
    chunkCount: 8,
    status: 'active',
    content: `Frequently Asked Questions:
Q: Do you offer free estimates?
A: Yes! Free in-home estimates are provided for new system replacements, full roof replacements, and whole-home repiping.
Q: Are your technicians background checked?
A: 100% of our technicians undergo background screening, drug testing, and NATE certification.`,
    category: 'General FAQ',
    createdAt: '2026-03-10T11:00:00Z',
    updatedAt: '2026-08-18T16:00:00Z'
  },

  // Sharma Dental Care Knowledge
  {
    id: 'kb-sharma-1',
    businessId: SHARMA_ID,
    title: 'Sharma Dental Pricing & Treatment Catalog',
    type: 'pdf',
    fileName: 'SharmaDental_Treatment_Guide_2026.pdf',
    fileSize: '3.1 MB',
    chunkCount: 22,
    status: 'active',
    content: `Sharma Dental Care Treatment Pricing (Indiranagar, Bangalore):
- Initial Consultation & Digital OPG X-Ray: ₹500
- Rotary Single-Sitting Root Canal Treatment (RCT): ₹4,500 - ₹6,500
- Zirconia CAD/CAM Dental Crown: ₹7,000 - ₹12,000 (15 Year Warranty)
- Nobel Biocare / Straumann Titanium Dental Implant: ₹28,000 - ₹45,000
- Certified Invisalign Clear Aligners: ₹85,000 - ₹2,20,000 (0% No-Cost EMI Available)
- Zoom LED In-Office Laser Teeth Whitening: ₹9,500
- Ultrasonic Scaling & Polishing: ₹1,500`,
    category: 'Pricing & Packages',
    createdAt: '2026-03-12T10:00:00Z',
    updatedAt: '2026-08-16T15:00:00Z'
  },

  // London Growth Partners Knowledge
  {
    id: 'kb-london-1',
    businessId: LONDON_ID,
    title: 'Executive Advisory & Growth Frameworks 2026',
    type: 'pdf',
    fileName: 'LGP_Corporate_Advisory_2026.pdf',
    fileSize: '4.2 MB',
    chunkCount: 25,
    status: 'active',
    content: `London Growth Partners Advisory Offerings (City of London):
- Series B/C Scaling & Go-To-Market Architecture: £15,000 / month retainer.
- Cross-Border M&A Readiness & Deal Room Structuring: £25,000 milestone fee.
- Revenue Operations & AI Autonomous Transformation: £18,500 initial implementation.
- Senior Partner Strategy Sessions: £3,500 / day on-site.`,
    category: 'Advisory Retainers',
    createdAt: '2026-03-15T09:00:00Z',
    updatedAt: '2026-08-19T11:00:00Z'
  }
];

export const SEED_LEADS: Lead[] = [
  {
    id: 'lead-s-1',
    businessId: SUMMIT_ID,
    name: 'Marcus Vance',
    company: 'Vance Properties LLC',
    email: 'marcus@vanceprops.com',
    phone: '+1 (512) 745-9921',
    source: 'website_chat',
    status: 'qualified',
    score: 94,
    scoreCategory: 'HOT',
    aiScoreExplanation: 'Inquiring about whole-building heat pump retrofit for 2 duplex rentals in South Austin. Immediate decision maker with verified budget.',
    budget: '$15,000 - $22,000',
    timeline: 'Within 2 Weeks',
    serviceInterest: 'Heat Pump & HVAC Retrofit',
    location: 'Austin, TX 78704',
    owner: 'David Miller',
    lastContact: '2026-08-22T14:30:00Z',
    nextFollowUp: '2026-08-23T16:00:00Z',
    value: 18500,
    createdAt: '2026-08-21T09:15:00Z',
    updatedAt: '2026-08-22T14:30:00Z'
  },
  {
    id: 'lead-s-2',
    businessId: SUMMIT_ID,
    name: 'Elena Rostova',
    company: 'Homeowner',
    email: 'elena.rostova@gmail.com',
    phone: '+1 (512) 334-1189',
    source: 'missed_call_textback',
    status: 'appointment',
    score: 88,
    scoreCategory: 'HOT',
    aiScoreExplanation: 'Auto-recovered via missed call text-back. Water heater leaking in garage, scheduled immediate diagnostic dispatch for Tuesday 10:00 AM.',
    budget: '$2,500 - $3,500',
    timeline: 'Immediate Emergency',
    serviceInterest: 'Tankless Water Heater Installation',
    location: 'Austin, TX 78735',
    owner: 'Sarah Jenkins',
    lastContact: '2026-08-22T16:45:00Z',
    nextFollowUp: '2026-08-24T10:00:00Z',
    value: 3200,
    createdAt: '2026-08-20T17:15:00Z',
    updatedAt: '2026-08-22T16:45:00Z'
  },
  {
    id: 'lead-s-3',
    businessId: SUMMIT_ID,
    name: 'Brandon Cooper',
    company: 'Cooper Tech Studios',
    email: 'brandon@cooperstudios.io',
    phone: '+1 (512) 650-8842',
    source: 'voice_call',
    status: 'proposal',
    score: 82,
    scoreCategory: 'WARM',
    aiScoreExplanation: 'Spoke with AI Voice Receptionist for 3.5 minutes. Commercial studio rooftop AC unit failure. Sent itemized quote $8,400.',
    budget: '$8,000 - $10,000',
    timeline: 'This Week',
    serviceInterest: 'Commercial Rooftop AC Repair',
    location: 'Austin, TX 78702',
    owner: 'David Miller',
    lastContact: '2026-08-21T11:00:00Z',
    nextFollowUp: '2026-08-23T14:00:00Z',
    value: 8400,
    createdAt: '2026-08-19T13:40:00Z',
    updatedAt: '2026-08-21T11:00:00Z'
  },
  {
    id: 'lead-in-1',
    businessId: SHARMA_ID,
    name: 'Pooja Hegde',
    company: 'TechCorp India',
    email: 'pooja.hegde@techcorp.in',
    phone: '+91 98450 12345',
    source: 'website_chat',
    status: 'qualified',
    score: 92,
    scoreCategory: 'HOT',
    aiScoreExplanation: 'Inquiring about Invisalign aligners for wedding in December. Budget ₹1.5L, prefers Saturday consultations.',
    budget: '₹1,50,000',
    timeline: 'Immediate (This Month)',
    serviceInterest: 'Invisalign Clear Aligners',
    location: 'Koramangala, Bangalore',
    owner: 'Dr. Priya Nair',
    lastContact: '2026-08-22T15:30:00Z',
    nextFollowUp: '2026-08-23T11:00:00Z',
    value: 160000,
    createdAt: '2026-08-21T18:20:00Z',
    updatedAt: '2026-08-22T15:30:00Z'
  },
  {
    id: 'lead-in-2',
    businessId: SHARMA_ID,
    name: 'Anand Krishnamurthy',
    company: 'Architect',
    email: 'anand.k@studioarc.com',
    phone: '+91 99001 88765',
    source: 'missed_call_textback',
    status: 'appointment',
    score: 95,
    scoreCategory: 'HOT',
    aiScoreExplanation: 'Called Sunday night with severe molar toothache. Missed call WhatsApp bot replied instantly, booked emergency RCT for Monday 11:30 AM.',
    budget: '₹12,000',
    timeline: 'Emergency (Today)',
    serviceInterest: 'Rotary Root Canal & Zirconia Crown',
    location: 'Indiranagar, Bangalore',
    owner: 'Dr. Rajesh Sharma',
    lastContact: '2026-08-22T20:00:00Z',
    nextFollowUp: '2026-08-23T11:30:00Z',
    value: 14500,
    createdAt: '2026-08-22T19:40:00Z',
    updatedAt: '2026-08-22T20:00:00Z'
  },
  {
    id: 'lead-in-3',
    businessId: SHARMA_ID,
    name: 'Siddharth Menon',
    company: 'Fintech Founder',
    email: 'siddharth@payzen.in',
    phone: '+91 97400 33211',
    source: 'voice_call',
    status: 'proposal',
    score: 86,
    scoreCategory: 'WARM',
    aiScoreExplanation: 'AI Voice Receptionist answered implant inquiry for his mother. Sent detailed 2-implant treatment proposal (₹75,000) with EMI breakdown.',
    budget: '₹70,000 - ₹90,000',
    timeline: 'Next 10 Days',
    serviceInterest: 'Full Dental Implants (2 Teeth)',
    location: 'Whitefield, Bangalore',
    owner: 'Dr. Rajesh Sharma',
    lastContact: '2026-08-21T16:00:00Z',
    nextFollowUp: '2026-08-23T17:00:00Z',
    value: 75000,
    createdAt: '2026-08-19T14:15:00Z',
    updatedAt: '2026-08-21T16:00:00Z'
  },
  {
    id: 'lead-uk-1',
    businessId: LONDON_ID,
    name: 'Alistair Montgomery',
    company: 'FinScale Solutions Ltd',
    email: 'a.montgomery@finscale.co.uk',
    phone: '+44 20 7946 0881',
    source: 'website_chat',
    status: 'qualified',
    score: 91,
    scoreCategory: 'HOT',
    aiScoreExplanation: 'Series B fintech seeking cross-border European expansion strategy and revenue ops audit. ARR £8.5M.',
    budget: '£25,000 - £35,000',
    timeline: 'Next 30 Days',
    serviceInterest: 'European Expansion Advisory & RevOps',
    location: 'Canary Wharf, London',
    owner: 'Victoria Sterling',
    lastContact: '2026-08-22T11:00:00Z',
    nextFollowUp: '2026-08-24T14:00:00Z',
    value: 25000,
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T11:00:00Z'
  },
  {
    id: 'lead-uk-2',
    businessId: LONDON_ID,
    name: 'Charlotte Davies',
    company: 'Meridian Capital Partners',
    email: 'c.davies@meridiancap.co.uk',
    phone: '+44 20 7946 0994',
    source: 'voice_call',
    status: 'proposal',
    score: 87,
    scoreCategory: 'HOT',
    aiScoreExplanation: 'AI Voice Receptionist answered inbound partner inquiry regarding M&A commercial due diligence mandate.',
    budget: '£40,000 - £50,000',
    timeline: 'Q3 2026',
    serviceInterest: 'M&A Commercial Due Diligence',
    location: 'Mayfair, London',
    owner: 'Victoria Sterling',
    lastContact: '2026-08-21T16:30:00Z',
    nextFollowUp: '2026-08-23T15:00:00Z',
    value: 45000,
    createdAt: '2026-08-20T14:00:00Z',
    updatedAt: '2026-08-21T16:30:00Z'
  }
];

export const SEED_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    businessId: SUMMIT_ID,
    name: 'Marcus Vance',
    company: 'Vance Properties LLC',
    email: 'marcus@vanceprops.com',
    phone: '+1 (512) 745-9921',
    address: '1402 S Congress Ave, Austin, TX',
    country: 'US',
    tags: ['VIP', 'Commercial Landlord', 'High-Value'],
    totalRevenue: 24500,
    optOut: false,
    preferredChannel: 'SMS',
    lastInteraction: '2026-08-22T14:30:00Z',
    status: 'customer',
    timeline: [
      { id: 't1', timestamp: '2026-08-21T09:15:00Z', type: 'chat', title: 'Website Chat Interaction', description: 'Chatted with Sarah regarding 2 heat pump replacements.' },
      { id: 't2', timestamp: '2026-08-21T09:18:00Z', type: 'lead_created', title: 'Lead Auto-Created', description: 'Lead score calculated: 94/100 (HOT).' },
      { id: 't3', timestamp: '2026-08-22T10:00:00Z', type: 'estimate_sent', title: 'Estimate #EST-1052 Sent', description: 'Sent formal quote for $18,500 via Email & SMS.' },
      { id: 't4', timestamp: '2026-08-22T14:30:00Z', type: 'appointment_booked', title: 'On-site Inspection Scheduled', description: 'Booked technician site inspection for Aug 24, 2:00 PM.' }
    ],
    createdAt: '2026-08-21T09:15:00Z',
    updatedAt: '2026-08-22T14:30:00Z'
  },
  {
    id: 'c-2',
    businessId: SUMMIT_ID,
    name: 'Elena Rostova',
    company: 'Residential',
    email: 'elena.rostova@gmail.com',
    phone: '+1 (512) 334-1189',
    address: '3811 Barton Creek Blvd, Austin, TX',
    country: 'US',
    tags: ['Emergency Recovery', 'Residential'],
    totalRevenue: 3200,
    optOut: false,
    preferredChannel: 'SMS',
    lastInteraction: '2026-08-22T16:45:00Z',
    status: 'customer',
    timeline: [
      { id: 't5', timestamp: '2026-08-20T17:15:00Z', type: 'missed_call', title: 'Missed Inbound Call', description: 'Caller reached voicemail after hours.' },
      { id: 't6', timestamp: '2026-08-20T17:16:00Z', type: 'follow_up_sent', title: 'Instant Text-Back Sent', description: 'Auto-SMS: "Hi Elena, sorry we missed your call. How can Summit help you today?"' },
      { id: 't7', timestamp: '2026-08-20T17:22:00Z', type: 'appointment_booked', title: 'Appointment Confirmed', description: 'Booked water heater replacement for Tuesday.' }
    ],
    createdAt: '2026-08-20T17:15:00Z',
    updatedAt: '2026-08-22T16:45:00Z'
  },
  {
    id: 'c-in-1',
    businessId: SHARMA_ID,
    name: 'Pooja Hegde',
    company: 'TechCorp India',
    email: 'pooja.hegde@techcorp.in',
    phone: '+91 98450 12345',
    address: '5th Block, Koramangala, Bangalore',
    country: 'IN',
    tags: ['Invisalign', 'Cosmetic Dentistry', 'WhatsApp Preferred'],
    totalRevenue: 160000,
    optOut: false,
    preferredChannel: 'WhatsApp',
    lastInteraction: '2026-08-22T15:30:00Z',
    status: 'lead',
    timeline: [
      { id: 'ti1', timestamp: '2026-08-21T18:20:00Z', type: 'chat', title: 'Website WhatsApp Chat', description: 'Inquired about Invisalign costs and 3D scan.' },
      { id: 'ti2', timestamp: '2026-08-22T10:00:00Z', type: 'follow_up_sent', title: 'WhatsApp Brochure Sent', description: 'AI sent Invisalign transformation video & 0% EMI details.' },
      { id: 'ti3', timestamp: '2026-08-22T15:30:00Z', type: 'appointment_booked', title: 'Consultation Scheduled', description: 'Booked Saturday 11:00 AM 3D iTero scan with Dr. Priya.' }
    ],
    createdAt: '2026-08-21T18:20:00Z',
    updatedAt: '2026-08-22T15:30:00Z'
  },
  {
    id: 'c-uk-1',
    businessId: LONDON_ID,
    name: 'Alistair Montgomery',
    company: 'FinScale Solutions Ltd',
    email: 'a.montgomery@finscale.co.uk',
    phone: '+44 20 7946 0881',
    address: '25 Bank Street, Canary Wharf, London E14 5JP',
    country: 'GB',
    tags: ['Fintech', 'Scaleup', 'Advisory'],
    totalRevenue: 25000,
    optOut: false,
    preferredChannel: 'SMS',
    lastInteraction: '2026-08-22T11:00:00Z',
    status: 'lead',
    timeline: [
      { id: 'tu1', timestamp: '2026-08-21T10:00:00Z', type: 'chat', title: 'Discovery Chat with Victoria', description: 'Inquired on Series B GTM scaling advisory.' },
      { id: 'tu2', timestamp: '2026-08-22T11:00:00Z', type: 'estimate_sent', title: 'Proposal Sent #EST-UK-101', description: 'Formal mandate proposal sent for £25,000.' }
    ],
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T11:00:00Z'
  }
];

export const SEED_DEALS: Deal[] = [
  {
    id: 'deal-1',
    businessId: SUMMIT_ID,
    title: 'Vance Properties - 2x Heat Pump Retrofit',
    contactName: 'Marcus Vance',
    companyName: 'Vance Properties LLC',
    value: 18500,
    stage: 'proposal_sent',
    probability: 80,
    expectedCloseDate: '2026-08-30',
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T14:30:00Z'
  },
  {
    id: 'deal-2',
    businessId: SUMMIT_ID,
    title: 'Cooper Studios - Commercial Rooftop AC',
    contactName: 'Brandon Cooper',
    companyName: 'Cooper Tech Studios',
    value: 8400,
    stage: 'appointment_scheduled',
    probability: 60,
    expectedCloseDate: '2026-09-05',
    createdAt: '2026-08-19T13:40:00Z',
    updatedAt: '2026-08-21T11:00:00Z'
  },
  {
    id: 'deal-3',
    businessId: SUMMIT_ID,
    title: 'Hastings Retail - Annual Maintenance Contract',
    contactName: 'Robert Hastings',
    companyName: 'Hastings Retail Group',
    value: 12000,
    stage: 'won',
    probability: 100,
    expectedCloseDate: '2026-08-20',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-20T15:00:00Z'
  },
  {
    id: 'deal-in-1',
    businessId: SHARMA_ID,
    title: 'Pooja Hegde - Comprehensive Invisalign Plan',
    contactName: 'Pooja Hegde',
    companyName: 'TechCorp India',
    value: 160000,
    stage: 'appointment_scheduled',
    probability: 85,
    expectedCloseDate: '2026-08-28',
    createdAt: '2026-08-21T18:20:00Z',
    updatedAt: '2026-08-22T15:30:00Z'
  },
  {
    id: 'deal-in-2',
    businessId: SHARMA_ID,
    title: 'Siddharth Menon - Dual Titanium Implants',
    contactName: 'Siddharth Menon',
    companyName: 'Payzen India',
    value: 75000,
    stage: 'proposal_sent',
    probability: 70,
    expectedCloseDate: '2026-09-02',
    createdAt: '2026-08-19T14:15:00Z',
    updatedAt: '2026-08-21T16:00:00Z'
  },
  {
    id: 'deal-uk-1',
    businessId: LONDON_ID,
    title: 'FinScale Solutions - Series B Scaling Retainer',
    contactName: 'Alistair Montgomery',
    companyName: 'FinScale Solutions Ltd',
    value: 25000,
    stage: 'proposal_sent',
    probability: 75,
    expectedCloseDate: '2026-09-01',
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T11:00:00Z'
  },
  {
    id: 'deal-uk-2',
    businessId: LONDON_ID,
    title: 'Meridian Capital - M&A Due Diligence Retainer',
    contactName: 'Charlotte Davies',
    companyName: 'Meridian Capital Partners',
    value: 45000,
    stage: 'contacted',
    probability: 60,
    expectedCloseDate: '2026-09-15',
    createdAt: '2026-08-20T14:00:00Z',
    updatedAt: '2026-08-21T16:30:00Z'
  }
];

export const SEED_CALLS: CallRecord[] = [
  {
    id: 'call-s-1',
    businessId: SUMMIT_ID,
    callerName: 'Brandon Cooper',
    callerPhone: '+1 (512) 650-8842',
    direction: 'inbound',
    status: 'completed',
    durationSeconds: 195,
    intent: 'Commercial HVAC Quote',
    leadScore: 82,
    transcript: [
      { speaker: 'ai_receptionist', text: 'Thank you for calling Summit Home Services. My name is Sarah, how can I assist you today?', time: '00:02' },
      { speaker: 'caller', text: 'Hi Sarah, our creative studio AC unit is blowing lukewarm air and making grinding noises. Can we get an emergency technician out?', time: '00:15' },
      { speaker: 'ai_receptionist', text: 'I understand how critical cooling is for your studio. I can dispatch a commercial technician. Are you located within the Austin metro area?', time: '00:26' },
      { speaker: 'caller', text: 'Yes, East 6th Street in Austin.', time: '00:32' },
      { speaker: 'ai_receptionist', text: 'Perfect. I have dispatched an emergency service alert to our lead technician David Miller. You will receive an SMS confirmation with ETA shortly.', time: '00:45' }
    ],
    summary: 'Commercial studio owner reported AC grinding noise and lukewarm air on East 6th. Qualified lead ($8,400 est), dispatched to senior technician.',
    disposition: 'Qualified Lead',
    audioWaveform: [20, 45, 75, 90, 60, 40, 80, 95, 85, 50, 30, 65, 80, 45, 20],
    createdAt: '2026-08-22T13:40:00Z'
  },
  {
    id: 'call-s-2',
    businessId: SUMMIT_ID,
    callerName: 'Elena Rostova',
    callerPhone: '+1 (512) 334-1189',
    direction: 'inbound',
    status: 'missed',
    durationSeconds: 0,
    intent: 'Emergency Plumbing / Water Leak',
    leadScore: 88,
    transcript: [],
    summary: 'Missed after-hours call. Instant text-back triggered and successfully recovered into booked water heater replacement.',
    disposition: 'Missed Call',
    isMissedCallRecovered: true,
    createdAt: '2026-08-20T17:15:00Z'
  },
  {
    id: 'call-in-1',
    businessId: SHARMA_ID,
    callerName: 'Siddharth Menon',
    callerPhone: '+91 97400 33211',
    direction: 'inbound',
    status: 'completed',
    durationSeconds: 220,
    intent: 'Dental Implants Inquiry',
    leadScore: 86,
    transcript: [
      { speaker: 'ai_receptionist', text: 'Namaste! Welcome to Sharma Dental Care, Indiranagar. I am Aarav. How may I help you?', time: '00:03' },
      { speaker: 'caller', text: 'Hello, I wanted to know the price for dental implants for senior citizens and whether Dr. Sharma does the surgery personally.', time: '00:18' },
      { speaker: 'ai_receptionist', text: 'Yes, Dr. Rajesh Sharma has over 18 years experience in implantology and personally conducts all implant procedures with 3D CBCT guided surgery. Titanium implants start at ₹28,000 with 0% EMI options.', time: '00:35' },
      { speaker: 'caller', text: 'That sounds reassuring. Can you send the estimate and Dr. Sharma profile to my WhatsApp?', time: '00:48' },
      { speaker: 'ai_receptionist', text: 'Certainly! I have sent the digital brochure and slot options to your WhatsApp right away.', time: '01:00' }
    ],
    summary: 'Caller inquired regarding dental implants for mother. Verified Dr. Sharma credentials, sent WhatsApp treatment estimate and follow-up sequence.',
    disposition: 'Qualified Lead',
    audioWaveform: [15, 35, 60, 85, 70, 55, 90, 80, 65, 40, 25, 50, 75, 40, 15],
    createdAt: '2026-08-21T14:15:00Z'
  },
  {
    id: 'call-uk-1',
    businessId: LONDON_ID,
    callerName: 'Charlotte Davies',
    callerPhone: '+44 20 7946 0994',
    direction: 'inbound',
    status: 'completed',
    durationSeconds: 210,
    intent: 'M&A Advisory Mandate',
    leadScore: 87,
    transcript: [
      { speaker: 'ai_receptionist', text: 'Good afternoon, London Growth Partners. Victoria speaking, how may I direct your call?', time: '00:02' },
      { speaker: 'caller', text: 'Good afternoon Victoria, I am looking to schedule a partner consultation for an upcoming European fintech acquisition.', time: '00:14' },
      { speaker: 'ai_receptionist', text: 'Certainly. Our senior partner leads all cross-border fintech transactions. May I confirm your target timeline and firm details?', time: '00:28' }
    ],
    summary: 'M&A partner inquiry from Meridian Capital. Qualified mandate £45k value, booked senior partner review.',
    disposition: 'Qualified Lead',
    audioWaveform: [10, 30, 60, 80, 70, 50, 85, 90, 65, 45, 30, 55, 70, 40, 10],
    createdAt: '2026-08-20T14:00:00Z'
  }
];

export const SEED_MISSED_CALLS: MissedCallRecovery[] = [
  {
    id: 'mc-s-1',
    businessId: SUMMIT_ID,
    callerPhone: '+1 (512) 334-1189',
    callerName: 'Elena Rostova',
    callTimestamp: '2026-08-20T17:15:00Z',
    textBackStatus: 'recovered',
    channel: 'SMS',
    initialMessage: 'Hi Elena, sorry we missed your call at Summit Home Services! How can we assist you with your home repairs today?',
    conversationMessages: [
      { sender: 'system', text: 'Hi Elena, sorry we missed your call at Summit Home Services! How can we assist you with your home repairs today?', timestamp: '2026-08-20T17:16:00Z' },
      { sender: 'customer', text: 'Hi, our garage water heater is leaking all over the floor. Can someone come out tomorrow morning?', timestamp: '2026-08-20T17:18:00Z' },
      { sender: 'ai', text: 'We can certainly take care of that! I have a priority plumbing slot available tomorrow at 10:00 AM with our master plumber. Would you like me to lock that in for you?', timestamp: '2026-08-20T17:19:00Z' },
      { sender: 'customer', text: 'Yes please! Address is 3811 Barton Creek Blvd.', timestamp: '2026-08-20T17:21:00Z' },
      { sender: 'ai', text: 'Booked! Technician Marcus is scheduled for tomorrow at 10:00 AM. We will send a tracking link when he is en route.', timestamp: '2026-08-20T17:22:00Z' }
    ],
    recoveredLeadId: 'lead-s-2',
    recoveryRateAttributed: true,
    createdAt: '2026-08-20T17:15:00Z'
  },
  {
    id: 'mc-in-1',
    businessId: SHARMA_ID,
    callerPhone: '+91 99001 88765',
    callerName: 'Anand Krishnamurthy',
    callTimestamp: '2026-08-22T19:40:00Z',
    textBackStatus: 'recovered',
    channel: 'WhatsApp',
    initialMessage: 'Namaste Anand, we noticed we missed your call at Sharma Dental Care, Indiranagar. How can our team assist you?',
    conversationMessages: [
      { sender: 'system', text: 'Namaste Anand, we noticed we missed your call at Sharma Dental Care, Indiranagar. How can our team assist you?', timestamp: '2026-08-22T19:41:00Z' },
      { sender: 'customer', text: 'I have intense throbbing pain in my upper left molar since evening. Need urgent appointment tomorrow.', timestamp: '2026-08-22T19:43:00Z' },
      { sender: 'ai', text: 'We understand acute tooth pain can be agonizing. Dr. Rajesh Sharma has an emergency morning slot at 11:30 AM tomorrow. Shall I confirm this for you?', timestamp: '2026-08-22T19:44:00Z' },
      { sender: 'customer', text: 'Yes, please book 11:30 AM.', timestamp: '2026-08-22T19:46:00Z' },
      { sender: 'ai', text: 'Confirmed! Your appointment with Dr. Sharma is booked for tomorrow, 11:30 AM at our Indiranagar clinic. Clinic location: https://maps.example.com/sharmadental', timestamp: '2026-08-22T19:47:00Z' }
    ],
    recoveredLeadId: 'lead-in-2',
    recoveryRateAttributed: true,
    createdAt: '2026-08-22T19:40:00Z'
  }
];

export const SEED_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-s-1',
    businessId: SUMMIT_ID,
    contactName: 'Marcus Vance',
    contactEmail: 'marcus@vanceprops.com',
    contactPhone: '+1 (512) 745-9921',
    serviceName: 'Dual Heat Pump On-Site Assessment',
    startTime: '2026-08-24T14:00:00Z',
    endTime: '2026-08-24T15:30:00Z',
    status: 'scheduled',
    location: '1402 S Congress Ave, Austin, TX',
    notes: '2 rental duplex units, tenant will provide access.',
    remindersSent: { immediate: true, twentyFourHours: false, twoHours: false },
    calendarType: 'google',
    createdAt: '2026-08-22T14:30:00Z'
  },
  {
    id: 'apt-s-2',
    businessId: SUMMIT_ID,
    contactName: 'Elena Rostova',
    contactEmail: 'elena.rostova@gmail.com',
    contactPhone: '+1 (512) 334-1189',
    serviceName: 'Tankless Water Heater Diagnostic & Install',
    startTime: '2026-08-24T10:00:00Z',
    endTime: '2026-08-24T11:30:00Z',
    status: 'confirmed',
    location: '3811 Barton Creek Blvd, Austin, TX',
    notes: 'Recovered via missed call text-back. Master plumber assigned.',
    remindersSent: { immediate: true, twentyFourHours: true, twoHours: false },
    calendarType: 'google',
    createdAt: '2026-08-20T17:22:00Z'
  },
  {
    id: 'apt-in-1',
    businessId: SHARMA_ID,
    contactName: 'Pooja Hegde',
    contactEmail: 'pooja.hegde@techcorp.in',
    contactPhone: '+91 98450 12345',
    serviceName: 'Invisalign 3D iTero Scan & Smile Design',
    startTime: '2026-08-25T11:00:00Z',
    endTime: '2026-08-25T12:00:00Z',
    status: 'scheduled',
    location: 'Sharma Dental Clinic, 100 Feet Rd, Indiranagar',
    notes: 'Bride-to-be, interested in 6-month accelerated aligner plan.',
    remindersSent: { immediate: true, twentyFourHours: false, twoHours: false },
    calendarType: 'google',
    createdAt: '2026-08-22T15:30:00Z'
  },
  {
    id: 'apt-uk-1',
    businessId: LONDON_ID,
    contactName: 'Alistair Montgomery',
    contactEmail: 'a.montgomery@finscale.co.uk',
    contactPhone: '+44 20 7946 0881',
    serviceName: 'Partner Strategy Discovery Session',
    startTime: '2026-08-25T14:00:00Z',
    endTime: '2026-08-25T15:00:00Z',
    status: 'confirmed',
    location: '30 St Mary Axe, City of London',
    notes: 'Series B scaling & revenue architecture review.',
    remindersSent: { immediate: true, twentyFourHours: true, twoHours: false },
    calendarType: 'google',
    createdAt: '2026-08-22T11:00:00Z'
  }
];

export const SEED_ESTIMATES: Estimate[] = [
  {
    id: 'est-s-1',
    businessId: SUMMIT_ID,
    estimateNumber: 'EST-1052',
    contactName: 'Marcus Vance',
    contactEmail: 'marcus@vanceprops.com',
    contactPhone: '+1 (512) 745-9921',
    amount: 18500,
    currency: 'USD',
    items: [
      { id: 'i1', description: 'Carrier 18-SEER Inverter Heat Pump (Unit 1)', quantity: 1, rate: 8900, total: 8900 },
      { id: 'i2', description: 'Carrier 18-SEER Inverter Heat Pump (Unit 2)', quantity: 1, rate: 8900, total: 8900 },
      { id: 'i3', description: 'Permit & Austin Energy Rebate Filing', quantity: 1, rate: 700, total: 700 }
    ],
    dateSent: '2026-08-22T10:00:00Z',
    validUntil: '2026-09-22T00:00:00Z',
    status: 'viewed',
    nextFollowUpDate: '2026-08-24T10:00:00Z',
    salesOwner: 'David Miller',
    followUpStep: 1,
    aiFollowUpDraft: 'Hi Marcus, just checking if you had any questions on Estimate #EST-1052 for the dual heat pump installation before our Monday walk-through?',
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-08-22T14:30:00Z'
  },
  {
    id: 'est-s-2',
    businessId: SUMMIT_ID,
    estimateNumber: 'EST-1049',
    contactName: 'Brandon Cooper',
    contactEmail: 'brandon@cooperstudios.io',
    contactPhone: '+1 (512) 650-8842',
    amount: 8400,
    currency: 'USD',
    items: [
      { id: 'i4', description: 'Commercial Rooftop Compressor Overhaul & Fan Motor', quantity: 1, rate: 6500, total: 6500 },
      { id: 'i5', description: 'R-410A Refrigerant Recharge & Leak Seal', quantity: 1, rate: 1900, total: 1900 }
    ],
    dateSent: '2026-08-21T11:00:00Z',
    validUntil: '2026-09-15T00:00:00Z',
    status: 'follow_up_due',
    nextFollowUpDate: '2026-08-23T14:00:00Z',
    salesOwner: 'David Miller',
    followUpStep: 2,
    aiFollowUpDraft: 'Hi Brandon, following up on the rooftop AC quote for Cooper Studios. We have a crew nearby tomorrow if you would like us to begin work.',
    createdAt: '2026-08-21T11:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z'
  },
  {
    id: 'est-in-1',
    businessId: SHARMA_ID,
    estimateNumber: 'EST-IN-402',
    contactName: 'Siddharth Menon',
    contactEmail: 'siddharth@payzen.in',
    contactPhone: '+91 97400 33211',
    amount: 75000,
    currency: 'INR',
    items: [
      { id: 'ii1', description: 'Straumann SLA Titanium Implant (2 Units)', quantity: 2, rate: 32000, total: 64000 },
      { id: 'ii2', description: 'Custom Zirconia Abutment & Crown', quantity: 2, rate: 5500, total: 11000 }
    ],
    dateSent: '2026-08-21T16:00:00Z',
    validUntil: '2026-09-20T00:00:00Z',
    status: 'viewed',
    nextFollowUpDate: '2026-08-23T16:00:00Z',
    salesOwner: 'Dr. Rajesh Sharma',
    followUpStep: 1,
    aiFollowUpDraft: 'Namaste Siddharth, following up on the dental implant plan for your mother. We can schedule a pre-op 3D consultation at your convenience.',
    createdAt: '2026-08-21T16:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z'
  },
  {
    id: 'est-uk-1',
    businessId: LONDON_ID,
    estimateNumber: 'EST-UK-101',
    contactName: 'Alistair Montgomery',
    contactEmail: 'a.montgomery@finscale.co.uk',
    contactPhone: '+44 20 7946 0881',
    amount: 25000,
    currency: 'GBP',
    items: [
      { id: 'iu1', description: 'European GTM Revenue Architecture & Audit', quantity: 1, rate: 15000, total: 15000 },
      { id: 'iu2', description: 'Series B Financial Modeling & Board Reporting', quantity: 1, rate: 10000, total: 10000 }
    ],
    dateSent: '2026-08-22T11:00:00Z',
    validUntil: '2026-09-22T00:00:00Z',
    status: 'viewed',
    nextFollowUpDate: '2026-08-24T14:00:00Z',
    salesOwner: 'Victoria Sterling',
    followUpStep: 1,
    aiFollowUpDraft: 'Hi Alistair, following up on the mandate proposal EST-UK-101 for FinScale Solutions. Let me know if you would like to discuss before our Tuesday session.',
    createdAt: '2026-08-22T11:00:00Z',
    updatedAt: '2026-08-22T11:00:00Z'
  }
];

export const SEED_FOLLOW_UPS: FollowUpTask[] = [
  {
    id: 'fu-1',
    businessId: SUMMIT_ID,
    contactName: 'Marcus Vance',
    contactPhone: '+1 (512) 745-9921',
    contactEmail: 'marcus@vanceprops.com',
    triggerReason: 'estimate_sent',
    channel: 'SMS',
    sequenceDay: 'Day 1',
    scheduledTime: '2026-08-23T16:00:00Z',
    messageText: 'Hi Marcus, Sarah from Summit here. Did you receive Estimate #EST-1052 for the heat pump replacement? Let us know if you need any adjustments.',
    status: 'pending',
    createdAt: '2026-08-22T10:00:00Z'
  },
  {
    id: 'fu-2',
    businessId: SUMMIT_ID,
    contactName: 'Brandon Cooper',
    contactPhone: '+1 (512) 650-8842',
    contactEmail: 'brandon@cooperstudios.io',
    triggerReason: 'no_response',
    channel: 'Email',
    sequenceDay: 'Day 3',
    scheduledTime: '2026-08-24T14:00:00Z',
    messageText: 'Brandon - Just a quick check-in on the commercial AC repair estimate for Cooper Studios. We have our technician team scheduled in East Austin this Thursday.',
    status: 'pending',
    createdAt: '2026-08-21T11:00:00Z'
  },
  {
    id: 'fu-in-1',
    businessId: SHARMA_ID,
    contactName: 'Pooja Hegde',
    contactPhone: '+91 98450 12345',
    contactEmail: 'pooja.hegde@techcorp.in',
    triggerReason: 'new_lead',
    channel: 'WhatsApp',
    sequenceDay: 'Day 0',
    scheduledTime: '2026-08-22T10:00:00Z',
    messageText: 'Namaste Pooja! Here is our digital brochure on Invisalign clear aligners and sample before/after cases treated by Dr. Priya Nair.',
    status: 'delivered',
    createdAt: '2026-08-21T18:20:00Z'
  }
];

export const SEED_RE_ENGAGEMENT: ReEngagementAudience[] = [
  {
    id: 're-s-1',
    businessId: SUMMIT_ID,
    name: 'Pre-Fall Heating Tune-Up (Past AC Customers 90+ Days)',
    segmentType: '90_days_inactive',
    contactCount: 142,
    aiOfferSuggestion: '$99 Fall Furnace Safety Inspection + Free Carbon Monoxide Detector Replacement',
    messageTemplate: 'Hi {{first_name}}, before the Texas winter chills arrive, Summit is offering existing homeowners an exclusive $99 Furnace & Heat Pump safety checkup. Reply YES to reserve your preferred weekend slot!',
    channel: 'SMS',
    status: 'active',
    metrics: {
      messagesSent: 142,
      responses: 48,
      reactivatedCount: 36,
      appointmentsBooked: 29,
      revenueGenerated: 14500
    },
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 're-in-1',
    businessId: SHARMA_ID,
    name: '6-Month Preventative Dental Scaling & Polish Reminder',
    segmentType: 'due_for_service',
    contactCount: 210,
    aiOfferSuggestion: 'Free Ultrasonic Cleaning Upgrade + Family Dental Checkup Voucher',
    messageTemplate: 'Namaste {{first_name}}! It has been 6 months since your last dental visit at Sharma Dental Care. Regular scaling prevents gum bleeding & tartar. Reply 1 to book your checkup with Dr. Sharma this week!',
    channel: 'WhatsApp',
    status: 'active',
    metrics: {
      messagesSent: 210,
      responses: 84,
      reactivatedCount: 62,
      appointmentsBooked: 54,
      revenueGenerated: 88000
    },
    createdAt: '2026-08-05T11:00:00Z'
  }
];

export const SEED_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-s-1',
    businessId: SUMMIT_ID,
    author: 'Travis Holloway',
    rating: 5,
    platform: 'Google',
    reviewText: 'Summit Home Services saved us when our AC died in 103 degree heat. Sarah booked our technician immediately and David had us cooling within 2 hours. Exceptional service!',
    sentiment: 'positive',
    status: 'published',
    aiDraftedResponse: 'Thank you so much Travis! We know how brutal Texas summers can be, and our team was delighted to get your home cooling again so quickly. Stay cool!',
    publishedResponse: 'Thank you so much Travis! We know how brutal Texas summers can be, and our team was delighted to get your home cooling again so quickly. Stay cool!',
    date: '2026-08-20T18:00:00Z'
  },
  {
    id: 'rev-s-2',
    businessId: SUMMIT_ID,
    author: 'Jennifer Sterling',
    rating: 2,
    platform: 'Yelp',
    reviewText: 'The repair was done well, but the technician arrived 30 minutes past the original estimated 2-hour arrival window.',
    sentiment: 'negative',
    status: 'escalated_to_human',
    flaggedForEscalation: true,
    aiDraftedResponse: 'Hi Jennifer, we sincerely apologize for the delay. We strive for punctual arrivals and want to make this right. Our service manager will reach out to you directly to refund your dispatch fee.',
    date: '2026-08-21T14:30:00Z'
  },
  {
    id: 'rev-in-1',
    businessId: SHARMA_ID,
    author: 'Dr. Meera Iyer',
    rating: 5,
    platform: 'Practo',
    reviewText: 'Got my Invisalign treatment done with Dr. Priya Nair at Sharma Dental. Painless, highly professional 3D simulation, and outstanding results in just 7 months!',
    sentiment: 'positive',
    status: 'published',
    aiDraftedResponse: 'Namaste Dr. Meera! It was an absolute pleasure guiding your smile transformation journey with Invisalign. Thank you for trusting Sharma Dental Care!',
    publishedResponse: 'Namaste Dr. Meera! It was an absolute pleasure guiding your smile transformation journey with Invisalign. Thank you for trusting Sharma Dental Care!',
    date: '2026-08-18T10:00:00Z'
  },
  {
    id: 'rev-uk-1',
    businessId: LONDON_ID,
    author: 'Rupert Campbell',
    rating: 5,
    platform: 'Trustpilot',
    reviewText: 'London Growth Partners provided exemplary advisory through our Series B fundraising. Victoria and the team are outstanding strategists.',
    sentiment: 'positive',
    status: 'published',
    aiDraftedResponse: 'Thank you Rupert! It has been a privilege partnering with your executive team through the funding round.',
    publishedResponse: 'Thank you Rupert! It has been a privilege partnering with your executive team through the funding round.',
    date: '2026-08-19T14:00:00Z'
  }
];

export const SEED_CAMPAIGNS: ColdOutreachCampaign[] = [
  {
    id: 'camp-s-1',
    businessId: SUMMIT_ID,
    name: 'Austin Commercial Property Managers - HVAC Maintenance',
    targetSegment: 'Commercial Landlords & Property Managers (Austin Metro)',
    channel: 'Email',
    complianceStatus: 'APPROVED',
    legalBasis: 'legitimate_business_inquiry',
    unsubscribeIncluded: true,
    compliance: {
      canSpamCompliant: true,
      optOutIncluded: true,
      dailySendLimit: 150
    },
    totalRecipients: 450,
    sentCount: 450,
    openedCount: 288,
    repliedCount: 52,
    bouncedCount: 4,
    optOutCount: 2,
    metrics: {
      sent: 450,
      delivered: 446,
      opened: 288,
      replied: 52,
      bounced: 4,
      unsubscribed: 2
    },
    status: 'completed',
    subject: 'Emergency HVAC Downtime Prevention for Austin Commercial Properties',
    templateSubject: 'Emergency HVAC Downtime Prevention for Austin Commercial Properties',
    bodyTemplate: 'Hi {{first_name}},\n\nWith Austin heat peaking, commercial HVAC outages lead to tenant complaints and costly emergency fees. Summit Home Services manages over 200 commercial facilities in Travis County with guaranteed 90-minute dispatch response times.\n\nWould you be open to a 10-minute discovery call this Thursday to see our preventive maintenance rates?\n\nBest,\nDavid Miller\nSummit Home Services Commercial Division\nUnsubscribe: {{unsubscribe_url}}',
    templateBody: 'Hi {{first_name}},\n\nWith Austin heat peaking, commercial HVAC outages lead to tenant complaints and costly emergency fees. Summit Home Services manages over 200 commercial facilities in Travis County with guaranteed 90-minute dispatch response times.\n\nWould you be open to a 10-minute discovery call this Thursday to see our preventive maintenance rates?\n\nBest,\nDavid Miller\nSummit Home Services Commercial Division\nUnsubscribe: {{unsubscribe_url}}',
    scheduledDate: '2026-08-10T09:00:00Z',
    createdAt: '2026-08-08T14:00:00Z'
  },
  {
    id: 'camp-in-1',
    businessId: SHARMA_ID,
    name: 'Corporate Wellness - Tech Parks Dental Health Drive',
    targetSegment: 'HR Managers & Employees in Manyata & Bagmane Tech Parks',
    channel: 'Email',
    complianceStatus: 'APPROVED',
    legalBasis: 'legitimate_business_inquiry',
    unsubscribeIncluded: true,
    compliance: {
      canSpamCompliant: true,
      optOutIncluded: true,
      dailySendLimit: 200
    },
    totalRecipients: 320,
    sentCount: 320,
    openedCount: 215,
    repliedCount: 41,
    bouncedCount: 2,
    optOutCount: 1,
    metrics: {
      sent: 320,
      delivered: 318,
      opened: 215,
      replied: 41,
      bounced: 2,
      unsubscribed: 1
    },
    status: 'running',
    subject: 'Complimentary Corporate Dental Screening Camp for Your Team',
    templateSubject: 'Complimentary Corporate Dental Screening Camp for Your Team',
    bodyTemplate: 'Namaste {{first_name}},\n\nSharma Dental Care (Indiranagar) partners with premier Bangalore tech firms to offer on-campus preventative dental health checks and exclusive corporate dental benefits.\n\nCan we arrange a brief call with your HR wellness coordinator?\n\nWarm regards,\nDr. Rajesh Sharma\nUnsubscribe: {{unsubscribe_url}}',
    templateBody: 'Namaste {{first_name}},\n\nSharma Dental Care (Indiranagar) partners with premier Bangalore tech firms to offer on-campus preventative dental health checks and exclusive corporate dental benefits.\n\nCan we arrange a brief call with your HR wellness coordinator?\n\nWarm regards,\nDr. Rajesh Sharma\nUnsubscribe: {{unsubscribe_url}}',
    scheduledDate: '2026-08-18T10:00:00Z',
    createdAt: '2026-08-15T11:00:00Z'
  }
];

export const SEED_INTEGRATIONS: IntegrationStatus[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar Sync',
    category: 'Calendar',
    status: 'DEMO_MODE',
    description: 'Two-way real-time appointment availability sync and conflict prevention.',
    lastSync: '2026-08-23T01:45:00Z'
  },
  {
    id: 'twilio_voice',
    name: 'AI Voice Receptionist (Telephony / WebRTC)',
    category: 'Voice',
    status: 'DEMO_MODE',
    description: 'Inbound SIP trunking, call routing, audio recording, and live transcription.',
    lastSync: '2026-08-23T01:40:00Z'
  },
  {
    id: 'twilio_sms',
    name: 'Twilio 10DLC SMS Gateway (US & UK)',
    category: 'SMS',
    status: 'DEMO_MODE',
    description: 'A2P 10DLC registered messaging for missed call text-back and appointment reminders.',
    lastSync: '2026-08-23T01:30:00Z'
  },
  {
    id: 'whatsapp_business',
    name: 'Meta WhatsApp Cloud API (India & Global)',
    category: 'WhatsApp',
    status: 'DEMO_MODE',
    description: 'Verified WhatsApp Business messaging for instant quote follow-up & patient booking.',
    lastSync: '2026-08-23T01:35:00Z'
  },
  {
    id: 'gemini_ai',
    name: 'Google Gemini 3.7 Flash & Tool Calling',
    category: 'AI',
    status: 'CONNECTED',
    description: 'Server-side AI orchestration, RAG knowledge retrieval, lead scoring, and Copilot.',
    lastSync: '2026-08-23T01:48:00Z'
  },
  {
    id: 'resend_email',
    name: 'Transactional & Campaign Email (Resend/SendGrid)',
    category: 'Email',
    status: 'DEMO_MODE',
    description: 'High-deliverability email engine for estimate follow-ups and outreach.',
    lastSync: '2026-08-23T01:25:00Z'
  },
  {
    id: 'hubspot_crm',
    name: 'HubSpot / Salesforce Bi-directional Sync',
    category: 'CRM',
    status: 'DEMO_MODE',
    description: 'Automatic contact & deals syncing to external enterprise CRMs.',
    lastSync: '2026-08-23T01:10:00Z'
  },
  {
    id: 'custom_webhook',
    name: 'Custom Webhooks Inbound/Outbound',
    category: 'Webhooks',
    status: 'CONNECTED',
    description: 'Real-time JSON webhook dispatching for new leads, calls, and bookings.',
    lastSync: '2026-08-23T01:49:00Z'
  }
];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'w-1', widgetType: 'kpi_overview', title: 'Key Revenue Performance Metrics', visible: true, order: 1, size: 'full' },
  { id: 'w-2', widgetType: 'leads_chart', title: 'Lead Acquisition & Conversion Velocity', visible: true, order: 2, size: 'lg' },
  { id: 'w-3', widgetType: 'calls_chart', title: 'Voice & Chat Activity (AI vs Human)', visible: true, order: 3, size: 'md' },
  { id: 'w-4', widgetType: 'revenue_attribution', title: 'Revenue Pipeline Attribution', visible: true, order: 4, size: 'md' },
  { id: 'w-5', widgetType: 'recent_leads', title: 'Recent High-Intent Leads', visible: true, order: 5, size: 'md' },
  { id: 'w-6', widgetType: 'upcoming_appointments', title: 'Upcoming Confirmed Bookings', visible: true, order: 6, size: 'md' },
  { id: 'w-7', widgetType: 'followups_due', title: 'Pending Automated Follow-Up Tasks', visible: true, order: 7, size: 'md' },
  { id: 'w-8', widgetType: 'reviews_feed', title: 'Customer Sentiment & Reviews Feed', visible: true, order: 8, size: 'md' }
];

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    businessId: SUMMIT_ID,
    type: 'hot_lead',
    title: '🔥 Hot Lead Captured: Marcus Vance',
    message: 'Score 94/100. Needs 2 heat pump replacements ($18.5k) across rental properties.',
    linkTab: 'leads',
    read: false,
    createdAt: '2026-08-22T14:30:00Z'
  },
  {
    id: 'notif-2',
    businessId: SUMMIT_ID,
    type: 'missed_call',
    title: '📞 Missed Call Auto-Recovered',
    message: 'Elena Rostova booked water heater replacement after instant SMS text-back.',
    linkTab: 'missed-calls',
    read: false,
    createdAt: '2026-08-20T17:22:00Z'
  },
  {
    id: 'notif-3',
    businessId: SUMMIT_ID,
    type: 'negative_review',
    title: '⚠️ Review Flagged for Escalation',
    message: 'Jennifer Sterling left 2-star Yelp review regarding late technician arrival.',
    linkTab: 'reviews',
    read: false,
    createdAt: '2026-08-21T14:30:00Z'
  },
  {
    id: 'notif-in-1',
    businessId: SHARMA_ID,
    type: 'appointment_booked',
    title: '📅 New Invisalign Consultation Booked',
    message: 'Pooja Hegde scheduled 3D iTero scan for Saturday 11:00 AM via WhatsApp.',
    linkTab: 'appointments',
    read: false,
    createdAt: '2026-08-22T15:30:00Z'
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    businessId: SUMMIT_ID,
    actorEmail: 'admin@summithome.com',
    action: 'LEAD_SCORED',
    entity: 'Marcus Vance',
    details: 'AI Lead qualification algorithm assigned score 94 (HOT) with $18.5k estimated value.',
    timestamp: '2026-08-22T14:30:00Z'
  },
  {
    id: 'log-2',
    businessId: SUMMIT_ID,
    actorEmail: 'system-bot@ai-revenueos.internal',
    action: 'MISSED_CALL_TEXTBACK',
    entity: '+1 (512) 334-1189',
    details: 'Auto-triggered recovery SMS within 45 seconds of missed after-hours call.',
    timestamp: '2026-08-20T17:16:00Z'
  },
  {
    id: 'log-3',
    businessId: SHARMA_ID,
    actorEmail: 'care@sharmadental.in',
    action: 'APPOINTMENT_CREATED',
    entity: 'Pooja Hegde',
    details: 'WhatsApp AI Agent scheduled 3D iTero Smile Design with Dr. Priya Nair.',
    timestamp: '2026-08-22T15:30:00Z'
  }
];
