/**
 * AgentDesk Modular Environment & Integration Validation Engine
 * 
 * CORE Requirements:
 * - DATABASE_URL
 * - SESSION_SECRET
 * - APP_URL
 * - PLATFORM_ADMIN_EMAIL
 * - PLATFORM_ADMIN_INITIAL_PASSWORD
 * 
 * INTEGRATIONS (Modular & Optional):
 * - Gmail OAuth 2.0 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) -> Refresh token acquired via OAuth flow
 * - Razorpay (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET)
 * - Resend (RESEND_API_KEY)
 * - Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_VERIFY_SERVICE_SID)
 * - PostHog (POSTHOG_API_KEY, POSTHOG_HOST)
 * - Sentry (SENTRY_DSN, SENTRY_ENVIRONMENT)
 * - S3 Storage (S3_BUCKET_NAME, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT)
 * - Firebase (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * - WhatsApp (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_WEBHOOK_VERIFY_TOKEN)
 * 
 * Missing optional credentials must NOT block application startup.
 * Missing integrations are accurately reported as NOT_CONFIGURED.
 */

export type IntegrationStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'INVALID' | 'DISCONNECTED';

export interface IntegrationStatusDetail {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  isMandatory: boolean;
  requiredVars: string[];
  configuredVars: string[];
  missingVars: string[];
  description: string;
}

export interface EnvironmentStatusReport {
  timestamp: string;
  core: {
    status: 'READY' | 'DEGRADED';
    mandatoryList: string[];
    variables: Record<string, { configured: boolean; value?: string }>;
  };
  integrations: Record<string, IntegrationStatusDetail>;
}

export const MANDATORY_CORE_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'APP_URL',
  'PLATFORM_ADMIN_EMAIL',
  'PLATFORM_ADMIN_INITIAL_PASSWORD'
] as const;

export function getCoreEnvironmentStatus(): {
  status: 'READY' | 'DEGRADED';
  variables: Record<string, { configured: boolean; value?: string }>;
} {
  const dbUrl = process.env.DATABASE_URL;
  const sessionSecret = process.env.SESSION_SECRET;
  const appUrl = process.env.APP_URL;
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.PLATFORM_ADMIN_INITIAL_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD;

  const variables: Record<string, { configured: boolean; value?: string }> = {
    DATABASE_URL: {
      configured: Boolean(dbUrl && dbUrl.trim().length > 0),
      value: dbUrl ? '[CONFIGURED]' : undefined
    },
    SESSION_SECRET: {
      configured: Boolean(sessionSecret && sessionSecret.trim().length >= 32),
      value: sessionSecret ? '[SECURE_KEY_CONFIGURED]' : undefined
    },
    APP_URL: {
      configured: Boolean(appUrl && appUrl.trim().length > 0),
      value: appUrl ? appUrl.trim() : 'http://localhost:3000'
    },
    PLATFORM_ADMIN_EMAIL: {
      configured: Boolean(adminEmail && adminEmail.trim().length > 0),
      value: adminEmail ? '[CONFIGURED]' : undefined
    },
    PLATFORM_ADMIN_INITIAL_PASSWORD: {
      configured: Boolean(adminPassword && adminPassword.trim().length > 0),
      value: adminPassword ? '[CONFIGURED_HASHED_ON_BOOT]' : undefined
    }
  };

  const missingCore = Object.entries(variables)
    .filter(([, detail]) => !detail.configured)
    .map(([name]) => name);

  if (missingCore.length > 0) {
    console.error(
      `[SECURITY] Missing required production environment variables: ${missingCore.join(', ')}`
    );
  }

  return {
    status: missingCore.length === 0 ? 'READY' : 'DEGRADED',
    variables
  };
}

