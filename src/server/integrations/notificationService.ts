import {
  INotificationService,
  SystemNotification,
  UserNotificationPreferences,
  EventTrigger,
  NotificationCategory,
  NotificationChannel
} from './interfaces.js';
import { EmailService } from './emailService.js';
import { SMSService } from './smsService.js';
import { PushNotificationService } from './pushNotificationService.js';
import { WhatsAppService } from './whatsAppService.js';
import { AnalyticsService } from './analyticsService.js';
import { AuditLogService } from './auditLogService.js';

export class NotificationService implements INotificationService {
  private inAppNotifications: SystemNotification[] = [];
  private userPreferences = new Map<string, UserNotificationPreferences>();

  constructor(
    private emailService: EmailService,
    private smsService: SMSService,
    private pushService: PushNotificationService,
    private whatsAppService: WhatsAppService,
    private analyticsService: AnalyticsService,
    private auditLogService: AuditLogService
  ) {}

  public getUserPreferences(userId: string): UserNotificationPreferences {
    const existing = this.userPreferences.get(userId);
    if (existing) return existing;

    const defaultPrefs: UserNotificationPreferences = {
      userId,
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      whatsappEnabled: true,
      securityNotifications: true, // Non-negotiable security channel
      billingNotifications: true,
      productNotifications: true,
      marketingNotifications: false,
      updatedAt: new Date().toISOString()
    };

    this.userPreferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  public updateUserPreferences(userId: string, prefs: Partial<UserNotificationPreferences>): UserNotificationPreferences {
    const current = this.getUserPreferences(userId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...prefs,
      securityNotifications: true, // Always enforce true
      updatedAt: new Date().toISOString()
    };

    this.userPreferences.set(userId, updated);
    return updated;
  }

  public async dispatchEvent(event: EventTrigger, payload: Record<string, any>): Promise<void> {
    const {
      userId,
      tenantId,
      email,
      phone,
      title,
      body,
      category = 'product'
    } = payload;

    const prefs = userId ? this.getUserPreferences(userId) : null;
    const now = new Date().toISOString();

    // 1. In-App Notification (Stored in memory database)
    if (userId || tenantId) {
      const inAppId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const inAppRecord: SystemNotification = {
        id: inAppId,
        userId,
        tenantId,
        type: event,
        category: category as NotificationCategory,
        channel: 'in_app',
        title: title || this.getDefaultTitleForEvent(event, payload),
        body: body || this.getDefaultBodyForEvent(event, payload),
        status: 'DELIVERED',
        createdAt: now,
        metadata: payload
      };

      this.inAppNotifications.unshift(inAppRecord);
      if (this.inAppNotifications.length > 2000) {
        this.inAppNotifications.pop();
      }
    }

    // 2. Email Delivery
    const shouldSendEmail = !prefs || (
      category === 'security' ? true : (prefs.emailEnabled && (
        category === 'billing' ? prefs.billingNotifications :
        category === 'product' ? prefs.productNotifications :
        category === 'marketing' ? prefs.marketingNotifications : true
      ))
    );

    if (email && shouldSendEmail) {
      const templateName = this.mapEventToEmailTemplate(event);
      if (templateName) {
        await this.emailService.sendTemplate(templateName as any, email, payload, { userId, tenantId });
      }
    }

    // 3. SMS Delivery
    const shouldSendSMS = phone && (!prefs || (prefs.smsEnabled && (category === 'security' || category === 'billing' || category === 'leads')));
    if (shouldSendSMS && phone) {
      const smsText = `${title || 'AgentDesk Notification'}: ${body || this.getDefaultBodyForEvent(event, payload)}`;
      await this.smsService.sendSMS(phone, smsText, tenantId);
    }

    // 4. Push Notification Delivery
    if (userId && (!prefs || prefs.pushEnabled)) {
      await this.pushService.sendPush(
        userId,
        title || this.getDefaultTitleForEvent(event, payload),
        body || this.getDefaultBodyForEvent(event, payload),
        { event, tenantId: tenantId || '' }
      );
    }

    // 5. WhatsApp Delivery (Transactional)
    if (phone && (!prefs || prefs.whatsappEnabled) && (category === 'billing' || category === 'leads' || event === 'PAYMENT_SUCCESS')) {
      const waText = `*${title || 'AgentDesk Update'}*\n${body || this.getDefaultBodyForEvent(event, payload)}`;
      await this.whatsAppService.sendWhatsAppMessage(phone, waText, tenantId);
    }

    // 6. Product Analytics Tracking (PostHog)
    const analyticsEvent = this.mapEventToAnalytics(event);
    if (analyticsEvent) {
      await this.analyticsService.track(analyticsEvent as any, {
        tenantId,
        category,
        ...payload
      }, userId || 'system');
    }

    // 7. Audit Logging for security/billing events
    if (category === 'security' || category === 'billing' || event.includes('PASSWORD') || event.includes('2FA') || event.includes('PAYMENT')) {
      this.auditLogService.log({
        actorId: userId || 'system',
        actorEmail: email || 'system@agentdesk.ai',
        actorRole: payload.role || 'USER',
        tenantId,
        action: event,
        entityType: category.toUpperCase(),
        entityId: payload.orderId || payload.paymentId || userId,
        ip: payload.ip,
        userAgent: payload.userAgent,
        metadata: payload
      });
    }
  }

  public getUserNotifications(userId: string, filter?: { unreadOnly?: boolean; limit?: number }): SystemNotification[] {
    let list = this.inAppNotifications.filter(n => n.userId === userId || !n.userId);
    if (filter?.unreadOnly) {
      list = list.filter(n => !n.readAt);
    }
    if (filter?.limit) {
      list = list.slice(0, filter.limit);
    }
    return list;
  }

  public markAsRead(notificationId: string, userId: string): boolean {
    const notif = this.inAppNotifications.find(n => n.id === notificationId && (n.userId === userId || !n.userId));
    if (notif) {
      notif.readAt = new Date().toISOString();
      notif.status = 'READ';
      return true;
    }
    return false;
  }

  public markAllAsRead(userId: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const notif of this.inAppNotifications) {
      if ((notif.userId === userId || !notif.userId) && !notif.readAt) {
        notif.readAt = now;
        notif.status = 'READ';
        count++;
      }
    }
    return count;
  }

