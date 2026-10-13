import { ISMSService } from './interfaces.js';

/** SMS is intentionally disabled to prevent accidental paid dispatches. */
export class SMSService implements ISMSService {
  public isConfigured(): boolean { return false; }

  public verifyPhone(phone: string): boolean {
    const cleaned = phone.replace(/[\\s\\-\\(\\)]/g, '');
    return /^\\+?[1-9]\\d{7,14}$/.test(cleaned);
  }

  public async sendSMS(_to: string, _message: string, _tenantId?: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    return { success: false, error: 'SMS delivery is disabled in AgentDesk. Use WhatsApp messaging instead.' };
  }
}
