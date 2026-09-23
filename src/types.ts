// AI RevenueOS - Global Type Definitions

export type UserRole = 
  | 'PLATFORM_ADMIN' 
  | 'TENANT_ADMIN'
  | 'TENANT_USER'
  | 'BUSINESS_ADMIN' 
  | 'SUPER_ADMIN'
  | 'ADMIN' 
  | 'MANAGER' 
  | 'AGENT' 
  | 'OPERATOR'
  | 'VIEWER';

export type TenantType = 'demo' | 'customer' | 'platform';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  businessId?: string;
  tenantId?: string;
  organizationId?: string;
  avatarUrl?: string;
  isPlatformAdmin?: boolean;
  mustChangePassword?: boolean;
  status?: string;
  createdAt?: string;
}

export interface AIAgent {
  id: string; // agent_id (e.g., 'platform-admin-agent', 'agent_acme_456')
  publicId?: string; // public agent key/ID for embed widget
  tenantId: string; // tenant_id (e.g., 'platform', 'tenant_acme_123')
  ownershipType?: 'PLATFORM' | 'TENANT' | 'PUBLIC_DEMO';
  name: string; // e.g. 'AgentDesk AI'
  role?: string; // e.g. 'AI Sales & Admissions Assistant'
  welcomeMessage: string;
  businessDescription?: string;
  tone: AgentTone;
  status: AgentStatus;
  systemInstructions?: string;
  customInstructions?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  suggestedQuestions: string[];
  humanHandoffEnabled?: boolean;
  leadCaptureEnabled?: boolean;
  minQualificationScore?: number;
  qualificationRules?: LeadQualificationRule[];
  voice?: string;
  voiceGreeting?: string;
  isDemo?: boolean;
  businessHours?: string;
  supportEmail?: string;
  supportPhone?: string;
  website?: string;
  productsServices?: string;
  createdAt: string;
  updatedAt?: string;
}


export type CountryCode = 
  | 'US' 
  | 'IN' 
  | 'GB' 
  | string;

export type CurrencyCode = 'USD' | 'INR' | 'GBP';

export interface LocalizationConfig {
  country: CountryCode;
  currency: CurrencyCode;
  timezone: string;
  phonePrefix: string;
  locale: string;
  dateFormat?: string;
  numberFormat?: string;
  primaryChannel: 'SMS' | 'WhatsApp';
  languages: string[];
}

export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'ENTERPRISE' | 'Professional' | 'Starter' | 'Business' | 'Enterprise' | string;
export type SubscriptionState = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED' | string;

export type KnowledgeType = 'faq' | 'text' | 'document' | 'website' | 'pdf' | 'docx' | 'csv';
export type KnowledgeStatus = 'active' | 'draft' | 'archived' | 'conflict';

