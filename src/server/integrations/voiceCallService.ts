import crypto from 'crypto';
import { integrationStore } from './integrationStore.js';

export interface LeadVoiceCallConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  voice: string;
  language: string;
}

export interface OutboundLeadCallParams {
  to: string;
  tenantId: string;
  leadId: string;
  conversationId: string;
  businessName: string;
  assistantName: string;
  baseUrl: string;
}

export class VoiceCallService {
  private getRuntimeConfig(): LeadVoiceCallConfig {
    const config = integrationStore.getPlatformConfig('twilio');
    return {
      accountSid: (config.accountSid || process.env.TWILIO_ACCOUNT_SID || '').trim(),
      authToken: (config.authToken || process.env.TWILIO_AUTH_TOKEN || '').trim(),
      fromNumber: (config.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '').trim(),
      voice: (config.voice || process.env.TWILIO_VOICE || 'Polly.Aditi').trim(),
      language: (config.voiceLanguage || process.env.TWILIO_VOICE_LANGUAGE || 'en-IN').trim()
    };
  }

  public isConfigured(): boolean {
    const config = this.getRuntimeConfig();
    return Boolean(config.accountSid && config.authToken && config.fromNumber);
  }

  public normalizePhone(phone: string, defaultCountryCode = process.env.DEFAULT_PHONE_COUNTRY_CODE || '91'): string | null {
    const raw = String(phone || '').trim();
    if (!raw) return null;
    const compact = raw.replace(/[\s().-]/g, '');
    if (compact.startsWith('+')) {
      const digits = compact.slice(1);
      return /^\d{8,15}$/.test(digits) ? '+' + digits : null;
    }
    if (!/^\d{8,15}$/.test(compact)) return null;
    if (compact.length === 10 && /^\d{2,4}$/.test(defaultCountryCode)) return '+' + defaultCountryCode + compact;
    return '+' + compact;
  }

  public async createOutboundLeadCall(params: OutboundLeadCallParams): Promise<{ success: boolean; sid?: string; to?: string; error?: string }> {
    const config = this.getRuntimeConfig();
    if (!config.accountSid || !config.authToken || !config.fromNumber) return { success: false, error: 'Twilio Voice is not configured.' };
    const to = this.normalizePhone(params.to);
    const from = this.normalizePhone(config.fromNumber);
    if (!to) return { success: false, error: 'Lead phone number is not a valid international phone number.' };
    if (!from) return { success: false, error: 'Twilio caller number is not a valid international phone number.' };

    const baseUrl = params.baseUrl.replace(/\/$/, '');
    const startUrl = new URL('/api/voice/lead/start', baseUrl);
    startUrl.searchParams.set('tenantId', params.tenantId);
    startUrl.searchParams.set('leadId', params.leadId);
    startUrl.searchParams.set('conversationId', params.conversationId);
    const statusUrl = new URL('/api/voice/lead/status', baseUrl);
    statusUrl.searchParams.set('tenantId', params.tenantId);
    statusUrl.searchParams.set('leadId', params.leadId);

    try {
      const authHeader = 'Basic ' + Buffer.from(params && config.accountSid + ':' + config.authToken).toString('base64');
      const form = new URLSearchParams();
      form.set('To', to);
      form.set('From', from);
      form.set('Url', startUrl.toString());
      form.set('Method', 'POST');
      form.set('StatusCallback', statusUrl.toString());
      form.set('StatusCallbackMethod', 'POST');
      form.append('StatusCallbackEvent', 'initiated');
      form.append('StatusCallbackEvent', 'ringing');
      form.append('StatusCallbackEvent', 'answered');
      form.append('StatusCallbackEvent', 'completed');
      form.set('Timeout', '30');
      const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(config.accountSid) + '/Calls.json', {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      const data = await response.json().catch(() => ({})) as any;
      if (!response.ok) return { success: false, error: data?.message || ('Twilio Voice error ' + (data?.code || response.status)) };
      return { success: true, sid: data?.sid, to };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to create outbound voice call.' };
    }
  }

  public getVoiceConfig(): LeadVoiceCallConfig { return this.getRuntimeConfig(); }

  public buildGreetingTwiml(params: { greeting: string; actionUrl: string; transferPrompt?: string }): string {
    const config = this.getRuntimeConfig();
    return xmlResponse(
      '<Gather input="speech" action="' + escapeXml(params.actionUrl) + '" method="POST" speechTimeout="auto" language="' + escapeXml(config.language) + '" actionOnEmptyResult="true">' +
      '<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">' + escapeXml(params.greeting) + '</Say></Gather>' +
      '<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">' + escapeXml(params.transferPrompt || 'I can connect you with a member of our team. Please hold for a moment.') + '</Say>'
    );
  }

  public buildAssistantTurnTwiml(params: { reply: string; actionUrl: string; isClosing?: boolean }): string {
    const config = this.getRuntimeConfig();
    if (params.isClosing) return xmlResponse('<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">' + escapeXml(params.reply) + '</Say><Hangup/>');
    return xmlResponse(
      '<Gather input="speech" action="' + escapeXml(params.actionUrl) + '" method="POST" speechTimeout="auto" language="' + escapeXml(config.language) + '" actionOnEmptyResult="true">' +
      '<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">' + escapeXml(params.reply) + '</Say></Gather>' +
      '<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">I did not hear anything. Let us continue when you are ready.</Say>'
    );
  }

  public buildTransferTwiml(humanPhone: string, prompt: string): string {
    const config = this.getRuntimeConfig();
    const human = this.normalizePhone(humanPhone);
    if (!human) return xmlResponse('<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">' + escapeXml(prompt) + '</Say><Hangup/>');
    return xmlResponse(
      '<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">' + escapeXml(prompt) + '</Say>' +
      '<Dial timeout="25"><Number>' + escapeXml(human) + '</Number></Dial>' +
      '<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">The team member was unavailable. Someone will follow up with you. Thank you.</Say><Hangup/>'
    );
  }

  public buildEndTwiml(message: string): string {
    const config = this.getRuntimeConfig();
    return xmlResponse('<Say voice="' + escapeXml(config.voice) + '" language="' + escapeXml(config.language) + '">' + escapeXml(message) + '</Say><Hangup/>');
  }

  public validateWebhookSignature(url: string, params: Record<string, any>, signature: string): boolean {
    const authToken = this.getRuntimeConfig().authToken;
    if (!authToken || !signature) return false;
    const normalized = Object.keys(params).sort().map(key => key + (params[key] ?? '')).join('');
    const expected = crypto.createHmac('sha1', authToken).update(url + normalized).digest('base64');
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }
}

function escapeXml(value: string): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function xmlResponse(body: string): string { return '<?xml version="1.0" encoding="UTF-8"?><Response>' + body + '</Response>'; }

export const voiceCallService = new VoiceCallService();
