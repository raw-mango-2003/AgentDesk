import { 
  IEmailService, 
  SendEmailOptions, 
  EmailDeliveryRecord, 
  EmailTemplateName 
} from './interfaces.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { GmailService } from './gmailService.js';
import { deliveryLogService } from './deliveryLogService.js';
import { integrationStore } from './integrationStore.js';

export class EmailService implements IEmailService {
  private gmailService: GmailService;
  private appUrl: string;
  private deliveryLogs: EmailDeliveryRecord[] = [];

  constructor(gmailService?: GmailService) {
    this.gmailService = gmailService || new GmailService();
    this.appUrl = (process.env.APP_URL || 'https://agentdesk.ai').trim();
  }

  public setGmailService(service: GmailService): void {
    this.gmailService = service;
  }

  public getGmailService(): GmailService {
    return this.gmailService;
  }

  public isConfigured(): boolean {
    return Boolean(
      (process.env.BREVO_API_KEY || '').trim() ||
      (process.env.RESEND_API_KEY || '').trim()
    );
  }

  /**
   * Dispatch an email via the official Gmail API engine.
   * Accurately logs and reports status without fake successful delivery.
   */
  public async sendEmail(options: SendEmailOptions): Promise<{ 
    success: boolean; 
    status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED'; 
    messageId?: string; 
    error?: string 
  }> {
    const recordId = `em_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const eventType = options.eventType || (options.template ? String(options.template).toUpperCase() : 'TRANSACTIONAL_EMAIL');

    // Strip sensitive values from log metadata (never store passwords, reset tokens, OTPs)
    const sanitizedMetadata: Record<string, any> = {};
    if (options.metadata) {
      for (const [key, val] of Object.entries(options.metadata)) {
        if (
          key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret') || 
          key.toLowerCase().includes('otp')
        ) {
          sanitizedMetadata[key] = '[REDACTED]';
        } else {
          sanitizedMetadata[key] = val;
        }
      }
    }

    const record: EmailDeliveryRecord = {
      id: recordId,
      userId: options.userId,
      tenantId: options.tenantId,
      eventType,
      recipient: options.to,
      subject: options.subject,
      provider: 'gmail',
      status: 'QUEUED',
      attemptCount: 1,
      createdAt: now,
      metadata: sanitizedMetadata
    };

    this.deliveryLogs.unshift(record);
    if (this.deliveryLogs.length > 1000) {
      this.deliveryLogs.pop();
    }

    // 1. Prefer Brevo SMTP API. This is the primary AgentDesk email transport
    // and does not require Google OAuth or a custom domain.
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    if (brevoApiKey) {
      return this.sendViaBrevo(record, options, brevoApiKey);
    }

    // 2. Optional Resend fallback for deployments that already have it configured.
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    if (resendApiKey) {
      return this.sendViaResendFallback(record, options, resendApiKey);
    }

    const errorMsg = 'No transactional email provider is configured. Set BREVO_API_KEY in the environment.';
    record.status = 'NOT_CONFIGURED';
    await deliveryLogService.record({
      id: recordId,
      tenantId: options.tenantId,
      channel: 'email',
      recipient: options.to,
      eventType,
      status: 'NOT_CONFIGURED',
      provider: 'brevo',
      retryCount: 0,
      payload: { subject: options.subject, html: options.html, text: options.text, replyTo: options.replyTo }
    });
    record.failedAt = new Date().toISOString();
    record.error = errorMsg;
    console.warn(`[EmailService:NotConfigured] Cannot dispatch email to ${options.to}: ${errorMsg}`);
    return { success: false, status: 'NOT_CONFIGURED', error: errorMsg };
  }

  /**
   * Optional Resend fallback for deployments that already have RESEND_API_KEY.
   */
  private async sendViaResendFallback(
    record: EmailDeliveryRecord,
    options: SendEmailOptions,
    apiKey: string
  ): Promise<{
    success: boolean;
    status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED';
    messageId?: string;
    error?: string
  }> {
    record.provider = 'resend';
    const config = integrationStore.getPlatformConfig('email_delivery');
    const fromEmail = (config.fromEmail || process.env.EMAIL_FROM || 'hello.agentdesktech@gmail.com').trim();
    const fromName = (config.fromName || process.env.EMAIL_FROM_NAME || 'AgentDesk').trim();
    const replyTo = (options.replyTo || config.replyTo || process.env.EMAIL_REPLY_TO || fromEmail).trim();

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [options.to],
          reply_to: replyTo,
          subject: options.subject,
          html: options.html,
          text: options.text || undefined
        })
      });

      const responseData = await response.json().catch(() => ({})) as any;

      if (!response.ok) {
        const errMsg = responseData.message || responseData.name || `Resend HTTP error ${response.status}`;
        record.status = 'FAILED';
        await deliveryLogService.update(record.id, {
          status: 'FAILED',
          provider: record.provider,
          retryCount: record.attemptCount,
          error: errMsg
        });
        record.failedAt = new Date().toISOString();
        record.error = errMsg;
        return { success: false, status: 'FAILED', error: errMsg };
      }

      const messageId = responseData.id;
      record.status = 'SENT';
      await deliveryLogService.update(record.id, {
        status: 'SENT',
        provider: record.provider,
        providerId: messageId,
        retryCount: record.attemptCount
      });
      record.sentAt = new Date().toISOString();
      record.providerMessageId = messageId;
      record.error = undefined;

      return { success: true, status: 'SENT', messageId };
    } catch (err: any) {
      const errMsg = err.message || 'Resend network error';
      record.status = 'FAILED';
      record.failedAt = new Date().toISOString();
      record.error = errMsg;
      await deliveryLogService.update(record.id, {
        status: 'FAILED',
        provider: record.provider,
        retryCount: record.attemptCount,
        error: errMsg
      });
      return { success: false, status: 'FAILED', error: errMsg };
    }
  }

  /**
   * Send transactional email through Brevo's HTTP API.
   * The sender defaults to hello.agentdesktech@gmail.com and can be overridden
   * with EMAIL_FROM after the address has been verified in Brevo.
   */
  private async sendViaBrevo(
    record: EmailDeliveryRecord,
    options: SendEmailOptions,
    apiKey: string
  ): Promise<{
    success: boolean;
    status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED';
    messageId?: string;
    error?: string
  }> {
    record.provider = 'brevo';
    const fromEmail = (process.env.EMAIL_FROM || 'hello.agentdesktech@gmail.com').trim();
    const fromName = (process.env.EMAIL_FROM_NAME || 'AgentDesk').trim();
    const replyTo = (options.replyTo || process.env.EMAIL_REPLY_TO || fromEmail).trim();

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: options.to }],
          replyTo: { email: replyTo },
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text || undefined
        })
      });

      const responseData = await response.json().catch(() => ({})) as any;

      if (!response.ok) {
        const errMsg = responseData.message || responseData.code || `Brevo HTTP error ${response.status}`;
        record.status = 'FAILED';
        await deliveryLogService.update(record.id, {
          status: 'FAILED',
          provider: record.provider,
          retryCount: record.attemptCount,
          error: errMsg
        });
        record.failedAt = new Date().toISOString();
        record.error = errMsg;
        return { success: false, status: 'FAILED', error: errMsg };
      }

      const messageId = responseData.messageId;
      record.status = 'SENT';
      await deliveryLogService.update(record.id, {
        status: 'SENT',
        provider: record.provider,
        providerId: messageId,
        retryCount: record.attemptCount
      });
      record.sentAt = new Date().toISOString();
      record.providerMessageId = messageId;
      record.error = undefined;

      return { success: true, status: 'SENT', messageId };
    } catch (err: any) {
      const errMsg = err.message || 'Brevo network error';
      record.status = 'FAILED';
      record.failedAt = new Date().toISOString();
      record.error = errMsg;
      await deliveryLogService.update(record.id, {
        status: 'FAILED',
        provider: record.provider,
        retryCount: record.attemptCount,
        error: errMsg
      });
      return { success: false, status: 'FAILED', error: errMsg };
    }
  }

  /**
   * Render template and dispatch email
   */
  public async sendTemplate(
    template: EmailTemplateName,
    to: string,
    data: Record<string, any>,
    options?: { userId?: string; tenantId?: string; eventType?: string; replyTo?: string }
  ): Promise<{ 
    success: boolean; 
    status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'NOT_CONFIGURED'; 
    messageId?: string; 
    error?: string 
  }> {
    const rendered = renderEmailTemplate(template, data, this.appUrl);
    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template,
      eventType: options?.eventType || template.toUpperCase(),
      userId: options?.userId,
      tenantId: options?.tenantId,
      replyTo: options?.replyTo,
      metadata: { templateData: data }
    });
  }

  /**
   * Query delivery logs
   */
  public getDeliveryLogs(filter?: { 
    tenantId?: string; 
    recipient?: string; 
    status?: string; 
    limit?: number 
  }): EmailDeliveryRecord[] {
    let logs = [...this.deliveryLogs];
    if (filter?.tenantId) {
      logs = logs.filter(l => l.tenantId === filter.tenantId);
    }
    if (filter?.recipient) {
      logs = logs.filter(l => l.recipient.toLowerCase().includes(filter.recipient!.toLowerCase()));
    }
    if (filter?.status) {
      logs = logs.filter(l => l.status === filter.status);
    }
    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }
    return logs;
  }
}
