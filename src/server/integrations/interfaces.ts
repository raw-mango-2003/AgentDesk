// Central Integration Architecture Interfaces for AgentDesk Production SaaS

export type IntegrationEnvironment = 'development' | 'staging' | 'production';

// ----------------------------------------------------
// 1. EMAIL SERVICE INTERFACE
// ----------------------------------------------------
export type EmailTemplateName =
  // Authentication
  | 'verify_email'
  | 'welcome'
  | 'password_reset'
  | 'password_changed'
  | 'email_changed'
  | 'new_login'
  | 'suspicious_login'
  | 'account_locked'
  | 'account_unlocked'
  | 'session_revoked'
  // Business Owner
  | 'business_account_created'
  | 'business_account_setup'
  | 'first_login'
  | 'temporary_credential_setup'
  | 'business_owner_invited'
  | 'business_owner_role_changed'
  | 'business_owner_removed'
  // Payments
  | 'payment_initiated'
  | 'payment_successful'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_refund'
  | 'payment_receipt'
  | 'invoice_generated'
  // Subscription
  | 'subscription_activated'
  | 'subscription_renewal'
  | 'subscription_payment_successful'
  | 'subscription_payment_failed'
  | 'subscription_past_due'
  | 'subscription_cancelled'
  | 'subscription_paused'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_upgrade'
  | 'subscription_downgrade'
  // Account
  | 'account_suspended'
  | 'account_restored'
  | 'account_deleted'
  | 'account_deletion_requested'
  | 'account_export_ready'
  // Security
  | '2fa_enabled'
  | '2fa_disabled'
  | 'recovery_method_changed'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'new_device_login'
  | 'admin_credential_changed';

export interface EmailDeliveryRecord {
  id: string;
  userId?: string;
  tenantId?: string;
  eventType: string;
  recipient: string;
  subject: string;
  provider: 'gmail' | 'resend' | 'brevo' | 'system';
  providerMessageId?: string;
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED';
  attemptCount: number;
  sentAt?: string;
  failedAt?: string;
  error?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: EmailTemplateName | string;
  eventType?: string;
  userId?: string;
  tenantId?: string;
  replyTo?: string;
  metadata?: Record<string, any>;
}

export interface IEmailService {
  isConfigured(): boolean;
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED'; messageId?: string; error?: string }>;
  sendTemplate(
    template: EmailTemplateName,
    to: string,
    data: Record<string, any>,
    options?: { userId?: string; tenantId?: string; eventType?: string; replyTo?: string }
  ): Promise<{ success: boolean; status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED'; messageId?: string; error?: string }>;
  getDeliveryLogs(filter?: { tenantId?: string; recipient?: string; limit?: number }): EmailDeliveryRecord[];
}

// ----------------------------------------------------
// 2. SMS SERVICE INTERFACE
// ----------------------------------------------------
export interface ISMSService {
  isConfigured(): boolean;
  sendSMS(to: string, message: string, tenantId?: string): Promise<{ success: boolean; sid?: string; error?: string }>;
  verifyPhone(phone: string): boolean;
}

// ----------------------------------------------------
// 3. OTP SERVICE (TWILIO VERIFY)
// ----------------------------------------------------
export interface IOTPService {
  isConfigured(): boolean;
  sendOTP(identifier: string, channel?: 'sms' | 'email'): Promise<{ success: boolean; error?: string; status?: string }>;
  verifyOTP(identifier: string, code: string): Promise<{ success: boolean; error?: string }>;
}

// ----------------------------------------------------
// 4. PUSH NOTIFICATION SERVICE (FIREBASE FCM)
// ----------------------------------------------------
export interface PushDeviceToken {
  userId: string;
  tenantId?: string;
  token: string;
  platform: 'web' | 'mobile';
  userAgent?: string;
  registeredAt: string;
  lastUsedAt: string;
}

export interface IPushNotificationService {
  isConfigured(): boolean;
  registerToken(userId: string, token: string, tenantId?: string, userAgent?: string): Promise<boolean>;
  removeToken(token: string): Promise<boolean>;
  removeUserTokens(userId: string): Promise<void>;
  sendPush(userId: string, title: string, body: string, data?: Record<string, string>): Promise<{ success: boolean; sentCount: number }>;
}

// ----------------------------------------------------
// 5. WHATSAPP BUSINESS SERVICE
// ----------------------------------------------------
export interface IWhatsAppService {
  isConfigured(): boolean;
  sendWhatsAppMessage(toPhone: string, message: string, tenantId?: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendTemplateMessage(toPhone: string, templateName: string, parameters: string[], tenantId?: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  recordConsent(phone: string, optedIn: boolean): void;
  hasConsent(phone: string): boolean;
}

// ----------------------------------------------------
// 6. PAYMENT SERVICE (RAZORPAY)
// ----------------------------------------------------
export interface CreateOrderParams {
  amount: number;
  currency: 'USD' | 'INR' | 'GBP';
  receipt: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface IPaymentService {
  isConfigured(): boolean;
  createOrder(params: CreateOrderParams): Promise<{ success: boolean; orderId?: string; amount?: number; currency?: string; error?: string }>;
  verifySignature(params: VerifyPaymentParams): boolean;
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean;
  refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }>;
}

// ----------------------------------------------------
// 7. SUBSCRIPTION SERVICE
// ----------------------------------------------------
export interface ISubscriptionService {
  createSubscription(planId: string, customerEmail: string, tenantId: string): Promise<{ success: boolean; subscriptionId?: string; error?: string }>;
  cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }>;
  pauseSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }>;
  resumeSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }>;
  handleWebhookEvent(event: string, payload: any): Promise<{ handled: boolean; action?: string }>;
}

