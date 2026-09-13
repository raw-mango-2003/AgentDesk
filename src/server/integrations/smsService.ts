import { ISMSService } from './interfaces.js';

export class SMSService implements ISMSService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    this.authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    this.fromNumber = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  }

  public isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  public verifyPhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^\+?[1-9]\d{7,14}$/.test(cleaned);
  }

  public async sendSMS(to: string, message: string, tenantId?: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    if (!this.verifyPhone(to)) {
      return { success: false, error: 'Invalid international phone format. E.164 required (e.g. +1234567890).' };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Twilio SMS service is NOT_CONFIGURED. SMS delivery is disabled.'
      };
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', this.fromNumber);
      params.append('Body', message);

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json() as any;

      if (!response.ok) {
        const errorMsg = data.message || `Twilio SMS error code ${data.code || response.status}`;
        console.error('[SMSService:Error]', errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true, sid: data.sid };
    } catch (err: any) {
      console.error('[SMSService:NetworkError]', err.message);
      return { success: false, error: err.message || 'Failed to dispatch SMS' };
    }
  }
}
