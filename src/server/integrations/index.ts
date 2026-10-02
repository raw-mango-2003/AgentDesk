import { GmailService } from './gmailService.js';
import { EmailService } from './emailService.js';
import { SMSService } from './smsService.js';
import { OTPService } from './otpService.js';
import { PushNotificationService } from './pushNotificationService.js';
import { WhatsAppService } from './whatsAppService.js';
import { PaymentService } from './paymentService.js';
import { SubscriptionService } from './subscriptionService.js';
import { AnalyticsService } from './analyticsService.js';
import { ErrorMonitoringService } from './errorMonitoringService.js';
import { StorageService } from './storageService.js';
import { AuditLogService } from './auditLogService.js';
import { queueService } from './queueService.js';
import { NotificationService } from './notificationService.js';
import { AutomationEngine } from './automationEngine.js';
import { deliveryLogService } from './deliveryLogService.js';
import { deliverLeadToSpreadsheet, syncLeadToSpreadsheet } from './leadSyncService.js';

// Central singletons
export const gmailService = new GmailService();
export const emailService = new EmailService(gmailService);
export const smsService = new SMSService();
export const otpService = new OTPService();
export const pushService = new PushNotificationService();
export const whatsAppService = new WhatsAppService();
export const paymentService = new PaymentService();
export const subscriptionService = new SubscriptionService();
export const analyticsService = new AnalyticsService();
export const errorMonitoringService = new ErrorMonitoringService();
export const storageService = new StorageService();
export const auditLogService = new AuditLogService();

export { queueService };

export const notificationService = new NotificationService(
  emailService,
  smsService,
  pushService,
  whatsAppService,
  analyticsService,
  auditLogService
);

export { deliveryLogService };

export const automationEngine = new AutomationEngine(
  notificationService,
  queueService,
  auditLogService
);

// Register background job workers
queueService.registerHandler('send_email', async (payload: any) => {
  if (payload.template) {
    await emailService.sendTemplate(payload.template, payload.to, payload.data, payload.options);
  } else {
    await emailService.sendEmail(payload);
  }
});

queueService.registerHandler('send_sms', async (payload: any) => {
  await smsService.sendSMS(payload.to, payload.message, payload.tenantId);
});

queueService.registerHandler('send_push', async (payload: any) => {
  await pushService.sendPush(payload.userId, payload.title, payload.body, payload.data);
});

queueService.registerHandler('send_whatsapp', async (payload: any) => {
  await whatsAppService.sendWhatsAppMessage(payload.to, payload.message, payload.tenantId);
});

// Lead spreadsheet delivery retries use the same durable queue. The worker
// calls the delivery function directly so a failed retry does not enqueue a
// second retry job recursively.
queueService.registerHandler('sync_lead_spreadsheet' as any, async (payload: any) => {
  const result = await deliverLeadToSpreadsheet(payload.lead || {}, payload.business || {}, payload.conversation);
  if (!result.delivered) {
    throw new Error(result.error || 'Lead spreadsheet delivery failed.');
  }
});

export * from './interfaces.js';
export * from './rateLimiter.js';
export * from './emailTemplates.js';
export * from './integrationStore.js';

export { syncLeadToSpreadsheet };