// ----------------------------------------------------
// 8. PRODUCT ANALYTICS SERVICE (POSTHOG)
// ----------------------------------------------------
export type AnalyticsEventName =
  | 'user_signed_up'
  | 'email_verified'
  | 'login_success'
  | 'login_success_2fa'
  | 'platform_admin_login'
  | 'login_failed'
  | 'logout'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'business_created'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'checkout_started'
  | 'payment_success'
  | 'payment_failed'
  | 'subscription_started'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  | 'dashboard_viewed'
  | 'integration_connected'
  | 'workflow_created'
  | 'workflow_run'
  | 'message_sent'
  | 'email_sent'
  | 'notification_sent';

export interface IAnalyticsService {
  isConfigured(): boolean;
  track(event: AnalyticsEventName, properties?: Record<string, any>, distinctId?: string): Promise<void>;
  identify(distinctId: string, traits?: Record<string, any>): Promise<void>;
  isFeatureEnabled(featureKey: string, distinctId?: string, tenantId?: string): Promise<boolean>;
}

// ----------------------------------------------------
// 9. ERROR MONITORING SERVICE (SENTRY)
// ----------------------------------------------------
export interface IErrorMonitoringService {
  isConfigured(): boolean;
  captureException(error: Error | any, context?: Record<string, any>): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>): void;
  setUserContext(user: { id?: string; email?: string; tenantId?: string; role?: string } | null): void;
}

// ----------------------------------------------------
// 10. FILE STORAGE SERVICE (S3 COMPATIBLE)
// ----------------------------------------------------
export interface StorageUploadOptions {
  filename: string;
  contentType: string;
  tenantId: string;
  isPrivate?: boolean;
}

export interface IStorageService {
  isConfigured(): boolean;
  uploadFile(buffer: Buffer, options: StorageUploadOptions): Promise<{ success: boolean; fileKey?: string; url?: string; error?: string }>;
  getSignedDownloadUrl(fileKey: string, expiresInSeconds?: number): Promise<{ success: boolean; signedUrl?: string; error?: string }>;
  deleteFile(fileKey: string): Promise<boolean>;
  validateFile(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string };
}

// ----------------------------------------------------
// 11. AUDIT LOG SERVICE
// ----------------------------------------------------
export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  tenantId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface IAuditLogService {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry;
  query(filter?: {
    tenantId?: string;
    actorEmail?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): AuditLogEntry[];
}

// ----------------------------------------------------
// 12. NOTIFICATION DATABASE & DISPATCHER
// ----------------------------------------------------
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'whatsapp';
export type NotificationCategory = 'security' | 'billing' | 'product' | 'marketing' | 'leads';

export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  securityNotifications: boolean; // Always true, not toggleable off
  billingNotifications: boolean;
  productNotifications: boolean;
  marketingNotifications: boolean;
  updatedAt: string;
}

