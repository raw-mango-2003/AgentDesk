import { Business, KnowledgeItem, Conversation, Lead } from '../types';
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

export const DEMO_BUSINESS_ID = 'nova-academy';
export const MEDICAL_CODING_ID = 'medical-coding-academy';
export const DALLAS_CAREER_ID = 'dallas-career-institute';
export const AEC_OVERSEAS_ID = 'aec-overseas';
export const ABC_BUSINESS_ID = 'abc';
export const ACME_TENANT_ID = 'tenant_acme_123';
export const BETA_TENANT_ID = 'tenant_beta_789';

export const DEMO_AGENT_ID = 'agent_nova_001';
export const ACME_AGENT_ID = 'agent_acme_456';
export const BETA_AGENT_ID = 'agent_beta_101';

// 1. Nova AI Academy (Tech Education / AI & Data) - DEMO TENANT
export const DEMO_BUSINESS: Business = {
  id: DEMO_BUSINESS_ID,
  tenantId: DEMO_BUSINESS_ID,
  tenantType: 'demo',
  isDemo: true,
  primaryAgentId: DEMO_AGENT_ID,
  name: 'Nova AI Academy',
  industry: 'Tech Education / Coaching',
  description: 'Nova AI Academy provides professional online and offline training programs in Data Science, Analytics, and Modern Tech Skills.',
  website: 'https://novaacademy.edu',
  supportEmail: 'admissions@novaacademy.edu',
  logo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=120&auto=format&fit=crop&q=80',
  primaryColor: '#2563eb', // Rich Blue
  secondaryColor: '#1e40af',
  agentSettings: {
    agentName: 'Nova AI Assistant',
    welcomeMessage: 'Hi 👋 Welcome to Nova AI Academy. How can I help you with our courses today?',
    businessDescription: 'Nova AI Academy is a premier training institute offering certified career tracks in Data Analytics, Python for AI, and Machine Learning.',
    tone: 'Friendly',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    logoUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=120&auto=format&fit=crop&q=80',
    suggestedQuestions: [
      'What courses do you offer?',
      'How much is Data Analytics?',
      'What are the class timings?',
      'How can I enroll?'
    ],
    systemSecurityInstructions: 'Strict tenant isolation. You represent Nova AI Academy ONLY.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  voice: 'Puck',
  voiceGreeting: 'Hello! I am Nova AI Academy receptionist. How can I assist you with your tech career goals today?',
  plan: 'Professional',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  trialDaysRemaining: 14,
  currency: 'INR',
  whiteLabelEnabled: true,
  dataRetentionDays: 90,
  maxMonthlyVoiceMinutes: 500,
  maxMonthlyMessages: 5000,
  createdAt: new Date().toISOString()
};

// 2. Medical Coding Academy (Healthcare & Clinical Billing)
export const MEDICAL_CODING_BUSINESS: Business = {
  id: MEDICAL_CODING_ID,
  name: 'Medical Coding Academy',
  industry: 'Healthcare Training',
  description: 'Medical Coding Academy prepares healthcare professionals for AAPC and AHIMA certification in Medical Billing and Coding.',
  website: 'https://medicalcodingacademy.org',
  supportEmail: 'info@medicalcodingacademy.org',
  logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=120&auto=format&fit=crop&q=80',
  primaryColor: '#0d9488', // Teal / Medical Green
  secondaryColor: '#0f766e',
  agentSettings: {
    agentName: 'Medical Coding AI Advisor',
    welcomeMessage: 'Hello 👋 Welcome to Medical Coding Academy. How can I assist you with our medical billing and coding certifications?',
    businessDescription: 'Medical Coding Academy provides comprehensive preparation for the Certified Professional Coder (CPC) and Inpatient Coding credentials.',
    tone: 'Professional',
    primaryColor: '#0d9488',
    secondaryColor: '#0f766e',
    suggestedQuestions: [
      'What certifications do you offer?',
      'How much is the CPC Exam Prep course?',
      'Are classes online or in-person?',
      'What is the exam pass rate?'
    ],
    systemSecurityInstructions: 'Strict tenant isolation. You represent Medical Coding Academy ONLY.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  voice: 'Fenrir',
  voiceGreeting: 'Hello! Welcome to Medical Coding Academy admissions. How can I help you with your healthcare coding certification today?',
  plan: 'Enterprise',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  trialDaysRemaining: 30,
  currency: 'USD',
  whiteLabelEnabled: true,
  dataRetentionDays: 180,
  maxMonthlyVoiceMinutes: 1000,
  maxMonthlyMessages: 10000,
  createdAt: new Date().toISOString()
};

// 3. Dallas Career Institute (Vocational & Technical Trades)
export const DALLAS_CAREER_BUSINESS: Business = {
  id: DALLAS_CAREER_ID,
  name: 'Dallas Career Institute',
  industry: 'Vocational & Technical Trades',
  description: 'Dallas Career Institute provides hands-on career training in HVAC Systems, Electrical Apprenticeship, and Phlebotomy.',
  website: 'https://dallascareerinstitute.com',
  supportEmail: 'admissions@dallascareerinstitute.com',
  logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=120&auto=format&fit=crop&q=80',
  primaryColor: '#ea580c', // Orange / Industrial
  secondaryColor: '#c2410c',
  agentSettings: {
    agentName: 'DCI Admissions AI',
    welcomeMessage: 'Welcome to Dallas Career Institute! How can I help you start your hands-on trade training today?',
    businessDescription: 'Dallas Career Institute provides career-focused vocational training in HVAC, Electrical, and Phlebotomy at our Dallas campus.',
    tone: 'Supportive',
    primaryColor: '#ea580c',
    secondaryColor: '#c2410c',
    suggestedQuestions: [
      'What trade programs do you offer?',
      'What is the tuition for HVAC Technician?',
      'When do the next morning and evening batches start?',
      'Do you offer job placement assistance?'
    ],
    systemSecurityInstructions: 'Strict tenant isolation. You represent Dallas Career Institute ONLY.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  voice: 'Aoede',
  voiceGreeting: 'Welcome to Dallas Career Institute! I can help you with program details, tuition, campus schedules, and enrollment.',
  plan: 'Professional',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  trialDaysRemaining: 21,
  currency: 'USD',
  whiteLabelEnabled: true,
  dataRetentionDays: 90,
  maxMonthlyVoiceMinutes: 500,
  maxMonthlyMessages: 5000,
  createdAt: new Date().toISOString()
};

// 4. ABC Academy (Generic Secondary Tenant)
export const ABC_BUSINESS: Business = {
  id: ABC_BUSINESS_ID,
  name: 'ABC Academy',
  industry: 'Education',
  description: 'ABC Academy offers Data Analytics, Digital Marketing and Full Stack Development training.',
  website: 'https://abcacademy.edu',
  supportEmail: 'support@abcacademy.edu',
  logo: '',
  primaryColor: '#7c3aed',
  secondaryColor: '#6d28d9',
  agentSettings: {
    agentName: 'ABC AI Assistant',
    welcomeMessage: 'Hi 👋 Welcome to ABC Academy. How can I assist you with our courses today?',
    businessDescription: 'ABC Academy offers Data Analytics, Digital Marketing and Full Stack Development.',
    tone: 'Friendly',
    primaryColor: '#7c3aed',
    secondaryColor: '#6d28d9',
    suggestedQuestions: [
      'What courses does ABC Academy offer?',
      'What is the fee for the Data Analytics course?',
      'What are the Data Analytics class timings?'
    ],
    systemSecurityInstructions: 'Strict multi-tenant security boundary. You represent ABC Academy ONLY.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  voice: 'Puck',
  voiceGreeting: 'Hello! I am ABC Academy AI Assistant. How can I assist you today?',
  plan: 'Professional',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  trialDaysRemaining: 14,
  currency: 'INR',
  whiteLabelEnabled: false,
  dataRetentionDays: 90,
  maxMonthlyVoiceMinutes: 500,
  maxMonthlyMessages: 5000,
  createdAt: new Date().toISOString()
};

// 5. AEC Overseas (Study Abroad & Global University Admissions)
export const AEC_OVERSEAS_BUSINESS: Business = {
  id: AEC_OVERSEAS_ID,
  name: 'AEC Overseas',
  industry: 'Study Abroad / Global Education',
  description: 'AEC Overseas is a premier global education consultancy assisting students with overseas university admissions, scholarships, and student visas.',
  website: 'https://aecoverseas.com',
  supportEmail: 'admissions@aecoverseas.com',
  logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=120&auto=format&fit=crop&q=80',
  primaryColor: '#0284c7', // Sky Blue
  secondaryColor: '#0369a1',
  agentSettings: {
    agentName: 'AEC Overseas Advisor',
    welcomeMessage: 'Hello 👋 Welcome to AEC Overseas. How can I help you with your global education and university admissions?',
    businessDescription: 'AEC Overseas provides expert counseling for higher education in the UK, USA, Canada, Australia, Ireland, and Europe.',
    tone: 'Professional',
    primaryColor: '#0284c7',
    secondaryColor: '#0369a1',
    suggestedQuestions: [
      'What countries do you assist with for study abroad?',
      'How much is the university application guidance fee?',
      'Do you offer IELTS / TOEFL preparation?',
      'What are the visa requirements for UK & Canada?'
    ],
    systemSecurityInstructions: 'Strict tenant isolation. You represent AEC Overseas ONLY.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  voice: 'Aoede',
  voiceGreeting: 'Hello! Welcome to AEC Overseas education consultancy. How can I help you with your study abroad plans today?',
  plan: 'Enterprise',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  trialDaysRemaining: 30,
  currency: 'INR',
  whiteLabelEnabled: true,
  dataRetentionDays: 180,
  maxMonthlyVoiceMinutes: 1000,
  maxMonthlyMessages: 10000,
  createdAt: new Date().toISOString()
};

// 6. Acme Technologies (Accounting Software) - CUSTOMER TENANT A
export const ACME_BUSINESS: Business = {
  id: ACME_TENANT_ID,
  tenantId: ACME_TENANT_ID,
  tenantType: 'customer',
  isDemo: false,
  primaryAgentId: ACME_AGENT_ID,
  name: 'Acme Technologies',
  industry: 'Accounting Software & FinTech',
  description: 'We sell accounting software. Acme Technologies provides automated bookkeeping, real-time invoicing, payroll sync, and tax compliance solutions.',
  website: 'https://acmetech.example.com',
  supportEmail: 'sales@acmetech.example.com',
  logo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&auto=format&fit=crop&q=80',
  primaryColor: '#0284c7',
  secondaryColor: '#0f172a',
  agentSettings: {
    agentName: 'Acme Sales Agent',
    welcomeMessage: 'Welcome to Acme Technologies. How can I help you with our cloud accounting software and financial management tools today?',
    businessDescription: 'Acme Technologies sells cloud accounting software, financial reporting, real-time invoicing, and automated bookkeeping tools for modern businesses.',
    tone: 'Professional',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    suggestedQuestions: [
      'What accounting software plans do you offer?',
      'Do you provide automated invoicing & payroll integration?',
      'How much does Acme Accounting Software cost?',
      'Can I request a product demo or free trial?'
    ],
    systemSecurityInstructions: 'Strict tenant isolation. You represent Acme Technologies ONLY. You sell accounting software. You do NOT provide recruitment or staffing services.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  plan: 'Growth',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  currency: 'USD',
  createdAt: new Date().toISOString()
};

// 7. Beta Solutions (Recruitment & Staffing) - CUSTOMER TENANT B
export const BETA_BUSINESS: Business = {
  id: BETA_TENANT_ID,
  tenantId: BETA_TENANT_ID,
  tenantType: 'customer',
  isDemo: false,
  primaryAgentId: BETA_AGENT_ID,
  name: 'Beta Solutions',
  industry: 'Recruitment & Executive Search',
  description: 'We provide recruitment services. Beta Solutions specializes in technical talent placement, executive headhunting, and enterprise staffing.',
  website: 'https://betasolutions.example.com',
  supportEmail: 'contact@betasolutions.example.com',
  logo: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=120&auto=format&fit=crop&q=80',
  primaryColor: '#7c3aed',
  secondaryColor: '#0f172a',
  agentSettings: {
    agentName: 'Beta Sales Agent',
    welcomeMessage: 'Welcome to Beta Solutions. How can I assist you with our executive recruitment and technical staffing services today?',
    businessDescription: 'Beta Solutions provides executive search, technical recruitment, and workforce talent acquisition services.',
    tone: 'Consultative',
    primaryColor: '#7c3aed',
    secondaryColor: '#0f172a',
    suggestedQuestions: [
      'What recruitment and staffing services do you provide?',
      'How do you source senior engineering and executive talent?',
      'What are your search retainers and placement fees?',
      'Can I speak with a recruitment consultant?'
    ],
    systemSecurityInstructions: 'Strict tenant isolation. You represent Beta Solutions ONLY. You provide recruitment services. You do NOT sell accounting software.',
    humanHandoffEnabled: true,
    leadCaptureEnabled: true
  },
  plan: 'Starter',
  status: 'active',
  agentStatus: 'PUBLISHED',
  subscriptionState: 'ACTIVE',
  currency: 'USD',
  createdAt: new Date().toISOString()
};

export const SEED_BUSINESSES: Business[] = [
  PUBLIC_AGENTDESK_DEMO_BUSINESS,
  DEMO_BUSINESS,
  ACME_BUSINESS,
  BETA_BUSINESS,
  MEDICAL_CODING_BUSINESS,
  DALLAS_CAREER_BUSINESS,
  AEC_OVERSEAS_BUSINESS,
  ABC_BUSINESS
];

// ==========================================
// TENANT 1: NOVA AI ACADEMY KNOWLEDGE ITEMS
// ==========================================
export const DEMO_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-nova-1',
    businessId: DEMO_BUSINESS_ID,
    title: 'Data Analytics Course Details',
    type: 'text',
    content: `COURSE: Data Analytics
Fee: ₹25,000
Duration: 12 weeks
Class timings: Monday-Friday, 7 PM-9 PM
Mode: Online live sessions and classroom options available
Admissions: Students can contact admissions@novaacademy.edu to enroll directly.
Refund policy: Refund requests can be submitted within 7 days of enrollment.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-nova-2',
    businessId: DEMO_BUSINESS_ID,
    title: 'Data Analytics Course Syllabus',
    type: 'faq',
    content: `Question: What is the syllabus for the Data Analytics course?
Answer: The 12-week Data Analytics course covers:
1. Advanced Excel & Data Wrangling (Weeks 1-2)
2. SQL Database Querying & Relational Modeling (Weeks 3-5)
3. Power BI & Tableau Business Dashboards (Weeks 6-8)
4. Python for Analytics & Pandas (Weeks 9-11)
5. Industry Capstone Project & Portfolio Review (Week 12).`,
    category: 'Syllabus',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-nova-3',
    businessId: DEMO_BUSINESS_ID,
    title: 'Python for AI & Machine Learning Course',
    type: 'faq',
    content: `Question: What is the Python for AI course fee and duration?
Answer: The Python for AI & Machine Learning course fee is ₹32,000 for a 14-week intensive program. Classes are held Monday to Thursday from 8 PM to 10 PM.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-nova-4',
    businessId: DEMO_BUSINESS_ID,
    title: 'Free Live Demo Session',
    type: 'faq',
    content: `Question: Are demo classes available before paying?
Answer: Yes! We offer free live interactive demo classes every Saturday at 11 AM IST. You can register by sharing your name and contact details with our AI receptionist.`,
    category: 'Demo',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-nova-5',
    businessId: DEMO_BUSINESS_ID,
    title: 'Courses Offered by Nova AI Academy',
    type: 'faq',
    content: `Question: What courses does Nova AI Academy offer?
Answer: Nova AI Academy offers certified programs in Data Analytics, Python for AI & Machine Learning, and Full Stack Web Development.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ====================================================
// TENANT 2: MEDICAL CODING ACADEMY KNOWLEDGE ITEMS
// ====================================================
export const MEDICAL_CODING_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-med-1',
    businessId: MEDICAL_CODING_ID,
    title: 'Certified Professional Coder (CPC) Exam Prep Course',
    type: 'faq',
    content: `Question: What is the fee and duration for the CPC Exam Prep course?
Answer: The Certified Professional Coder (CPC) course tuition is $2,499 (or ₹45,000 for international students). It is a 10-week intensive training program designed for AAPC certification.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-med-2',
    businessId: MEDICAL_CODING_ID,
    title: 'Medical Billing & Coding Class Timings',
    type: 'faq',
    content: `Question: What are the class schedules for Medical Coding Academy?
Answer: Live online classes run on Tuesday and Thursday evenings from 6:30 PM to 9:00 PM CST, with Saturday morning workshops from 9:00 AM to 12:00 PM CST. All lectures are recorded and accessible 24/7.`,
    category: 'Schedule',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-med-3',
    businessId: MEDICAL_CODING_ID,
    title: 'Courses Offered by Medical Coding Academy',
    type: 'faq',
    content: `Question: What courses and certifications do you offer?
Answer: Medical Coding Academy offers three certified healthcare tracks:
1. Certified Professional Coder (CPC) Exam Prep ($2,499, 10 weeks)
2. Medical Billing & Insurance Reimbursement ($1,850, 8 weeks)
3. Inpatient Hospital ICD-10-PCS Coding ($2,200, 8 weeks).`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-med-4',
    businessId: MEDICAL_CODING_ID,
    title: 'Prerequisites & Eligibility',
    type: 'faq',
    content: `Question: What are the prerequisites for enrolling in Medical Coding?
Answer: A high school diploma or GED is required. Prior healthcare experience is helpful but not mandatory; our curriculum includes Medical Terminology, Anatomy, and Pathophysiology modules.`,
    category: 'Admissions',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-med-5',
    businessId: MEDICAL_CODING_ID,
    title: 'Exam Pass Guarantee & Placement Assistance',
    type: 'faq',
    content: `Question: What is your exam pass rate and job placement assistance?
Answer: Medical Coding Academy graduates hold a 94% first-time pass rate on the AAPC CPC exam. We offer resume optimization, medical billing externship connections, and hospital network job placement support.`,
    category: 'Career',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ====================================================
// TENANT 3: DALLAS CAREER INSTITUTE KNOWLEDGE ITEMS
// ====================================================
export const DALLAS_CAREER_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-dallas-1',
    businessId: DALLAS_CAREER_ID,
    title: 'HVAC Technician Certification Program',
    type: 'faq',
    content: `Question: What is the tuition and duration for the HVAC Technician program?
Answer: The HVAC Technician Certificate tuition is $3,200 for a 14-week hands-on training program. It includes EPA Universal Section 608 certification exam prep and lab equipment.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-dallas-2',
    businessId: DALLAS_CAREER_ID,
    title: 'Dallas Career Institute Programs & Trades',
    type: 'faq',
    content: `Question: What vocational trade programs do you offer?
Answer: Dallas Career Institute offers hands-on vocational certifications in:
1. HVAC Technician Certificate ($3,200, 14 weeks)
2. Residential & Commercial Electrical Apprenticeship ($3,500, 16 weeks)
3. Certified Phlebotomy Technician ($1,450, 6 weeks).`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-dallas-3',
    businessId: DALLAS_CAREER_ID,
    title: 'Campus Location & Class Schedule',
    type: 'faq',
    content: `Question: Where is the campus located and what are the class timings?
Answer: Our training facility and hands-on workshops are located at 4100 Alpha Road, Dallas, TX 75244. Morning batches run Monday-Thursday 8:30 AM to 1:00 PM, and Evening batches run Monday-Thursday 5:30 PM to 10:00 PM.`,
    category: 'Schedule',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-dallas-4',
    businessId: DALLAS_CAREER_ID,
    title: 'Tuition Financing & Payment Plans',
    type: 'faq',
    content: `Question: Do you offer financial aid or monthly payment plans?
Answer: Yes. Dallas Career Institute offers interest-free monthly installment plans and workforce development grants for eligible Texas residents.`,
    category: 'Financial',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ==========================================
// TENANT 4: ABC ACADEMY KNOWLEDGE ITEMS
// ==========================================
export const ABC_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-abc-1',
    businessId: ABC_BUSINESS_ID,
    title: 'Data Analytics Course Fee & Duration',
    type: 'faq',
    content: `Question:
What is the fee for the Data Analytics course?

Answer:
The Data Analytics course costs ₹30,000. The course duration is 16 weeks.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-abc-2',
    businessId: ABC_BUSINESS_ID,
    title: 'Data Analytics Class Timings',
    type: 'faq',
    content: `Question:
What are the Data Analytics class timings?

Answer:
Data Analytics classes are Monday to Friday from 7 PM to 9 PM.`,
    category: 'Schedule',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-abc-3',
    businessId: ABC_BUSINESS_ID,
    title: 'Courses Offered by ABC Academy',
    type: 'faq',
    content: `Question:
What courses does ABC Academy offer?

Answer:
ABC Academy offers Data Analytics, Digital Marketing and Full Stack Development.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-abc-4',
    businessId: ABC_BUSINESS_ID,
    title: 'Digital Marketing Course Fee',
    type: 'faq',
    content: `Question:
What is the fee for the Digital Marketing course?

Answer:
The Digital Marketing course fee is ₹22,000 for a 12-week program.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-abc-5',
    businessId: ABC_BUSINESS_ID,
    title: 'Full Stack Development Course Fee',
    type: 'faq',
    content: `Question:
What is the fee for the Full Stack Development course?

Answer:
The Full Stack Development course fee is ₹35,000 for a 16-week program.`,
    category: 'Courses',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ==========================================
// TENANT 5: AEC OVERSEAS KNOWLEDGE ITEMS
// ==========================================
export const AEC_OVERSEAS_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-aec-1',
    tenantId: AEC_OVERSEAS_ID,
    businessId: AEC_OVERSEAS_ID,
    title: 'Study Abroad Destinations & Countries',
    type: 'faq',
    content: `Question: What countries does AEC Overseas assist with for study abroad?
Answer: AEC Overseas assists students with university admissions, scholarships, and student visas for premier destinations including the United Kingdom (UK), United States (USA), Canada, Australia, Ireland, and Germany.`,
    category: 'Admissions',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-aec-2',
    tenantId: AEC_OVERSEAS_ID,
    businessId: AEC_OVERSEAS_ID,
    title: 'Study Abroad Counseling & Application Fee',
    type: 'faq',
    content: `Question: What is the fee for AEC Overseas counseling and admission processing?
Answer: Initial profile evaluation and university selection counseling is completely free. Comprehensive end-to-end visa and application processing packages start at ₹15,000.`,
    category: 'Pricing',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-aec-3',
    tenantId: AEC_OVERSEAS_ID,
    businessId: AEC_OVERSEAS_ID,
    title: 'IELTS & Test Preparation Coaching',
    type: 'faq',
    content: `Question: Do you provide IELTS or PTE coaching?
Answer: Yes, AEC Overseas offers 6-week intensive online and classroom coaching for IELTS, TOEFL, and PTE with certified trainers and mock exam portals.`,
    category: 'Courses',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ==========================================
// TENANT 6: ACME TECHNOLOGIES KNOWLEDGE ITEMS
// ==========================================
export const ACME_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-acme-1',
    tenant_id: ACME_TENANT_ID,
    tenantId: ACME_TENANT_ID,
    businessId: ACME_TENANT_ID,
    title: 'Acme Cloud Accounting Software & Core Features',
    type: 'faq',
    content: `Question: What does Acme Technologies do?
Answer: We sell accounting software. Acme Technologies provides automated cloud bookkeeping, real-time invoicing, expense tracking, and payroll integration for growing companies.`,
    category: 'Company & Products',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-acme-2',
    tenant_id: ACME_TENANT_ID,
    tenantId: ACME_TENANT_ID,
    businessId: ACME_TENANT_ID,
    title: 'Acme Pricing & Subscription Plans',
    type: 'faq',
    content: `Question: What are the pricing plans for Acme Accounting Software?
Answer: Acme Technologies offers two main plans: Starter ($199/month for up to 5 users) and Growth ($399/month for unlimited users and multi-currency invoicing). Custom Enterprise packages are available for large organizations.`,
    category: 'Pricing',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-acme-3',
    tenant_id: ACME_TENANT_ID,
    tenantId: ACME_TENANT_ID,
    businessId: ACME_TENANT_ID,
    title: 'Acme Services & Capabilities',
    type: 'faq',
    content: `Question: What services do you provide?
Answer: We sell accounting software. We provide cloud-based bookkeeping automation, payroll synchronization, real-time revenue analytics, and automated tax reporting.`,
    category: 'Services',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ==========================================
// TENANT 7: BETA SOLUTIONS KNOWLEDGE ITEMS
// ==========================================
export const BETA_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-beta-1',
    tenant_id: BETA_TENANT_ID,
    tenantId: BETA_TENANT_ID,
    businessId: BETA_TENANT_ID,
    title: 'Beta Solutions Recruitment & Executive Search',
    type: 'faq',
    content: `Question: What does Beta Solutions do?
Answer: We provide recruitment services. Beta Solutions specializes in executive search, technical recruitment, and workforce talent acquisition across tech, engineering, and finance.`,
    category: 'Company & Services',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-beta-2',
    tenant_id: BETA_TENANT_ID,
    tenantId: BETA_TENANT_ID,
    businessId: BETA_TENANT_ID,
    title: 'Beta Solutions Recruitment Fees & Terms',
    type: 'faq',
    content: `Question: What are your recruitment placement fees?
Answer: Contingency placement fees range between 18-22% of first-year base salary with a 90-day replacement guarantee. Retained executive searches are structured at 30% retainer.`,
    category: 'Pricing',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'k-beta-3',
    tenant_id: BETA_TENANT_ID,
    tenantId: BETA_TENANT_ID,
    businessId: BETA_TENANT_ID,
    title: 'Beta Solutions Services & Specializations',
    type: 'faq',
    content: `Question: What services do you provide?
Answer: We provide recruitment services. Our offerings include executive headhunting, technical candidate vetting, interim engineering contractors, and dedicated talent pipelines.`,
    category: 'Services',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SEED_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  ...PLATFORM_ADMIN_KNOWLEDGE_ITEMS,
  ...PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS,
  ...DEMO_KNOWLEDGE_ITEMS,
  ...ACME_KNOWLEDGE_ITEMS,
  ...BETA_KNOWLEDGE_ITEMS,
  ...MEDICAL_CODING_KNOWLEDGE_ITEMS,
  ...DALLAS_CAREER_KNOWLEDGE_ITEMS,
  ...AEC_OVERSEAS_KNOWLEDGE_ITEMS,
  ...ABC_KNOWLEDGE_ITEMS
];

// Sample Conversations scoped by tenant
export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-nova-101',
    businessId: DEMO_BUSINESS_ID,
    customerName: 'Aarav Sharma',
    customerEmail: 'aarav.sharma@example.com',
    customerPhone: '+91 98765 43210',
    status: 'RESOLVED',
    leadCaptured: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    messages: [
      {
        id: 'm1',
        sender: 'agent',
        text: 'Hi 👋 Welcome to Nova AI Academy. How can I help you today?',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'm2',
        sender: 'user',
        text: 'What is the fee for Data Analytics?',
        timestamp: new Date(Date.now() - 3600000 * 5 + 10000).toISOString()
      },
      {
        id: 'm3',
        sender: 'agent',
        text: 'The Data Analytics course fee is ₹25,000 for a 12-week program.',
        timestamp: new Date(Date.now() - 3600000 * 5 + 15000).toISOString()
      }
    ]
  },
  {
    id: 'conv-med-201',
    businessId: MEDICAL_CODING_ID,
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@example.com',
    customerPhone: '+1 (214) 555-0199',
    status: 'RESOLVED',
    leadCaptured: true,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    messages: [
      {
        id: 'm1',
        sender: 'agent',
        text: 'Hello 👋 Welcome to Medical Coding Academy. How can I assist you?',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'm2',
        sender: 'user',
        text: 'How much is the CPC exam prep course?',
        timestamp: new Date(Date.now() - 3600000 * 3 + 10000).toISOString()
      },
      {
        id: 'm3',
        sender: 'agent',
        text: 'The Certified Professional Coder (CPC) course tuition is $2,499 for a 10-week training program.',
        timestamp: new Date(Date.now() - 3600000 * 3 + 15000).toISOString()
      }
    ]
  },
  {
    id: 'conv-dallas-301',
    businessId: DALLAS_CAREER_ID,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.vance@example.com',
    customerPhone: '+1 (214) 555-0812',
    status: 'RESOLVED',
    leadCaptured: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    messages: [
      {
        id: 'm1',
        sender: 'agent',
        text: 'Hello 👋 Welcome to Dallas Career Institute. How can I assist you with our hands-on trade programs today?',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: 'm2',
        sender: 'user',
        text: 'What is the tuition fee for the HVAC Technician program?',
        timestamp: new Date(Date.now() - 3600000 * 4 + 12000).toISOString()
      },
      {
        id: 'm3',
        sender: 'agent',
        text: 'The HVAC Technician Program tuition is $4,800 for the 16-week hands-on training including EPA 608 certification.',
        timestamp: new Date(Date.now() - 3600000 * 4 + 18000).toISOString()
      }
    ]
  },
  {
    id: 'conv-abc-401',
    businessId: ABC_BUSINESS_ID,
    customerName: 'David Miller',
    customerEmail: 'david.miller@example.com',
    customerPhone: '+1 (415) 555-2468',
    status: 'RESOLVED',
    leadCaptured: true,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    messages: [
      {
        id: 'm1',
        sender: 'agent',
        text: 'Hi 👋 Welcome to ABC Business Solutions. How can I help you today?',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString()
      },
      {
        id: 'm2',
        sender: 'user',
        text: 'What courses does ABC Academy offer?',
        timestamp: new Date(Date.now() - 3600000 * 6 + 10000).toISOString()
      },
      {
        id: 'm3',
        sender: 'agent',
        text: 'ABC Academy offers Data Analytics, Digital Marketing and Full Stack Development.',
        timestamp: new Date(Date.now() - 3600000 * 6 + 16000).toISOString()
      }
    ]
  }
];

export const DEMO_LEADS: Lead[] = [
  {
    id: 'lead-nova-1',
    businessId: DEMO_BUSINESS_ID,
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+91 98765 43210',
    message: 'Interested in attending the Saturday 11 AM Data Analytics demo class.',
    source: 'AI Chat Widget',
    conversationId: 'conv-nova-101',
    status: 'qualified',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    notes: 'Counselor scheduled for call on Friday afternoon.'
  },
  {
    id: 'lead-med-1',
    businessId: MEDICAL_CODING_ID,
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+1 (214) 555-0199',
    message: 'Inquired about AAPC CPC exam prep schedule and payment plan options.',
    source: 'AI Chat Widget',
    conversationId: 'conv-med-201',
    status: 'qualified',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'Prospective student for Tuesday/Thursday evening batch.'
  },
  {
    id: 'lead-dallas-1',
    businessId: DALLAS_CAREER_ID,
    name: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    phone: '+1 (214) 555-0812',
    message: 'Requested schedule information for the upcoming 16-week HVAC Technician cohort.',
    source: 'AI Chat Widget',
    conversationId: 'conv-dallas-301',
    status: 'qualified',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    notes: 'Trade program advisor contacted via phone.'
  },
  {
    id: 'lead-abc-1',
    businessId: ABC_BUSINESS_ID,
    name: 'David Miller',
    email: 'david.miller@example.com',
    phone: '+1 (415) 555-2468',
    message: 'Looking for full stack development training course syllabus and enterprise team pricing.',
    source: 'AI Chat Widget',
    conversationId: 'conv-abc-401',
    status: 'contacted',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    notes: 'Sent course brochure and pricing sheet.'
  }
];
