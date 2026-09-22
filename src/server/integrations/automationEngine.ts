import crypto from 'crypto';
import { 
  EventTrigger, 
  AutomationRule, 
  AutomationDispatchResult, 
  IAutomationEngine 
} from './interfaces.js';
import { NotificationService } from './notificationService.js';
import { QueueService } from './queueService.js';
import { AuditLogService } from './auditLogService.js';

export class AutomationEngine implements IAutomationEngine {
  private automations: Map<string, AutomationRule> = new Map();
  private idempotencyCache: Map<string, { timestamp: number; result: AutomationDispatchResult }> = new Map();
  private idempotencyTtlMs = 15 * 60 * 1000; // 15 minute deduplication window

  constructor(
    private notificationService: NotificationService,
    private queueService: QueueService,
    private auditLogService: AuditLogService
  ) {
    this.seedDefaultAutomations();

    // Clean up stale idempotency keys every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.idempotencyCache.entries()) {
        if (now - record.timestamp > this.idempotencyTtlMs) {
          this.idempotencyCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Seed all 28 core platform automation workflows
   */
  private seedDefaultAutomations(): void {
    const rules: Array<Omit<AutomationRule, 'lastRun' | 'successCount' | 'failedCount' | 'retryCount' | 'createdAt'>> = [
      // Authentication & Onboarding
      {
        id: 'auto_user_signup_verify',
        name: 'Email Verification Dispatch',
        description: 'Sends secure verification link via official Gmail upon new account signup.',
        eventTrigger: 'EMAIL_VERIFICATION_REQUESTED',
        channel: 'GMAIL',
        emailTemplate: 'verify_email',
        status: 'ACTIVE'
      },
      {
        id: 'auto_welcome_email',
        name: 'Workspace Welcome & Onboarding',
        description: 'Sends welcome onboarding email and dashboard guide once email is verified.',
        eventTrigger: 'EMAIL_VERIFIED',
        channel: 'GMAIL',
        emailTemplate: 'welcome',
        status: 'ACTIVE'
      },
      {
        id: 'auto_business_owner_invite',
        name: 'Business Owner Workspace Setup',
        description: 'Invites new business owners with a secure single-use password creation token.',
        eventTrigger: 'BUSINESS_OWNER_INVITED',
        channel: 'GMAIL',
        emailTemplate: 'business_owner_invited',
        status: 'ACTIVE'
      },
      {
        id: 'auto_account_setup_req',
        name: 'Account Setup Invitation',
        description: 'Sends initial setup link to provision business manager credentials.',
        eventTrigger: 'ACCOUNT_SETUP_REQUESTED',
        channel: 'GMAIL',
        emailTemplate: 'business_account_setup',
        status: 'ACTIVE'
      },
      {
        id: 'auto_password_reset_req',
        name: 'Password Reset Delivery',
        description: 'Issues secure, hashed, 1-hour expiration password reset link via Gmail.',
        eventTrigger: 'PASSWORD_RESET_REQUESTED',
        channel: 'GMAIL',
        emailTemplate: 'password_reset',
        status: 'ACTIVE'
      },
      {
        id: 'auto_password_reset_done',
        name: 'Password Reset Confirmation',
        description: 'Confirms password reset and notifies user that older sessions were terminated.',
        eventTrigger: 'PASSWORD_RESET_COMPLETED',
        channel: 'GMAIL',
        emailTemplate: 'password_changed',
        status: 'ACTIVE'
      },
      {
        id: 'auto_password_changed',
        name: 'Password Change Security Alert',
        description: 'Alerts user when password is changed from user profile or security settings.',
        eventTrigger: 'PASSWORD_CHANGED',
        channel: 'GMAIL',
        emailTemplate: 'password_changed',
        status: 'ACTIVE'
      },
      {
        id: 'auto_email_changed',
        name: 'Email Change Notification',
        description: 'Notifies both prior and new email address upon login credential update.',
        eventTrigger: 'EMAIL_CHANGED',
        channel: 'GMAIL',
        emailTemplate: 'email_changed',
        status: 'ACTIVE'
      },
      {
        id: 'auto_new_login',
        name: 'New Device Login Alert',
        description: 'Sends device details and IP location alert upon authentication from new browser.',
        eventTrigger: 'NEW_LOGIN',
        channel: 'GMAIL',
        emailTemplate: 'new_login',
        status: 'ACTIVE'
      },
      {
        id: 'auto_suspicious_login',
        name: 'Suspicious Login Warning',
        description: 'Alerts account owner of anomalous login attempts or rapid failed authentications.',
        eventTrigger: 'SUSPICIOUS_LOGIN',
        channel: 'GMAIL',
        emailTemplate: 'suspicious_login',
        status: 'ACTIVE'
      },
      {
        id: 'auto_account_locked',
        name: 'Account Lockout Security Notice',
        description: 'Notifies user of temporary 15-minute lock after 5 failed authentication attempts.',
        eventTrigger: 'ACCOUNT_LOCKED',
        channel: 'GMAIL',
        emailTemplate: 'account_locked',
        status: 'ACTIVE'
      },
      {
        id: 'auto_account_unlocked',
        name: 'Account Unlock Confirmation',
        description: 'Notifies user when temporary security lock has expired or been lifted.',
        eventTrigger: 'ACCOUNT_UNLOCKED',
        channel: 'GMAIL',
        emailTemplate: 'account_unlocked',
        status: 'ACTIVE'
      },
      {
        id: 'auto_2fa_enabled',
        name: 'Two-Factor Authentication Enabled',
        description: 'Confirms activation of two-factor authentication on user profile.',
        eventTrigger: '2FA_ENABLED',
        channel: 'GMAIL',
        emailTemplate: '2fa_enabled',
        status: 'ACTIVE'
      },
      {
        id: 'auto_2fa_disabled',
        name: 'Two-Factor Authentication Disabled Warning',
        description: 'High-priority security warning when 2FA is removed from an account.',
        eventTrigger: '2FA_DISABLED',
        channel: 'GMAIL',
        emailTemplate: '2fa_disabled',
        status: 'ACTIVE'
      },

      // Billing & Payments
      {
        id: 'auto_payment_success',
        name: 'Payment Receipt & Tax Invoice',
        description: 'Delivers official AgentDesk payment receipt and updates billing records.',
        eventTrigger: 'PAYMENT_SUCCESS',
        channel: 'GMAIL',
        emailTemplate: 'payment_successful',
        status: 'ACTIVE'
      },
      {
        id: 'auto_payment_failed',
        name: 'Payment Failure Resolution',
        description: 'Alerts customer of failed charge with direct link to update payment method.',
        eventTrigger: 'PAYMENT_FAILED',
        channel: 'GMAIL',
        emailTemplate: 'payment_failed',
        status: 'ACTIVE'
      },
      {
        id: 'auto_payment_refund',
        name: 'Refund Confirmation',
        description: 'Confirms refund issuance with bank processing timeframe.',
        eventTrigger: 'PAYMENT_REFUNDED',
        channel: 'GMAIL',
        emailTemplate: 'payment_refund',
        status: 'ACTIVE'
      },
      {
        id: 'auto_subscription_activated',
        name: 'Subscription Activation Confirmation',
        description: 'Confirms plan provisioning, quotas, and renewal schedule.',
        eventTrigger: 'SUBSCRIPTION_ACTIVATED',
        channel: 'GMAIL',
        emailTemplate: 'subscription_activated',
        status: 'ACTIVE'
      },
      {
        id: 'auto_subscription_renewal',
        name: 'Subscription Renewal Notice',
        description: 'Notifies workspace admins ahead of upcoming automated billing renewal.',
        eventTrigger: 'SUBSCRIPTION_RENEWAL',
        channel: 'GMAIL',
        emailTemplate: 'subscription_renewal',
        status: 'ACTIVE'
      },
      {
        id: 'auto_subscription_fail',
        name: 'Subscription Payment Past Due',
        description: 'Notifies of grace period when recurring subscription payment fails.',
        eventTrigger: 'SUBSCRIPTION_PAYMENT_FAILED',
        channel: 'GMAIL',
        emailTemplate: 'subscription_payment_failed',
        status: 'ACTIVE'
      },
      {
        id: 'auto_subscription_cancelled',
        name: 'Subscription Cancellation Notice',
        description: 'Confirms cancellation and specifies date when features transition.',
        eventTrigger: 'SUBSCRIPTION_CANCELLED',
        channel: 'GMAIL',
        emailTemplate: 'subscription_cancelled',
        status: 'ACTIVE'
      },
      {
        id: 'auto_subscription_paused',
        name: 'Subscription Paused Notice',
        description: 'Confirms paused state of billing subscription.',
        eventTrigger: 'SUBSCRIPTION_PAUSED',
        channel: 'GMAIL',
        emailTemplate: 'subscription_paused',
        status: 'ACTIVE'
      },
      {
        id: 'auto_subscription_resumed',
        name: 'Subscription Resumed Confirmation',
        description: 'Confirms resumption of subscription and reactivation of AI quotas.',
        eventTrigger: 'SUBSCRIPTION_RESUMED',
        channel: 'GMAIL',
        emailTemplate: 'subscription_resumed',
        status: 'ACTIVE'
      },

      // Workspace & Admin Operations
      {
        id: 'auto_account_suspended',
        name: 'Workspace Suspension Notice',
        description: 'Urgent notice regarding suspended workspace and reactivation instructions.',
        eventTrigger: 'ACCOUNT_SUSPENDED',
        channel: 'GMAIL',
        emailTemplate: 'account_suspended',
        status: 'ACTIVE'
      },
      {
        id: 'auto_account_restored',
        name: 'Workspace Reactivation Notice',
        description: 'Confirms restoration of suspended workspace.',
        eventTrigger: 'ACCOUNT_RESTORED',
        channel: 'GMAIL',
        emailTemplate: 'account_restored',
        status: 'ACTIVE'
      },
      {
        id: 'auto_account_deleted',
        name: 'Account Deletion Notice',
        description: 'Confirms removal of user profile under privacy regulations.',
        eventTrigger: 'ACCOUNT_DELETED',
        channel: 'GMAIL',
        emailTemplate: 'account_deleted',
        status: 'ACTIVE'
      },
      {
        id: 'auto_admin_cred_created',
        name: 'Platform Admin Account Created',
        description: 'Records creation of platform administration access credentials.',
        eventTrigger: 'ADMIN_CREDENTIAL_CREATED',
        channel: 'IN_APP',
        status: 'ACTIVE'
      },
      {
        id: 'auto_admin_cred_changed',
        name: 'Platform Admin Credential Change Security Alert',
        description: 'Critical security notification when platform admin password or email is changed.',
        eventTrigger: 'ADMIN_CREDENTIAL_CHANGED',
        channel: 'GMAIL',
        emailTemplate: 'admin_credential_changed',
        status: 'ACTIVE'
      }
    ];

    const now = new Date().toISOString();
    for (const rule of rules) {
      this.automations.set(rule.id, {
        ...rule,
        successCount: 0,
        failedCount: 0,
        retryCount: 0,
        createdAt: now
      });
    }
  }

  /**
   * Central Event Dispatcher:
   * Event -> AutomationEngine -> NotificationService -> EmailService -> GmailService
   */
  public async emit(event: EventTrigger, payload: Record<string, any>): Promise<AutomationDispatchResult> {
    const eventId = payload.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const recipient = payload.email || payload.to || payload.userId || 'system';

    // Idempotency is caller-controlled when possible. For legacy callers that do not
    // provide an event ID, derive a stable fingerprint from the event, recipient and
    // payload so an identical event is still deduplicated within the TTL window.
    const canonicalPayload = Object.keys(payload)
      .filter(key => key !== 'eventId' && key !== 'idempotencyKey')
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {});
    const idempotencySource = payload.idempotencyKey || payload.eventId || JSON.stringify({
      event,
      recipient,
      payload: canonicalPayload
    });
    const idempotencyKey = `auto_${crypto.createHash('sha256').update(String(idempotencySource)).digest('hex')}`;

    if (this.idempotencyCache.has(idempotencyKey)) {
      console.log(`[AutomationEngine:Idempotency] Skipped duplicate event execution: ${idempotencyKey}`);
      return {
        eventId,
        event,
        idempotencyKey,
        status: 'SKIPPED_DUPLICATE',
        matchedRules: 0,
        executedRules: 0,
        skippedDuplicates: 1
      };
    }

    // Find matching automation rules for this trigger
    const matchingRules = Array.from(this.automations.values()).filter(
      rule => rule.eventTrigger === event
    );

    // If all matching rules are paused, mark PAUSED
    const activeRules = matchingRules.filter(r => r.status === 'ACTIVE');
    if (matchingRules.length > 0 && activeRules.length === 0) {
      const result: AutomationDispatchResult = {
        eventId,
        event,
        idempotencyKey,
        status: 'PAUSED',
        matchedRules: matchingRules.length,
        executedRules: 0,
        skippedDuplicates: 0
      };
      this.idempotencyCache.set(idempotencyKey, { timestamp: Date.now(), result });
      return result;
    }

    const nowIso = new Date().toISOString();
    let deliveryStatus: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED' = 'SENT';
    let errorMessage: string | undefined;

    try {
      // 1. Dispatch through NotificationService (which handles in-app database records + email via Gmail)
      await this.notificationService.dispatchEvent(event, {
        ...payload,
        eventId
      });

      // 2. Audit log entry for security and operations tracking
      this.auditLogService.log({
        actorId: payload.userId || 'automation_engine',
        actorEmail: payload.actorEmail || 'hello.agentdesktech@gmail.com',
        actorRole: 'SYSTEM_AUTOMATION',
        tenantId: payload.tenantId,
        action: `AUTOMATION_DISPATCHED:${event}`,
        entityType: 'AUTOMATION',
        entityId: eventId,
        metadata: {
          event,
          recipient,
          idempotencyKey
        }
      });

      // Update automation rule execution metrics
      for (const rule of activeRules) {
        rule.lastRun = nowIso;
        rule.successCount += 1;
      }

      const result: AutomationDispatchResult = {
        eventId,
        event,
        idempotencyKey,
        status: 'EXECUTED',
        matchedRules: matchingRules.length,
        executedRules: activeRules.length,
        skippedDuplicates: 0,
        deliveryStatus: 'SENT'
      };

      this.idempotencyCache.set(idempotencyKey, { timestamp: Date.now(), result });
      return result;
    } catch (err: any) {
      errorMessage = err.message || 'Execution failure in automation pipeline';
      console.error(`[AutomationEngine:Error] Trigger ${event}:`, errorMessage);

      // Update failed metric
      for (const rule of activeRules) {
        rule.lastRun = nowIso;
        rule.failedCount += 1;
      }

      // Enqueue retry job with exponential backoff if applicable
      if (payload.email) {
        for (const rule of activeRules) {
          rule.retryCount += 1;
        }
        await this.queueService.enqueue('send_email', {
          event,
          payload,
          attempt: 1
        }, { maxAttempts: 3, delayMs: 2000 });
        deliveryStatus = 'RETRYING';
      } else {
        deliveryStatus = 'FAILED';
      }

      const result: AutomationDispatchResult = {
        eventId,
        event,
        idempotencyKey,
        status: 'FAILED',
        matchedRules: matchingRules.length,
        executedRules: 0,
        skippedDuplicates: 0,
        deliveryStatus,
        error: errorMessage
      };

      this.idempotencyCache.set(idempotencyKey, { timestamp: Date.now(), result });
      return result;
    }
  }

  /**
   * Get all registered automation workflows
   */
  public getAutomations(): AutomationRule[] {
    return Array.from(this.automations.values());
  }

  /**
   * Toggle automation rule active/paused state
   */
  public toggleAutomation(id: string, active?: boolean): AutomationRule | null {
    const rule = this.automations.get(id);
    if (!rule) return null;

    rule.status = active !== undefined ? (active ? 'ACTIVE' : 'PAUSED') : (rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    return rule;
  }

  /**
   * Summary stats for Platform Admin Dashboard
   */
  public getAutomationStats(): {
    totalAutomations: number;
    activeAutomations: number;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    retriedRuns: number;
  } {
    const list = Array.from(this.automations.values());
    const totalAutomations = list.length;
    const activeAutomations = list.filter(a => a.status === 'ACTIVE').length;
    let successfulRuns = 0;
    let failedRuns = 0;
    let retriedRuns = 0;

    for (const rule of list) {
      successfulRuns += rule.successCount;
      failedRuns += rule.failedCount;
      retriedRuns += rule.retryCount;
    }

    return {
      totalAutomations,
      activeAutomations,
      totalRuns: successfulRuns + failedRuns,
      successfulRuns,
      failedRuns,
      retriedRuns
    };
  }
}
