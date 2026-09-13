import crypto from 'crypto';
import { IPaymentService, CreateOrderParams, VerifyPaymentParams } from './interfaces.js';

export class PaymentService implements IPaymentService {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private processedWebhooks = new Set<string>(); // Webhook event deduplication

  constructor() {
    this.keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    this.keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    this.webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  }

  public isConfigured(): boolean {
    return !!(this.keyId && this.keySecret);
  }

  public async createOrder(params: CreateOrderParams): Promise<{
    success: boolean;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    error?: string;
  }> {
    const amountInSubunits = Math.round(params.amount * 100);

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Razorpay integration is NOT_CONFIGURED. Payment processing requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
      };
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInSubunits,
          currency: params.currency,
          receipt: params.receipt,
          notes: params.notes || {}
        })
      });

      const data = await response.json() as any;
      if (!response.ok) {
        const errMsg = data.error?.description || `Razorpay order creation failed with status ${response.status}`;
        console.error('[PaymentService:Error]', errMsg);
        return { success: false, error: errMsg };
      }

      return {
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId: this.keyId
      };
    } catch (err: any) {
      console.error('[PaymentService:NetworkError]', err.message);
      return { success: false, error: err.message };
    }
  }

  public verifySignature(params: VerifyPaymentParams): boolean {
    if (!params.orderId || !params.paymentId || !params.signature) {
      return false;
    }

    if (!this.isConfigured()) {
      return false;
    }

    try {
      const body = `${params.orderId}|${params.paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(params.signature, 'utf-8')
      );
    } catch (err) {
      console.error('[PaymentService:SignatureVerificationError]', err);
      return false;
    }
  }

  public verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    const secret = this.webhookSecret || this.keySecret;
    if (!secret || !signature) {
      return false;
    }

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
      const expected = crypto
        .createHmac('sha256', secret)
        .update(bodyStr)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expected, 'utf-8'),
        Buffer.from(signature.trim(), 'utf-8')
      );
    } catch (err) {
      console.error('[PaymentService:WebhookSignatureError]', err);
      return false;
    }
  }

  public isWebhookProcessed(eventId: string): boolean {
    return this.processedWebhooks.has(eventId);
  }

  public markWebhookProcessed(eventId: string): void {
    this.processedWebhooks.add(eventId);
    if (this.processedWebhooks.size > 2000) {
      // Free older entries
      const iterator = this.processedWebhooks.values();
      for (let i = 0; i < 500; i++) {
        const item = iterator.next().value;
        if (item) this.processedWebhooks.delete(item);
      }
    }
  }

  public async refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Razorpay integration is NOT_CONFIGURED.' };
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const payload: any = {};
      if (amount) payload.amount = Math.round(amount * 100);

      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json() as any;
      if (!response.ok) {
        return { success: false, error: data.error?.description || 'Refund failed' };
      }

      return { success: true, refundId: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
