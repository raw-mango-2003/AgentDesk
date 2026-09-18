import { 
  IEmailService, 
  SendEmailOptions, 
  EmailDeliveryRecord, 
  EmailTemplateName 
} from './interfaces.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { GmailService } from './gmailService.js';
import { deliveryLogService } from './deliveryLogService.js';

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
    return this.gmailService.isConfigured();
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

    // 1. Check if Gmail API is configured
    if (!this.gmailService.isConfigured()) {
      // Check optional legacy Resend if configured
      const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
      if (resendApiKey && resendApiKey.length > 5) {
        return this.sendViaResendFallback(record, options, resendApiKey);
      }

      // No fake delivery: accurately record NOT_CONFIGURED
      const errorMsg = 'Gmail OAuth 2.0 is not configured. Connect Gmail in Platform Admin -> Integrations.';
      record.status = 'NOT_CONFIGURED';
      await deliveryLogService.record({ id: recordId, tenantId: options.tenantId, channel: 'email', recipient: options.to, eventType, status: 'NOT_CONFIGURED', provider: record.provider, retryCount: 0, payload: { subject: options.subject, html: options.html, text: options.text, replyTo: options.replyTo } });
      record.failedAt = new Date().toISOString();
      record.error = errorMsg;
      console.warn(`[EmailService:NotConfigured] Cannot dispatch email to ${options.to}: ${errorMsg}`);
      return { success: false, status: 'NOT_CONFIGURED', error: errorMsg };
    }

    // 2. Dispatch via Gmail API OAuth 2.0
    const sendResult = await this.gmailService.sendEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || this.gmailService.defaultReplyTo
    });

    if (sendResult.success && sendResult.status === 'SENT') {
      record.status = 'SENT';
      await deliveryLogService.record({ id: recordId, tenantId: options.tenantId, channel: 'email', recipient: options.to, eventType, status: 'SENT', provider: record.provider, providerId: sendResult.messageId, retryCount: 0, payload: { subject: options.subject } });
      record.sentAt = sendResult.timestamp;
      record.providerMessageId = sendResult.messageId;
      record.error = undefined;
      return { success: true, status: 'SENT', messageId: sendResult.messageId };
    }

    // Gmail send failure or disconnected token
    record.status = sendResult.status === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'FAILED';
    await deliveryLogService.record({ id: recordId, tenantId: options.tenantId, channel: 'email', recipient: options.to, eventType, status: record.status, provider: record.provider, retryCount: 0, error: sendResult.error, payload: { subject: options.subject } });
    record.failedAt = sendResult.timestamp;
    record.error = sendResult.error || 'Gmail delivery failed';
    return { 
      success: false, 
      status: record.status, 
      error: record.error 
    };
  }

  /**
   * Optional fallback to Resend if Gmail is unconfigured but Resend key exists
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
    try {
      const fromHeader = `AgentDesk <hello.agentdesktech@gmail.com>`;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [options.to],
          reply_to: options.replyTo || 'hello.agentdesktech@gmail.com',
          subject: options.subject,
          html: options.html,
          text: options.text || undefined
        })
      });

      const responseData = await response.json() as any;

      if (!response.ok) {
        const errMsg = responseData.message || responseData.error || `Resend HTTP error ${response.status}`;
        record.status = 'FAILED';
        await deliveryLogService.update(record.id, { status: 'FAILED', provider: record.provider, retryCount: record.attemptCount, error: errMsg });
        record.failedAt = new Date().toISOString();
        record.error = errMsg;
        return { success: false, status: 'FAILED', error: errMsg };
      }

      record.status = 'SENT';
      await deliveryLogService.update(record.id, { status: 'SENT', provider: record.provider, providerId: responseData.id, retryCount: record.attemptCount });
      record.sentAt = new Date().toISOString();
      record.providerMessageId = responseData.id;
      return { success: true, status: 'SENT', messageId: responseData.id };
    } catch (err: any) {
      record.status = 'FAILED';
      record.failedAt = new Date().toISOString();
      record.error = err.message || 'Resend network error';
      return { success: false, status: 'FAILED', error: err.message };
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