  private getDefaultTitleForEvent(event: EventTrigger, payload: any): string {
    switch (event) {
      case 'USER_CREATED': return 'Welcome to AgentDesk';
      case 'EMAIL_VERIFICATION_REQUESTED': return 'Verify your AgentDesk email address';
      case 'EMAIL_VERIFIED': return 'Email Verification Confirmed';
      case 'PASSWORD_RESET_REQUESTED': return 'Password Reset Instructions';
      case 'PASSWORD_RESET_COMPLETED': return 'Password Reset Completed';
      case 'PASSWORD_CHANGED': return 'Password Changed Successfully';
      case 'EMAIL_CHANGED': return 'Email Address Changed';
      case 'NEW_LOGIN': return 'New Login to Your AgentDesk Account';
      case 'SUSPICIOUS_LOGIN': return 'Security Alert: Suspicious Login Detected';
      case 'BUSINESS_CREATED': return `Workspace Created: ${payload.businessName || 'AgentDesk'}`;
      case 'BUSINESS_OWNER_INVITED': return 'You have been invited to set up your AgentDesk Workspace';
      case 'ACCOUNT_SETUP_REQUESTED': return 'Complete your AgentDesk Workspace Setup';
      case 'PAYMENT_INITIATED': return 'Payment Order Created';
      case 'PAYMENT_SUCCESS': return `Payment Successful: ${payload.currency || '$'}${payload.amount || ''}`;
      case 'PAYMENT_FAILED': return 'Payment Failed';
      case 'PAYMENT_REFUNDED': return 'Payment Refund Processed';
      case 'SUBSCRIPTION_ACTIVATED': return 'Subscription Activated';
      case 'SUBSCRIPTION_RENEWAL': return 'Upcoming Subscription Renewal';
      case 'SUBSCRIPTION_PAYMENT_FAILED': return 'Subscription Payment Past Due';
      case 'SUBSCRIPTION_CANCELLED': return 'Subscription Cancelled';
      case 'SUBSCRIPTION_PAUSED': return 'Subscription Paused';
      case 'SUBSCRIPTION_RESUMED': return 'Subscription Resumed';
      case 'ACCOUNT_SUSPENDED': return 'Workspace Suspended';
      case 'ACCOUNT_RESTORED': return 'Workspace Restored';
      case 'ACCOUNT_DELETED': return 'Account Deletion Notice';
      case 'ADMIN_CREDENTIAL_CREATED': return 'Platform Admin Account Created';
      case 'ADMIN_CREDENTIAL_CHANGED': return 'Platform Admin Credential Changed';
      case '2FA_ENABLED': return 'Two-Factor Authentication Active';
      case '2FA_DISABLED': return 'Two-Factor Authentication Disabled';
      case 'ACCOUNT_LOCKED': return 'Account Temporarily Locked';
      case 'ACCOUNT_UNLOCKED': return 'Account Security Lock Lifted';
      case 'NEW_LEAD_RECEIVED': return `New Lead: ${payload.leadName || 'Website Visitor'}`;
      case 'APPOINTMENT_BOOKED': return `New Appointment: ${payload.serviceName || 'Consultation'}`;
      case 'MISSED_CALL_DETECTED': return `Missed Call from ${payload.callerPhone || 'Caller'}`;
      default: return 'AgentDesk System Update';
    }
  }