export interface KnowledgeItem {
  id: string;
  businessId: string;
  tenant_id?: string;
  tenantId?: string;
  organizationId?: string;
  title: string;
  type: KnowledgeType;
  content: string;
  category?: string;
  status: KnowledgeStatus;
  active?: boolean;
  /** Controls whether this item may be used by the public website widget. */
  visibility?: 'public' | 'internal' | 'restricted';
  sourceUrl?: string;
  fileName?: string;
  fileSize?: string;
  chunkCount?: number;
  tags?: string[];
  lastUpdated?: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentTone = 'Professional' | 'Friendly' | 'Premium' | 'Concise' | 'Consultative' | 'Warm' | 'Supportive' | string;
export type AgentStatus = 'DRAFT' | 'TESTING' | 'PUBLISHED' | 'PAUSED' | string;


export interface LeadQualificationRule {
  id: string;
  question: string;
  field: 'budget' | 'timeline' | 'service_interest' | 'location' | 'custom' | string;
  required: boolean;
  scoreWeight: number; // 0 - 30
}

export interface AgentSettings {
  agentName: string;
  welcomeMessage: string;
  businessDescription: string;
  tone: AgentTone;
  voiceTone?: string;
  temperature?: number;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  suggestedQuestions: string[];
  systemSecurityInstructions?: string;
  humanHandoffEnabled?: boolean;
  leadCaptureEnabled?: boolean;
  customInstructions?: string;
  minQualificationScore?: number;
  qualificationRules?: LeadQualificationRule[];
  voiceAccent?: string;
  voiceGender?: 'male' | 'female';
}

export interface Business {
  id: string; // tenant_id
  tenant_id?: string;
  tenantId?: string;
  tenantType?: TenantType;
  isDemo?: boolean;
  primaryAgentId?: string;
  organizationId?: string;
  name: string;
  ownerName?: string;
  customerName?: string;
  email?: string;
  industry: string;
  description: string;
  website: string;
  supportEmail: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  country?: CountryCode;
  currency?: CurrencyCode;
  timezone?: string;
  locale?: string;
  phoneCountryCode?: string;
  dateFormat?: string;
  numberFormat?: string;
  language?: string;
  primaryChannel?: 'SMS' | 'WhatsApp';
  businessHours?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  agentSettings: AgentSettings;
  plan: SubscriptionPlan;
  status: 'active' | 'suspended' | 'trial' | string;
  voice?: any;
  voiceGreeting?: string;
  agentStatus?: AgentStatus;
  subscriptionState?: SubscriptionState;
  trialDaysRemaining?: number;
  whiteLabelEnabled?: boolean;
  dataRetentionDays?: number;
  maxMonthlyVoiceMinutes?: number;
  maxMonthlyMessages?: number;
  price?: number;
  billing?: string;
  voiceMinutes?: number;
  aiConversations?: number;
  createdAt?: string;
  updatedAt?: string;
}



export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'appointment' 
  | 'proposal' 
  | 'won' 
  | 'lost' 
  | 'nurture'
  | 'converted';

export type LeadScoreCategory = 'HOT' | 'WARM' | 'COLD';

export interface Lead {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  agentId?: string;
  businessId: string;
  organizationId?: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  message?: string;
  source: 'website_chat' | 'voice_call' | 'missed_call_textback' | 'cold_outreach' | 'manual' | 'form' | string;
  conversationId?: string;
  status: LeadStatus;
  score?: number; // 0 - 100
  scoreCategory?: LeadScoreCategory;
  aiScoreExplanation?: string;
  budget?: string;
  timeline?: string;
  serviceInterest?: string;
  location?: string;
  owner?: string;
  lastContact?: string;
  nextFollowUp?: string;
  value?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}


export interface TimelineEvent {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  timestamp: string;
  type: 
    | 'website_visit' 
    | 'chat' 
    | 'voice_call' 
    | 'missed_call' 
    | 'lead_created' 
    | 'ai_qualification' 
    | 'follow_up_sent' 
    | 'estimate_sent' 
    | 'estimate_accepted' 
    | 'appointment_booked' 
    | 'reminder_sent' 
    | 'review_received' 
    | 'reengagement_sent' 
    | 'deal_won' 
    | 'note_added';
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface Contact {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address?: string;
  country: CountryCode;
  tags: string[];
  totalRevenue: number;
  optOut: boolean;
  preferredChannel: 'SMS' | 'WhatsApp' | 'Email' | 'Phone';
  lastInteraction: string;
  status: 'active' | 'inactive' | 'lead' | 'customer';
  inactiveDays?: number;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  name: string;
  industry: string;
  website?: string;
  phone?: string;
  location?: string;
  contactsCount: number;
  totalDealsValue: number;
  createdAt: string;
}

export type DealStage = 
  | 'lead_in' 
  | 'contacted' 
  | 'appointment_scheduled' 
  | 'proposal_sent' 
  | 'negotiation' 
  | 'won' 
  | 'lost';

export interface Deal {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  title: string;
  contactId?: string;
  contactName: string;
  companyName?: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CallStatus = 
  | 'ringing' 
  | 'in-progress' 
  | 'completed' 
  | 'transferred' 
  | 'missed' 
  | 'voicemail';

export interface CallRecord {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  callerName: string;
  callerPhone: string;
  direction: 'inbound' | 'outbound';
  status: CallStatus;
  durationSeconds: number;
  intent: string;
  leadScore: number;
  transcript: Array<{ speaker: 'caller' | 'ai_receptionist' | 'agent'; text: string; time: string }>;
  summary: string;
  audioWaveform?: number[];
  appointmentBooked?: boolean;
  appointmentDetails?: string;
  disposition: 'Qualified Lead' | 'Appointment Booked' | 'General Inquiry' | 'Support Request' | 'Missed Call' | 'Spam';
  isMissedCallRecovered?: boolean;
  createdAt: string;
}

export interface MissedCallRecovery {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  callerPhone: string;
  callerName: string;
  callTimestamp: string;
  textBackStatus: 'sent' | 'replied' | 'recovered' | 'expired';
  channel: 'SMS' | 'WhatsApp';
  initialMessage: string;
  conversationMessages: Array<{ sender: 'system' | 'customer' | 'ai'; text: string; timestamp: string }>;
  recoveredLeadId?: string;
  appointmentId?: string;
  recoveryRateAttributed: boolean;
  createdAt: string;
}

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled' 
  | 'no-show' 
  | 'rescheduled';

export interface Appointment {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  contactId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  serviceName: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: AppointmentStatus;
  location?: string;
  notes?: string;
  remindersSent: {
    immediate: boolean;
    twentyFourHours: boolean;
    twoHours: boolean;
  };
  calendarType: 'google' | 'internal';
  createdAt: string;
}

export type EstimateStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'follow_up_due' 
  | 'negotiating' 
  | 'accepted' 
  | 'rejected' 
  | 'expired';

export interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Estimate {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  estimateNumber: string;
  contactId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  amount: number;
  currency: CurrencyCode;
  items: EstimateItem[];
  dateSent: string;
  validUntil: string;
  status: EstimateStatus;
  nextFollowUpDate: string;
  salesOwner: string;
  followUpStep: number;
  aiFollowUpDraft?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  contactId?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  triggerReason: 'new_lead' | 'no_response' | 'missed_call' | 'estimate_sent' | 'appointment_no_show' | 'lost_opportunity';
  channel: 'Email' | 'SMS' | 'WhatsApp' | 'Voice';
  sequenceDay: 'Day 0' | 'Day 1' | 'Day 3' | 'Day 7' | 'Custom';
  scheduledTime: string;
  messageText: string;
  status: 'pending' | 'sent' | 'delivered' | 'responded' | 'opted_out' | 'cancelled';
  createdAt: string;
}

export interface ReEngagementAudience {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  name: string;
  segmentType: '30_days_inactive' | '60_days_inactive' | '90_days_inactive' | 'lost_opportunities' | 'past_customers' | 'due_for_service';
  contactCount: number;
  aiOfferSuggestion: string;
  messageTemplate: string;
  channel: 'WhatsApp' | 'SMS' | 'Email';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  metrics: {
    messagesSent: number;
    responses: number;
    reactivatedCount: number;
    appointmentsBooked: number;
    revenueGenerated: number;
  };
  createdAt: string;
}

export type ReviewSentiment = 'positive' | 'neutral' | 'negative';
export type ReviewPlatform = 'Google' | 'Yelp' | 'Trustpilot' | 'Practo' | 'Facebook';

export interface CustomerReview {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  author: string;
  authorEmail?: string;
  rating: number; // 1 - 5
  platform: ReviewPlatform;
  reviewText: string;
  sentiment: ReviewSentiment;
  status: 'pending_approval' | 'published' | 'escalated_to_human';
  aiDraftedResponse: string;
  publishedResponse?: string;
  date: string;
  flaggedForEscalation?: boolean;
}

export interface ColdOutreachCampaign {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  name: string;
  targetSegment?: string;
  channel: 'Email' | 'SMS' | string;