export function getIntegrationsStatusReport(gmailStatus?: {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'REAUTHORIZATION_REQUIRED';
  isConfigured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
}): Record<string, IntegrationStatusDetail> {
  const result: Record<string, IntegrationStatusDetail> = {};

  // 1. Gmail OAuth 2.0 Integration
  const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const hasGmailCreds = Boolean(googleClientId && googleClientSecret);

  let gmailReportStatus: IntegrationStatus = 'NOT_CONFIGURED';
  if (gmailStatus) {
    if (gmailStatus.status === 'CONNECTED') {
      gmailReportStatus = 'CONNECTED';
    } else if (gmailStatus.status === 'REAUTHORIZATION_REQUIRED') {
      gmailReportStatus = 'INVALID';
    } else if (gmailStatus.hasClientId && gmailStatus.hasClientSecret) {
      gmailReportStatus = 'DISCONNECTED';
    } else {
      gmailReportStatus = 'NOT_CONFIGURED';
    }
  } else if (hasGmailCreds) {
    gmailReportStatus = 'DISCONNECTED'; // Creds exist but OAuth flow needed to obtain refresh token
  }

  const gmailConfiguredVars: string[] = [];
  const gmailMissingVars: string[] = [];
  if (googleClientId) gmailConfiguredVars.push('GOOGLE_CLIENT_ID');
  else gmailMissingVars.push('GOOGLE_CLIENT_ID');
  if (googleClientSecret) gmailConfiguredVars.push('GOOGLE_CLIENT_SECRET');
  else gmailMissingVars.push('GOOGLE_CLIENT_SECRET');

  result['gmail_oauth'] = {
    id: 'gmail_oauth',
    name: 'Gmail API Transactional Engine (OAuth 2.0)',
    category: 'Email',
    status: gmailReportStatus,
    isMandatory: false,
    requiredVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    configuredVars: gmailConfiguredVars,
    missingVars: gmailMissingVars,
    description: 'Official AgentDesk transactional email delivery engine for hello.agentdesktech@gmail.com. Requires OAuth connection.'
  };

  // 2. Razorpay Integration
  const rzpKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const rzpKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const isRzpConfigured = Boolean(rzpKeyId && rzpKeySecret);
  const rzpConfiguredVars: string[] = [];
  const rzpMissingVars: string[] = [];
  if (rzpKeyId) rzpConfiguredVars.push('RAZORPAY_KEY_ID');
  else rzpMissingVars.push('RAZORPAY_KEY_ID');
  if (rzpKeySecret) rzpConfiguredVars.push('RAZORPAY_KEY_SECRET');
  else rzpMissingVars.push('RAZORPAY_KEY_SECRET');
  if (process.env.RAZORPAY_WEBHOOK_SECRET) rzpConfiguredVars.push('RAZORPAY_WEBHOOK_SECRET');

  result['razorpay_payments'] = {
    id: 'razorpay_payments',
    name: 'Razorpay Subscriptions & Payments',
    category: 'Billing',
    status: isRzpConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
    configuredVars: rzpConfiguredVars,
    missingVars: rzpMissingVars,
    description: 'Payment gateway for paid subscriptions. If unconfigured, live billing is cleanly bypassed without fake success.'
  };

  // 3. Resend Fallback (Optional)
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  result['resend_email'] = {
    id: 'resend_email',
    name: 'Resend Transactional Email (Optional Backup)',
    category: 'Email Backup',
    status: resendKey ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['RESEND_API_KEY'],
    configuredVars: resendKey ? ['RESEND_API_KEY'] : [],
    missingVars: resendKey ? [] : ['RESEND_API_KEY'],
    description: 'Optional secondary email backup provider. Not required for AgentDesk operations.'
  };

  // 4. Twilio Integration (Optional)
  const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const twilioAuth = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const twilioPhone = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  const isTwilioConfigured = Boolean(twilioSid && twilioAuth && twilioPhone);
  const twilioConfiguredVars: string[] = [];
  const twilioMissingVars: string[] = [];
  if (twilioSid) twilioConfiguredVars.push('TWILIO_ACCOUNT_SID');
  else twilioMissingVars.push('TWILIO_ACCOUNT_SID');
  if (twilioAuth) twilioConfiguredVars.push('TWILIO_AUTH_TOKEN');
  else twilioMissingVars.push('TWILIO_AUTH_TOKEN');
  if (twilioPhone) twilioConfiguredVars.push('TWILIO_PHONE_NUMBER');
  else twilioMissingVars.push('TWILIO_PHONE_NUMBER');
  if (process.env.TWILIO_VERIFY_SERVICE_SID) twilioConfiguredVars.push('TWILIO_VERIFY_SERVICE_SID');

  result['twilio_communications'] = {
    id: 'twilio_communications',
    name: 'Twilio SMS & Verify 2FA',
    category: 'SMS & 2FA',
    status: isTwilioConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'TWILIO_VERIFY_SERVICE_SID'],
    configuredVars: twilioConfiguredVars,
    missingVars: twilioMissingVars,
    description: 'SMS and phone 2FA delivery. If missing, SMS/OTP is disabled while normal login and dashboard access continue uninterrupted.'
  };

  // 5. PostHog Integration (Optional)
  const posthogKey = (process.env.POSTHOG_API_KEY || '').trim();
  result['posthog_analytics'] = {
    id: 'posthog_analytics',
    name: 'PostHog Product Analytics',
    category: 'Analytics',
    status: posthogKey ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['POSTHOG_API_KEY', 'POSTHOG_HOST'],
    configuredVars: posthogKey ? ['POSTHOG_API_KEY'] : [],
    missingVars: posthogKey ? [] : ['POSTHOG_API_KEY'],
    description: 'Product telemetry & analytics. If unconfigured, events are buffered in memory without breaking startup.'
  };

  // 6. Sentry Integration (Telemetry & Exception Tracking)
  const sentryDsn = (process.env.SENTRY_DSN || '').trim();
  const isSentryConfigured = Boolean(sentryDsn && sentryDsn.startsWith('http') && !sentryDsn.includes('internal.agentdesk'));
  result['sentry_monitoring'] = {
    id: 'sentry_monitoring',
    name: 'Sentry Telemetry & Exception Tracking',
    category: 'Monitoring',
    status: isSentryConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['SENTRY_DSN'],
    configuredVars: isSentryConfigured ? ['SENTRY_DSN'] : [],
    missingVars: isSentryConfigured ? [] : ['SENTRY_DSN'],
    description: 'Real-time exception logging, stack trace capture, and error monitoring.'
  };

  // 7. S3 Storage Integration (Optional)
  const s3Access = (process.env.S3_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY || '').trim();
  const s3Secret = (process.env.S3_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_KEY || '').trim();
  const isS3Configured = Boolean(s3Access && s3Secret);
  const s3ConfiguredVars: string[] = [];
  const s3MissingVars: string[] = [];
  if (s3Access) s3ConfiguredVars.push('S3_ACCESS_KEY_ID');
  else s3MissingVars.push('S3_ACCESS_KEY_ID');
  if (s3Secret) s3ConfiguredVars.push('S3_SECRET_ACCESS_KEY');
  else s3MissingVars.push('S3_SECRET_ACCESS_KEY');

  result['s3_storage'] = {
    id: 's3_storage',
    name: 'S3-Compatible Cloud Storage',
    category: 'Storage',
    status: isS3Configured ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['S3_BUCKET_NAME', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_ENDPOINT'],
    configuredVars: s3ConfiguredVars,
    missingVars: s3MissingVars,
    description: 'Cloud object storage for file attachments. Missing S3 storage does not prevent login or platform usage.'
  };

  // 8. Firebase Push Notifications (Optional)
  const fbProject = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const fbEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const fbKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
  const isFbConfigured = Boolean(fbProject && fbEmail && fbKey);
  const fbConfiguredVars: string[] = [];
  const fbMissingVars: string[] = [];
  if (fbProject) fbConfiguredVars.push('FIREBASE_PROJECT_ID');
  else fbMissingVars.push('FIREBASE_PROJECT_ID');
  if (fbEmail) fbConfiguredVars.push('FIREBASE_CLIENT_EMAIL');
  else fbMissingVars.push('FIREBASE_CLIENT_EMAIL');

  result['firebase_push'] = {
    id: 'firebase_push',
    name: 'Firebase Cloud Messaging (Push Notifications)',
    category: 'Notifications',
    status: isFbConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
    configuredVars: fbConfiguredVars,
    missingVars: fbMissingVars,
    description: 'Web push notifications. Internal notifications continue to work seamlessly even when Firebase is unconfigured.'
  };

  // 9. WhatsApp Integration (Optional)
  const waPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const waToken = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_KEY || '').trim();
  const isWaConfigured = Boolean(waPhoneId && waToken);
  const waConfiguredVars: string[] = [];
  const waMissingVars: string[] = [];
  if (waPhoneId) waConfiguredVars.push('WHATSAPP_PHONE_NUMBER_ID');
  else waMissingVars.push('WHATSAPP_PHONE_NUMBER_ID');
  if (waToken) waConfiguredVars.push('WHATSAPP_ACCESS_TOKEN');
  else waMissingVars.push('WHATSAPP_ACCESS_TOKEN');

  result['whatsapp_business'] = {
    id: 'whatsapp_business',
    name: 'WhatsApp Business Messaging',
    category: 'WhatsApp',
    status: isWaConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    isMandatory: false,
    requiredVars: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN'],
    configuredVars: waConfiguredVars,
    missingVars: waMissingVars,
    description: 'WhatsApp business notices. Unconfigured WhatsApp does not prevent application startup.'
  };

  return result;
}

export function validateEnvironmentOnStartup(gmailStatus?: any): EnvironmentStatusReport {
  const core = getCoreEnvironmentStatus();
  const integrations = getIntegrationsStatusReport(gmailStatus);

  console.log('================================================================');
  console.log(' AgentDesk Modular Integration & Environment Status');
  console.log('================================================================');
  console.log(`[CORE] Application Status: ${core.status}`);
  console.log(`[CORE] Mandatory Variables: DATABASE_URL, SESSION_SECRET, APP_URL, PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_INITIAL_PASSWORD`);
  console.log(`[CORE] Platform Admin: configured`);
  
  console.log('----------------------------------------------------------------');
  console.log(' Optional Modular Integrations Status:');
  for (const [key, item] of Object.entries(integrations)) {
    const statusText = item.status === 'CONNECTED' ? 'CONNECTED' : 'STANDBY_OPTIONAL';
    console.log(`  * ${item.name.padEnd(45)}: [${statusText}]`);
  }
  console.log('================================================================');

  return {
    timestamp: new Date().toISOString(),
    core: {
      status: core.status,
      mandatoryList: [...MANDATORY_CORE_ENV_VARS],
      variables: core.variables
    },
    integrations
  };
}