  private getDefaultBodyForEvent(event: EventTrigger, payload: any): string {
    switch (event) {
      case 'EMAIL_VERIFICATION_REQUESTED': return 'Please verify your email address to complete your registration.';
      case 'PASSWORD_RESET_REQUESTED': return 'A password reset request was initiated for your account.';
      case 'PASSWORD_RESET_COMPLETED': return 'Your password has been successfully reset. Prior active sessions were invalidated.';
      case 'BUSINESS_OWNER_INVITED': return 'You have been designated as business owner for a new AgentDesk workspace.';
      case 'PAYMENT_SUCCESS': return `Your payment of ${payload.currency || 'USD'} ${payload.amount} for ${payload.planName || 'AgentDesk'} was successfully processed.`;
      case 'PAYMENT_FAILED': return `We were unable to charge your payment method. Please update billing to avoid service disruption.`;
      case 'SUBSCRIPTION_ACTIVATED': return `Your ${payload.planName || 'Growth'} plan is active. AI quotas and integrations have been provisioned.`;
      case 'NEW_LEAD_RECEIVED': return `A high-intent lead (${payload.leadName || 'Contact'}) was qualified by your AI Agent with a score of ${payload.score || 90}%.`;
      case 'APPOINTMENT_BOOKED': return `Appointment confirmed for ${payload.clientName || 'Client'} on ${payload.date || 'upcoming date'}.`;
      default: return payload.message || 'You have a new activity update in your AgentDesk workspace.';
    }
  }

  private mapEventToEmailTemplate(event: EventTrigger): string | null {
    switch (event) {
      case 'USER_CREATED': return 'welcome';
      case 'EMAIL_VERIFICATION_REQUESTED': return 'verify_email';
      case 'EMAIL_VERIFIED': return 'welcome';
      case 'PASSWORD_RESET_REQUESTED': return 'password_reset';
      case 'PASSWORD_RESET_COMPLETED': return 'password_changed';
      case 'PASSWORD_CHANGED': return 'password_changed';
      case 'EMAIL_CHANGED': return 'email_changed';
      case 'NEW_LOGIN': return 'new_login';
      case 'SUSPICIOUS_LOGIN': return 'suspicious_login';
      case 'BUSINESS_CREATED': return 'business_account_created';
      case 'BUSINESS_OWNER_INVITED': return 'business_owner_invited';
      case 'ACCOUNT_SETUP_REQUESTED': return 'business_account_setup';
      case 'PAYMENT_INITIATED': return null;
      case 'PAYMENT_SUCCESS': return 'payment_successful';
      case 'PAYMENT_FAILED': return 'payment_failed';
      case 'PAYMENT_REFUNDED': return 'payment_refund';
      case 'SUBSCRIPTION_ACTIVATED': return 'subscription_activated';
      case 'SUBSCRIPTION_RENEWAL': return 'subscription_renewal';
      case 'SUBSCRIPTION_PAYMENT_FAILED': return 'subscription_payment_failed';
      case 'SUBSCRIPTION_CANCELLED': return 'subscription_cancelled';
      case 'SUBSCRIPTION_PAUSED': return 'subscription_paused';
      case 'SUBSCRIPTION_RESUMED': return 'subscription_resumed';
      case 'ACCOUNT_SUSPENDED': return 'account_suspended';
      case 'ACCOUNT_RESTORED': return 'account_restored';
      case 'ACCOUNT_DELETED': return 'account_deleted';
      case 'ADMIN_CREDENTIAL_CREATED': return null;
      case 'ADMIN_CREDENTIAL_CHANGED': return 'admin_credential_changed';
      case 'NEW_LEAD_RECEIVED': return 'new_lead_received';
      case '2FA_ENABLED': return '2fa_enabled';
      case '2FA_DISABLED': return '2fa_disabled';
      case 'ACCOUNT_LOCKED': return 'account_locked';
      case 'ACCOUNT_UNLOCKED': return 'account_unlocked';
      default: return null;
    }
  }

  private mapEventToAnalytics(event: EventTrigger): string | null {
    switch (event) {
      case 'USER_CREATED': return 'user_signed_up';
      case 'EMAIL_VERIFIED': return 'email_verified';
      case 'PASSWORD_RESET_REQUESTED': return 'password_reset_requested';
      case 'PASSWORD_RESET_COMPLETED': return 'password_reset_completed';
      case 'PASSWORD_CHANGED': return 'password_changed';
      case '2FA_ENABLED': return '2fa_enabled';
      case '2FA_DISABLED': return '2fa_disabled';
      case 'PAYMENT_SUCCESS': return 'payment_success';
      case 'PAYMENT_FAILED': return 'payment_failed';
      case 'SUBSCRIPTION_ACTIVATED': return 'subscription_started';
      case 'SUBSCRIPTION_CANCELLED': return 'subscription_cancelled';
      default: return null;
    }
  }
}