  complianceStatus?: 'APPROVED' | 'REVIEW_REQUIRED' | 'BLOCKED' | string;
  legalBasis?: 'opt_in' | 'legitimate_business_inquiry' | 'prior_consent' | string;
  compliance?: {
    optInVerified?: boolean;
    unsubLinkPresent?: boolean;
    spamRiskScore?: number;
    gdprCompliant?: boolean;
    canSpamCompliant?: boolean;
    dailySendLimit?: number;
    optOutIncluded?: boolean;
    [key: string]: any;
  };

  unsubscribeIncluded?: boolean;
  totalRecipients?: number;
  sentCount?: number;
  openedCount?: number;
  repliedCount?: number;
  bouncedCount?: number;
  optOutCount?: number;
  metrics?: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
  };
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'active' | string;
  subject?: string;
  templateSubject?: string;
  bodyTemplate?: string;
  templateBody?: string;


  scheduledDate?: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalConversations: number;
  totalLeads: number;
  totalVoiceMinutes: number;
  avgResponseTimeSeconds: number;
  leadConversionRate: number;
  hotLeadsCount: number;
  resolvedWithoutHumanRate: number;
  callsHandled: number;
  missedCallsRecovered: number;
  aiResolvedCount?: number;
  humanHandoffCount?: number;
  leadsCapturedCount?: number;
  aiResolutionRate?: number;
  voiceUsage?: {
    usedMinutes: number;
    limitMinutes: number;
  };
  topQuestions?: Array<{ question: string; count: number }>;
}

export interface OnboardingStep {
  id?: string;
  key?: string;
  title: string;
  description: string;
  completed?: boolean;
  isCompleted?: boolean;
  actionTab?: string;
  actionText?: string;
}

export interface UsageAlertStatus {
  hasAlert?: boolean;
  alertLevel?: string;
  alertMessage?: string;
  alertType?: 'conversations' | 'voice_minutes' | 'quota_reached';
  percentageUsed?: number;
  message?: string;
}

export interface UnansweredQuestion {
  id: string;
  businessId?: string;
  question: string;
  count?: number;
  reason?: string;
  frequency?: number;
  lastAsked?: string;
  status?: 'pending' | 'resolved';
}


export type ConversationStatus = 
  | 'OPEN' 
  | 'AI_ACTIVE' 
  | 'HUMAN_REQUIRED' 
  | 'HUMAN_ACTIVE' 
  | 'RESOLVED';

export interface Message {
  id: string;
  conversationId?: string;
  tenant_id?: string;
  tenantId?: string;
  agentId?: string;
  sender: 'user' | 'agent' | 'human_support' | 'system';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
}

export interface Conversation {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  agentId?: string;
  businessId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: ConversationStatus;
  messages: Message[];
  leadCaptured: boolean;
  leadScore?: number;
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  type: 
    | 'hot_lead' 
    | 'new_lead'
    | 'missed_call' 
    | 'appointment_booked' 
    | 'negative_review' 
    | 'estimate_followup' 
    | 'human_escalation' 
    | 'campaign_reply' 
    | 'system';
  title: string;
  message: string;
  linkTab?: string;
  read?: boolean;
  timestamp?: string;
  createdAt: string;
}

export type AppNotification = NotificationItem;


export interface AuditLog {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  businessId: string;
  actorEmail: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
  user?: string;
  target?: string;
}

export type WidgetType = 
  | 'kpi_overview' 
  | 'leads_chart' 
  | 'calls_chart' 
  | 'conversion_funnel' 
  | 'pipeline_kanban' 
  | 'recent_leads' 
  | 'recent_calls' 
  | 'upcoming_appointments' 
  | 'followups_due' 
  | 'revenue_attribution' 
  | 'reviews_feed' 
  | 'ai_vs_human';

export interface DashboardWidgetConfig {
  id: string;
  widgetType: WidgetType;
  title: string;
  visible: boolean;
  order: number;
  size: 'sm' | 'md' | 'lg' | 'full';
}

export type IntegrationProvider = 
  | 'google_calendar' 
  | 'twilio_voice' 
  | 'twilio_sms' 
  | 'whatsapp_business' 
  | 'sendgrid_email' 
  | 'resend_email' 
  | 'gemini_ai' 
  | 'hubspot_crm' 
  | 'salesforce_crm' 
  | 'custom_webhook';

export interface IntegrationStatus {
  id: IntegrationProvider;
  name: string;
  category: 'Voice' | 'SMS' | 'WhatsApp' | 'Email' | 'Calendar' | 'AI' | 'CRM' | 'Webhooks';
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'DEMO_MODE';
  description: string;
  lastSync?: string;
  config?: Record<string, string>;
  tenantId?: string;
  businessId?: string;
}

// ----------------------------------------------------
// ENTERPRISE PRICING, PLANS & USAGE LIMITS ARCHITECTURE
// ----------------------------------------------------

export type PlanTierKey = 'starter' | 'growth' | 'enterprise' | 'enterprise_custom' | string;

export interface PlanUsageLimits {
  planId: string;
  voiceMinutes: number;
  smsMessages: number;
  whatsappConversations: number;
  emailMessages: number;
  aiUsage: number | string;
  contacts: number | string;
  teamMembers: number | string;
  knowledgeDocuments: number | string;
  storage: string;
  websites?: number | string;
  agents?: number | string;
  allowOverage?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  tagline?: string;
  positioning: string;
  description?: string;
  implementationFeeUSD: number;
  monthlyFeeUSD: number;
  implementationFeeINR: number;
  monthlyFeeINR: number;
  currency?: CurrencyCode;
  features: string[];
  usageLimits: PlanUsageLimits;
  isCustomPrice?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  isPublic?: boolean;
  badge?: string;
  ctaText: string;
  ctaType?: 'demo' | 'book_demo' | 'sales' | 'enterprise_sales';
  createdAt?: string;
  updatedAt?: string;
}

export interface UsageMetricItem {
  key: 'voice' | 'sms' | 'whatsapp' | 'email' | 'ai' | 'contacts' | 'team' | 'knowledge' | 'storage';
  label: string;
  unit: string;
  used: number;
  included: number | string;
  remaining: number | string;
  overage: number;
  percentage: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amount: number;
  currency: 'USD' | 'INR' | string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  pdfUrl?: string;
  invoiceType?: 'ONE_TIME_SETUP' | 'RECURRING_SUBSCRIPTION' | 'INITIAL_BUNDLE';
  setup_fee?: number;
  setup_tax?: number;
  subscription_fee?: number;
  subscription_tax?: number;
  total_amount?: number;
  tax_rate?: number;
}

export type PaymentProviderName = 'razorpay' | 'paypal' | string;

export interface SafePaymentMethod {
  id: string;
  businessId: string;
  provider: PaymentProviderName;
  providerPaymentMethodId: string;
  brand: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  expiry?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface BillingTransaction {
  id: string;
  businessId: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
  provider: PaymentProviderName;
  status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
  transactionId: string;
  type: 'implementation_fee' | 'subscription' | 'usage_overage' | 'initial_checkout';
  description: string;
}

export interface BillingInfo {
  businessId: string;
  planId: string;
  planName: string;
  provider?: PaymentProviderName;
  status: 'Active' | 'Trial' | 'Past Due' | 'Cancelled' | 'active' | 'trialing' | 'past_due' | 'paused' | 'cancelled';
  currency: CurrencyCode;
  implementationFee: number;
  implementationFeePaid?: boolean;
  monthlyFee: number;
  billingCycle: 'monthly';
  nextBillingDate: string;
  autoRenew?: boolean;
  paymentFailed?: boolean;
  paymentMethod: {
    id?: string;
    brand: string;
    last4: string;
    expiry: string;
    isDefault: boolean;
    provider?: PaymentProviderName;
  };
  paymentMethods?: SafePaymentMethod[];
  transactions?: BillingTransaction[];
  usage: {
    voice: { used: number; included: number; unit: string };
    sms: { used: number; included: number; unit: string };
    whatsapp: { used: number; included: number; unit: string };
    email: { used: number; included: number; unit: string };
    ai: { used: number; included: number; unit: string };
    contacts: { used: number; included: number; unit: string };
    storage: { used: number; included: number; unit: string };
  };
  invoices: InvoiceItem[];
}

// ----------------------------------------------------
// PRODUCTION SAAS BILLING & PAYMENT SPECIFICATION
// ----------------------------------------------------

export type PaymentStatus = 
  | 'PENDING' 
  | 'AUTHORIZED' 
  | 'CAPTURED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'REFUNDED';

export type SubscriptionStatus = 
  | 'PENDING_PAYMENT' 
  | 'ACTIVE' 
  | 'PAST_DUE' 
  | 'CANCELLED' 
  | 'EXPIRED';

export interface PlanPriceRecord {
  id: string; // e.g. 'price_starter_INR'
  plan_id: string;
  currency: CurrencyCode;
  setup_fee: number;
  monthly_fee: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformCurrencyRecord {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  enabled: boolean;
  isDefault: boolean;
  countryCode: string;
  countryName: string;
  supportedProviders: string[];
  providerStatus?: 'Connected' | 'Configuration Required' | 'Authentication Failed' | 'Unavailable' | 'Error';
  currencyStatus?: 'Enabled' | 'Disabled for checkout';
  checkoutAvailability?: 'Available' | 'Unavailable';
}

export interface PaymentAuditLogEntry {
  id: string;
  timestamp: string;
  action: 
    | 'order_created' 
    | 'payment_attempted' 
    | 'payment_method_selected' 
    | 'payment_verified' 
    | 'payment_captured' 
    | 'webhook_received' 
    | 'tenant_activated' 
    | 'payment_failed' 
    | 'payment_cancelled' 
    | 'refund_processed';
  tenantId: string;
  businessName?: string;
  customerEmail: string;
  provider: 'razorpay' | 'paypal' | string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amount?: number;
  currency?: CurrencyCode;
  status: string;
  method?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  tenantId?: string;
  plan: string;
  amount: number;
  currency: CurrencyCode;
  base_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  final_amount?: number;
  payment_provider?: 'razorpay' | string;
  provider?: 'razorpay' | string;
  provider_order_id?: string;
  provider_payment_id?: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  customer_id?: string;
  plan_id?: string;
  coupon_id?: string;
  status: PaymentStatus;
  failureReason?: string;
  
