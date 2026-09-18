import { IWhatsAppService } from './interfaces.js';
import { deliveryLogService } from './deliveryLogService.js';

export class WhatsAppService implements IWhatsAppService {
  private provider: string;
  private apiKey: string;
  private phoneNumberId: string;
  private consentStore = new Map<string, boolean>(); // phone -> optedIn

  constructor() {
    this.provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase().trim();
    this.apiKey = (process.env.WHATSAPP_API_KEY || '').trim();
    this.phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  }

  public isConfigured(): boolean {
    return !!(this.apiKey && this.phoneNumberId);
  }

  public recordConsent(phone: string, optedIn: boolean): void {
    const clean = phone.replace(/[\s\-\(\)]/g, '').toLowerCase();
    this.consentStore.set(clean, optedIn);
  }

  public hasConsent(phone: string): boolean {
    const clean = phone.replace(/[\s\-\(\)]/g, '').toLowerCase();
    // Default to true if not explicitly opted out, or check specific opt-in
    return this.consentStore.get(clean) !== false;
  }

  public async sendWhatsAppMessage(
    toPhone: string,
    message: string,
    tenantId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const logId = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await deliveryLogService.record({ id: logId, tenantId, channel: 'whatsapp', recipient: toPhone, eventType: 'WHATSAPP_MESSAGE', status: 'QUEUED', provider: this.provider, retryCount: 0, payload: { message } });
    if (!this.hasConsent(toPhone)) {
      await deliveryLogService.update(logId, { status: 'FAILED', error: 'Recipient has opted out of WhatsApp business communications.' });
      return { success: false, error: 'Recipient has opted out of WhatsApp business communications.' };
    }

    if (!this.isConfigured()) {
      const mockId = `wa_mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      console.log(`[WhatsAppService:DevMode] To: ${toPhone} | Tenant: ${tenantId || 'global'} | Message: "${message}"`);
      await deliveryLogService.update(logId, { status: 'SENT', providerId: mockId });
      return { success: true, messageId: mockId };
    }

    try {
      // Standard Meta Cloud API format
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone.replace(/\+/g, ''),
          type: 'text',
          text: { preview_url: true, body: message }
        })
      });

      const data = await response.json() as any;
      if (!response.ok) {
        const err = data.error?.message || 'Failed to dispatch WhatsApp message via Meta Cloud API.';
        console.error('[WhatsAppService:Error]', err);
        await deliveryLogService.update(logId, { status: 'FAILED', error: err });
        return { success: false, error: err };
      }

      await deliveryLogService.update(logId, { status: 'SENT', providerId: data.messages?.[0]?.id });
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      console.error('[WhatsAppService:NetworkError]', err.message);
      await deliveryLogService.update(logId, { status: 'FAILED', error: err.message });
      return { success: false, error: err.message };
    }
  }

  public async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    parameters: string[],
    tenantId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.hasConsent(toPhone)) {
      return { success: false, error: 'Recipient has opted out of WhatsApp notifications.' };
    }

    if (!this.isConfigured()) {
      const mockId = `wa_tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      console.log(`[WhatsAppService:DevMode:Template] To: ${toPhone} | Template: ${templateName} | Params: ${JSON.stringify(parameters)}`);
      return { success: true, messageId: mockId };
    }

    return this.sendWhatsAppMessage(toPhone, `[Template: ${templateName}] ${parameters.join(' - ')}`, tenantId);
  }
}
