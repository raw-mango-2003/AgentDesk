import crypto from 'crypto';
import { IOTPService } from './interfaces.js';

interface StoredOTP {
  identifier: string; // phone or email
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  channel: 'sms' | 'email';
}

export class OTPService implements IOTPService {
  private accountSid: string;
  private authToken: string;
  private verifyServiceSid: string;
  private localStore = new Map<string, StoredOTP>();

  constructor() {
    this.accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    this.authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    this.verifyServiceSid = (process.env.TWILIO_VERIFY_SERVICE_SID || '').trim();

    // Clean expired local OTPs periodically
    setInterval(() => {
      const now = Date.now();
      for (const [id, otp] of this.localStore.entries()) {
        if (now > otp.expiresAt) {
          this.localStore.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }

  public isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.verifyServiceSid);
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code.trim()).digest('hex');
  }

  public async sendOTP(identifier: string, channel: 'sms' | 'email' = 'sms'): Promise<{ success: boolean; error?: string; status?: string; debugCode?: string }> {
    const cleanId = identifier.trim().toLowerCase();

    // If Twilio Verify Service is configured and channel is SMS
    if (this.isConfigured() && channel === 'sms') {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', cleanId);
        params.append('Channel', 'sms');

        const url = `https://verify.twilio.com/v2/Services/${this.verifyServiceSid}/Verifications`;
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
          return { success: false, error: data.message || 'Failed to dispatch verification code via Twilio Verify.' };
        }

        return { success: true, status: data.status };
      } catch (err: any) {
        console.error('[OTPService:TwilioError]', err.message);
        return { success: false, error: err.message };
      }
    }

    // Secure local fallback generator (6-digit numeric OTP)
    const code = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
    const codeHash = this.hashCode(code);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.localStore.set(cleanId, {
      identifier: cleanId,
      codeHash,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      channel
    });

    console.log(`[OTPService:Local] Verification Code for ${cleanId} [${channel.toUpperCase()}]: ${code}`);

    return {
      success: true,
      status: 'pending',
      debugCode: process.env.NODE_ENV !== 'production' ? code : undefined
    };
  }

  public async verifyOTP(identifier: string, code: string): Promise<{ success: boolean; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = code.trim();

    // Check with Twilio Verify if configured
    if (this.isConfigured()) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', cleanId);
        params.append('Code', cleanCode);

        const url = `https://verify.twilio.com/v2/Services/${this.verifyServiceSid}/VerificationCheck`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        const data = await response.json() as any;
        if (!response.ok || data.status !== 'approved') {
          return { success: false, error: data.message || 'Invalid or expired verification code.' };
        }

        return { success: true };
      } catch (err: any) {
        console.error('[OTPService:VerifyCheckError]', err.message);
        return { success: false, error: err.message };
      }
    }

    // Local fallback check
    const record = this.localStore.get(cleanId);
    if (!record) {
      return { success: false, error: 'No verification code requested or code has expired.' };
    }

    if (Date.now() > record.expiresAt) {
      this.localStore.delete(cleanId);
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (record.attempts >= record.maxAttempts) {
      this.localStore.delete(cleanId);
      return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
    }

    record.attempts += 1;
    const inputHash = this.hashCode(cleanCode);

    if (crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(record.codeHash))) {
      // Invalidate immediately upon successful verification
      this.localStore.delete(cleanId);
      return { success: true };
    }

    const remainingAttempts = record.maxAttempts - record.attempts;
    return {
      success: false,
      error: `Invalid verification code. ${remainingAttempts} attempts remaining.`
    };
  }
}