  // Explicit separated billing components
  setup_fee?: number;
  setup_discount?: number;
  setup_tax?: number;
  subscription_fee?: number;
  subscription_discount?: number;
  subscription_tax?: number;
  recurring_base_amount?: number;
  recurring_tax_amount?: number;
  recurring_total_amount?: number;
  tax_rate?: number;
  subscription_tax_rate?: number;
  setup_tax_rate?: number;

  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  tenantId: string;
  plan: string;
  status: SubscriptionStatus;
  billingInterval: 'monthly';
  amount: number;
  currency: CurrencyCode;
  monthly_price?: number;
  monthlyPrice?: number;
  baseAmount?: number;
  base_amount?: number;
  taxAmount?: number;
  tax_amount?: number;
  taxRate?: number;
  final_amount?: number;
  setupPayment?: 'ONE_TIME';
  subscriptionType?: 'RECURRING';
  provider?: PaymentProviderName;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export enum PaymentLifecycleState {
  IDLE = 'IDLE',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_VERIFIED = 'PAYMENT_VERIFIED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
  TENANT_PROVISIONED = 'TENANT_PROVISIONED'
}

export interface BillingAddressDetails {
  businessLegalName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstin?: string;
}

export interface TaxConfiguration {
  enabled: boolean;
  registration_status: 'NOT_REGISTERED' | 'REGISTERED';
  gstin: string | null;
  default_rate: number;          // e.g. 0 or 0.18
  tax_name: string;              // 'GST'
  effective_from: string | null; // e.g. '2026-09-12' or null
  subscription_tax_rate: number; // e.g. 0.00 when disabled, or 0.18
  setup_tax_rate: number;        // e.g. 0.00
  tax_label: string;             // e.g. 'GST Disabled (Non-Registered)'
  tax_disclaimer: string;        // Editable tax disclaimer
  rule_summary?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PlatformPromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'monthly' | 'setup' | 'all' | 'first_month' | 'recurring';
  currency?: CurrencyCode; // Specified for fixed-value discounts to ensure currency isolation
  tenantId?: string;
  customerEmail?: string;
  planId?: string;
  expiryDate?: string;
  usageLimit?: number;
  usageCount: number;
  minOrderValue?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  currency?: CurrencyCode;
  appliesTo?: 'monthly' | 'setup' | 'all' | 'first_month' | 'recurring';
  message?: string;
}

export interface OrderCalculationResult {
  planId: string;
  planName: string;
  currency: CurrencyCode;
  