export interface SystemNotification {
  id: string;
  tenantId?: string;
  userId?: string;
  type: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  title: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  readAt?: string;
  sentAt?: string;
  failedAt?: string;
  providerMessageId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type EventTrigger =
  | 'USER_CREATED'
  | 'EMAIL_VERIFICATION_REQUESTED'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'NEW_LOGIN'
  | 'SUSPICIOUS_LOGIN'
  | 'BUSINESS_CREATED'
  | 'BUSINESS_OWNER_INVITED'
  | 'ACCOUNT_SETUP_REQUESTED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_RENEWAL'
  | 'SUBSCRIPTION_PAYMENT_FAILED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_RESUMED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_RESTORED'
  | 'ACCOUNT_DELETED'
  | 'ADMIN_CREDENTIAL_CREATED'
  | 'ADMIN_CREDENTIAL_CHANGED'
  | '2FA_ENABLED'
  | '2FA_DISABLED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'NEW_LEAD_RECEIVED'
  | 'APPOINTMENT_BOOKED'
  | 'MISSED_CALL_DETECTED';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  eventTrigger: EventTrigger;
  channel: 'GMAIL' | 'IN_APP' | 'SMS' | 'PUSH' | 'MULTI_CHANNEL';
  emailTemplate?: EmailTemplateName | string;
  status: 'ACTIVE' | 'PAUSED';
  lastRun?: string;
  successCount: number;
  failedCount: number;
  retryCount: number;
  createdAt: string;
}

export interface AutomationDispatchResult {
  eventId: string;
  event: EventTrigger;
  idempotencyKey: string;
  status: 'EXECUTED' | 'SKIPPED_DUPLICATE' | 'PAUSED' | 'FAILED';
  matchedRules?: number;
  executedRules?: number;
  skippedDuplicates?: number;
  deliveryStatus?: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED';
  messageId?: string;
  error?: string;
}

export interface IAutomationEngine {
  emit(event: EventTrigger, payload: Record<string, any>): Promise<AutomationDispatchResult>;
  getAutomations(): AutomationRule[];
  toggleAutomation(id: string, active?: boolean): AutomationRule | null;
  getAutomationStats(): {
    totalAutomations: number;
    activeAutomations: number;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    retriedRuns: number;
  };
}

export interface INotificationService {
  dispatchEvent(event: EventTrigger, payload: Record<string, any>): Promise<void>;
  getUserNotifications(userId: string, filter?: { unreadOnly?: boolean; limit?: number }): SystemNotification[];
  markAsRead(notificationId: string, userId: string): boolean;
  markAllAsRead(userId: string): number;
  getUserPreferences(userId: string): UserNotificationPreferences;
  updateUserPreferences(userId: string, prefs: Partial<UserNotificationPreferences>): UserNotificationPreferences;
}

// ----------------------------------------------------
// 13. BACKGROUND QUEUE / JOB SYSTEM
// ----------------------------------------------------
export type JobType =
  | 'send_email'
  | 'send_sms'
  | 'send_push'
  | 'send_whatsapp'
  | 'process_payment_webhook'
  | 'process_subscription_event'
  | 'generate_invoice'
  | 'generate_export'
  | 'cleanup_expired_tokens'
  | 'cleanup_sessions'
  | 'send_reminders';

export interface QueueJob {
  id: string;
  type: JobType;
  payload: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
}

export interface IQueueService {
  enqueue(type: JobType, payload: any, options?: { maxAttempts?: number; delayMs?: number }): Promise<QueueJob>;
  getJobs(status?: QueueJob['status'], limit?: number): QueueJob[];
  getJob(id: string): QueueJob | undefined;
  retryJob(id: string): Promise<boolean>;
}

export interface IntegrationRecord {
  id: string;
  provider: 'GOOGLE' | string;
  type: 'GMAIL' | string;
  accountEmail: string;
  encryptedRefreshToken: string;
  encryptedClientId?: string;
  encryptedClientSecret?: string;
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'REAUTHORIZATION_REQUIRED';
  connectedAt?: string;
  lastSuccessfulSendAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}