  // Mandatory separate fields:
  setup_fee: number;
  setup_discount: number;
  setup_tax: number;
  setup_fee_tax: number;
  setup_total: number;
  
  subscription_fee: number;
  subscription_discount: number;
  subscription_tax: number;
  subscription_total: number;
  
  discount: number;
  total_due_today: number;
  
  recurring_base_amount: number;
  recurring_tax_amount: number;
  recurring_total_amount: number;
  
  subscription_tax_rate: number;
  setup_tax_rate: number;
  tax_rate: number;
  taxRate?: number;
  
  // Compatible legacy aliases:
  monthlyFee: number;
  setupFee: number;
  subtotal: number;
  couponCode: string | null;
  couponDescription: string | null;
  discountAmount: number;
  couponError: string | null;
  taxAmount: number;
  taxLabel: string;
  tax_enabled: boolean;
  taxEnabled: boolean;
  tax_registration_status: 'NOT_REGISTERED' | 'REGISTERED';
  recurringAmount: number;
  totalDueToday: number;
  gstin: string | null;
  taxDisclaimer?: string;
}

export interface PendingSignup {
  id: string;
  tenantId: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planId: 'starter' | 'growth' | 'scale' | string;
  planName: string;
  currency: CurrencyCode;
  display_currency?: CurrencyCode;
  display_amount?: number;
  payment_currency?: CurrencyCode;
  payment_amount?: number;
  
  // Explicit separated amounts
  setup_fee?: number;
  setup_discount?: number;
  setup_tax?: number;
  setup_fee_tax?: number;
  setup_total?: number;
  subscription_fee?: number;
  subscription_discount?: number;
  subscription_tax?: number;
  subscription_total?: number;
  total_due_today: number;
  totalDueToday?: number;
  base_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  final_amount?: number;
  recurring_base_amount?: number;
  recurring_tax_amount?: number;
  recurring_total_amount?: number;
  tax_rate?: number;
  taxRate?: number;
  subscription_tax_rate?: number;
  setup_tax_rate?: number;

  monthlyFee: number;
  setupFee: number;
  subtotal?: number;
  couponCode?: string | null;
  couponDescription?: string | null;
  discountAmount?: number;
  taxAmount?: number;
  taxLabel?: string;
  payment_provider?: 'razorpay' | string;
  provider?: 'razorpay' | string;
  provider_order_id?: string;
  provider_payment_id?: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'PENDING' | 'CANCELLED' | 'FAILED' | 'VERIFYING' | 'ACTIVATED' | PaymentLifecycleState;
  failureReason?: string;
  billingAddress?: BillingAddressDetails;
  provisioningFailed?: boolean;
  provisioningError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailablePaymentMethodItem {
  id: string;
  name: string;
  category: 'upi' | 'qr' | 'cards' | 'netbanking' | 'wallets' | 'card' | string;
  description?: string;
  popular?: boolean;
}

export interface AvailablePaymentMethodsResponse {
  success: boolean;
  currency: CurrencyCode;
  country?: string;
  planId?: string;
  isPaymentAvailable: boolean;
  provider: 'razorpay' | string | null;
  providerName?: string;
  providerLabel?: string;
  providerStatus?: string;
  checkoutAvailability?: string;
  methods: AvailablePaymentMethodItem[];
  unavailableMessage?: string;
  allowsINRFallback: boolean;
  inrFallback?: {
    paymentCurrency: 'INR';
    provider: 'razorpay';
    providerName: string;
    providerLabel: string;
    methods: AvailablePaymentMethodItem[];
    notice: string;
  };
}

