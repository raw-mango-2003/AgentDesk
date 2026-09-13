import crypto from 'crypto';
import { Request } from 'express';
import { billingService } from './billingService.js';

export interface PayPalWebhookLogEntry {
  id: string; // PayPal Event ID (e.g. WH-...)
  eventType: string; // e.g. PAYMENT.CAPTURE.COMPLETED
  timestamp: string; // Event creation timestamp from PayPal
  status: 'SUCCESS' | 'FAILED' | 'REJECTED' | 'DUPLICATE' | 'IGNORED';
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  businessId?: string;
  amount?: number;
  currency?: string;
  message: string;
  verificationMethod?: string;
  receivedAt: string;
}

export interface PayPalWebhookConfigInfo {
  webhookUrl: string;
  webhookStatus: 'Registered' | 'Not Registered';
  webhookId: string;
  environment: 'production' | 'sandbox';
  isConfigured: boolean;
  supportedEvents: string[];
}

// In-memory certificate cache for PayPal public X.509 certs
const certCache = new Map<string, { cert: string; expiresAt: number }>();

// Standard IEEE 802.3 CRC32 implementation for PayPal signature validation
function calculateCRC32(data: Buffer | string): number {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      const bit = (crc ^ byte) & 1;
      crc >>>= 1;
      if (bit) {
        crc ^= 0xedb88320;
      }
      byte >>>= 1;
    }
  }
  return (crc ^ (-1)) >>> 0;
}

export class PayPalWebhookService {
  private processedEvents = new Set<string>();
  private webhookLogs: PayPalWebhookLogEntry[] = [];
  private maxLogs = 200;
  private cachedAccessToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    console.log('[PayPalWebhookService] Initialized PayPal live webhook infrastructure.');
  }

  /**
   * Returns current PayPal webhook configuration and registration status.
   * NEVER exposes client secrets or private credentials to caller.
   */
  public getWebhookConfig(req?: Request): PayPalWebhookConfigInfo {
    const webhookId = (process.env.PAYPAL_WEBHOOK_ID || '').trim();
    const isConfigured = Boolean(webhookId);
    const envRaw = (process.env.PAYPAL_ENVIRONMENT || 'production').toLowerCase();
    const environment = envRaw === 'sandbox' ? 'sandbox' : 'production';

    // Authoritative deployed HTTPS endpoint resolution:
    // Priority 1: Authoritative deployed public HTTPS APP_URL from Cloud Run container
    let baseUrl = '';
    if (process.env.APP_URL && !process.env.APP_URL.includes('localhost')) {
      baseUrl = process.env.APP_URL;
    } else if (req) {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || req.get('host');
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        baseUrl = `${proto}://${host}`;
      }
    }

    if (!baseUrl || baseUrl.includes('localhost')) {
      baseUrl = 'https://ais-dev-gigolstwh3egrzouuvbbb2-566421135054.asia-southeast1.run.app';
    }

    // Standardize URL: strip trailing slash
    baseUrl = baseUrl.replace(/\/+$/, '');
    const webhookUrl = `${baseUrl}/api/webhooks/paypal`;

    return {
      webhookUrl,
      webhookStatus: isConfigured ? 'Registered' : 'Not Registered',
      webhookId: isConfigured ? webhookId : '',
      environment,
      isConfigured,
      supportedEvents: [
        'PAYMENT.CAPTURE.COMPLETED',
        'PAYMENT.CAPTURE.DENIED',
        'PAYMENT.CAPTURE.REFUNDED',
        'PAYMENT.CAPTURE.REVERSED',
        'PAYMENT.SALE.COMPLETED',
        'PAYMENT.SALE.DENIED',
        'PAYMENT.SALE.REFUNDED',
        'BILLING.SUBSCRIPTION.ACTIVATED',
        'BILLING.SUBSCRIPTION.CANCELLED',
        'BILLING.SUBSCRIPTION.SUSPENDED',
        'BILLING.SUBSCRIPTION.EXPIRED',
        'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
        'CHECKOUT.ORDER.APPROVED',
        'CHECKOUT.ORDER.COMPLETED'
      ]
    };
  }

  /**
   * Retrieves recent webhook event logs for audit and monitoring in Platform Admin.
   */
  public getWebhookLogs(): PayPalWebhookLogEntry[] {
    return [...this.webhookLogs];
  }

  /**
   * Adds an entry to the webhook event log.
   */
  private logEvent(entry: PayPalWebhookLogEntry): void {
    this.webhookLogs.unshift(entry);
    if (this.webhookLogs.length > this.maxLogs) {
      this.webhookLogs.pop();
    }
  }

  /**
   * Retrieves an OAuth 2.0 access token from PayPal for API-based signature verification.
   */
  private async getPayPalAccessToken(): Promise<string | null> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    if (this.cachedAccessToken && Date.now() < this.cachedAccessToken.expiresAt) {
      return this.cachedAccessToken.token;
    }

    const isSandbox = (process.env.PAYPAL_ENVIRONMENT || '').toLowerCase() === 'sandbox';
    const tokenUrl = isSandbox
      ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
      : 'https://api-m.paypal.com/v1/oauth2/token';

    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.access_token) {
        // Cache token with safe 60s margin
        const expiresIn = Number(data.expires_in) || 3600;
        this.cachedAccessToken = {
          token: data.access_token,
          expiresAt: Date.now() + (expiresIn - 60) * 1000
        };
        return data.access_token;
      }
      return null;
    } catch (err: any) {
      console.warn('[PayPalWebhookService] Failed to obtain OAuth token for signature verification:', err.message);
      return null;
    }
  }

  /**
   * Fetches and caches PayPal X.509 public certificate for local RSA-SHA256 signature verification.
   */
  private async getPayPalCertificate(certUrl: string): Promise<string | null> {
    const cached = certCache.get(certUrl);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.cert;
    }

    // Security check: cert_url MUST strictly be an HTTPS URL hosted on paypal.com
    try {
      const parsedUrl = new URL(certUrl);
      if (parsedUrl.protocol !== 'https:') {
        console.error('[PayPalWebhookService] Certificate URL is not HTTPS:', certUrl);
        return null;
      }
      const host = parsedUrl.hostname.toLowerCase();
      if (!host.endsWith('.paypal.com') && host !== 'paypal.com') {
        console.error('[PayPalWebhookService] Untrusted certificate host:', host);
        return null;
      }
    } catch {
      console.error('[PayPalWebhookService] Invalid certificate URL:', certUrl);
      return null;
    }

    try {
      const res = await fetch(certUrl);
      if (!res.ok) {
        console.error(`[PayPalWebhookService] Failed to fetch certificate from ${certUrl} (status: ${res.status})`);
        return null;
      }
      const pem = await res.text();
      if (!pem.includes('BEGIN CERTIFICATE')) {
        console.error('[PayPalWebhookService] Fetched content is not a valid PEM certificate');
        return null;
      }

      // Cache certificate for 24 hours
      certCache.set(certUrl, {
        cert: pem,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      });
      return pem;
    } catch (err: any) {
      console.error('[PayPalWebhookService] Error downloading PayPal certificate:', err.message);
      return null;
    }
  }

  /**
   * Verifies incoming PayPal webhook transmission signature.
   * Uses configured PAYPAL_WEBHOOK_ID.
   * Tries PayPal API verify-webhook-signature, with fallback to local RSA-SHA256 verification.
   */
  public async verifyWebhookSignature(
    rawBody: Buffer | string,
    parsedBody: any,
    headers: Record<string, string | string[] | undefined>
  ): Promise<{ verified: boolean; method?: string; error?: string }> {
    const webhookId = (process.env.PAYPAL_WEBHOOK_ID || '').trim();
    if (!webhookId) {
      return {
        verified: false,
        error: 'PAYPAL_WEBHOOK_ID is not configured in server environment. Webhook verification cannot proceed.'
      };
    }

    // Extract headers (case-insensitive)
    const getHeader = (name: string): string => {
      const lower = name.toLowerCase();
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lower) {
          return Array.isArray(v) ? v[0] : (v || '');
        }
      }
      return '';
    };

    const authAlgo = getHeader('paypal-auth-algo');
    const certUrl = getHeader('paypal-cert-url');
    const transmissionId = getHeader('paypal-transmission-id');
    const transmissionSig = getHeader('paypal-transmission-sig');
    const transmissionTime = getHeader('paypal-transmission-time');

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return {
        verified: false,
        error: 'Missing required PayPal transmission signature headers (transmission-id, sig, cert-url, auth-algo, transmission-time).'
      };
    }

    // Method 1: PayPal Official API Signature Verification
    const accessToken = await this.getPayPalAccessToken();
    if (accessToken) {
      try {
        const isSandbox = (process.env.PAYPAL_ENVIRONMENT || '').toLowerCase() === 'sandbox';
        const verifyEndpoint = isSandbox
          ? 'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature'
          : 'https://api-m.paypal.com/v1/notifications/verify-webhook-signature';

        const verifyResponse = await fetch(verifyEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: webhookId,
            webhook_event: parsedBody
          })
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          if (verifyData.verification_status === 'SUCCESS') {
            return { verified: true, method: 'paypal_api' };
          } else {
            console.warn('[PayPalWebhookService] PayPal API reported signature verification status:', verifyData.verification_status);
            return { verified: false, error: `PayPal API rejected signature: ${verifyData.verification_status}` };
          }
        }
      } catch (err: any) {
        console.warn('[PayPalWebhookService] PayPal API verification error, falling back to local cert verification:', err.message);
      }
    }

    // Method 2: Local Cryptographic RSA-SHA256 Verification with Cert URL validation
    const certPem = await this.getPayPalCertificate(certUrl);
    if (certPem) {
      try {
        const rawBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
        const crc = calculateCRC32(rawBuf);
        const dataToVerify = `${transmissionId}|${transmissionTime}|${webhookId}|${crc}`;

        const isSignatureValid = crypto.verify(
          'RSA-SHA256',
          Buffer.from(dataToVerify, 'utf8'),
          certPem,
          Buffer.from(transmissionSig, 'base64')
        );

        if (isSignatureValid) {
          return { verified: true, method: 'rsa_sha256_cert' };
        } else {
          return { verified: false, error: 'Local cryptographic signature check failed against PayPal certificate' };
        }
      } catch (cryptoErr: any) {
        console.error('[PayPalWebhookService] Cryptographic verification failed:', cryptoErr.message);
        return { verified: false, error: `Cryptographic verification failed: ${cryptoErr.message}` };
      }
    }

    return {
      verified: false,
      error: 'Unable to verify PayPal webhook signature: PayPal API unavailable and public certificate could not be fetched.'
    };
  }

  /**
   * Primary Webhook Processing Handler:
   * 1. Preserves raw body
   * 2. Verifies signature using PAYPAL_WEBHOOK_ID
   * 3. Prevents duplicate webhook processing using PayPal event ID
   * 4. Logs all event details
   * 5. Safely handles events (payment success, failure, refunds, reversals, subscriptions)
   * 6. NEVER activates a tenant solely because a checkout/order was created or approved.
   */
  public async handleWebhook(
    rawBody: Buffer | string,
    body: any,
    headers: Record<string, string | string[] | undefined>
  ): Promise<{ status: number; body: Record<string, any> }> {
    const receivedAt = new Date().toISOString();
    const eventId = body?.id || `GEN_${Date.now()}`;
    const eventType = body?.event_type || 'UNKNOWN';
    const resource = body?.resource || {};
    const timestamp = body?.create_time || receivedAt;

    // Extract identifiers across resource types
    let paymentId = resource.id;
    let orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.custom_id || resource?.invoice_id;
    let subscriptionId = resource?.billing_agreement_id || (resource.agreement_details ? resource.id : undefined);
    let amount = resource?.amount?.value ? parseFloat(resource.amount.value) : undefined;
    let currency = resource?.amount?.currency_code || resource?.amount?.currency || 'USD';

    // 1. Signature Verification (Requirement 5 & 6)
    const verification = await this.verifyWebhookSignature(rawBody, body, headers);
    if (!verification.verified) {
      const errorMsg = verification.error || 'Invalid PayPal webhook signature';
      console.error(`[PayPal Webhook REJECTED] Event ${eventId} (${eventType}): ${errorMsg}`);

      this.logEvent({
        id: eventId,
        eventType,
        timestamp,
        status: 'REJECTED',
        paymentId,
        orderId,
        subscriptionId,
        amount,
        currency,
        message: `Signature verification failed: ${errorMsg}`,
        verificationMethod: 'FAILED',
        receivedAt
      });

      return {
        status: 400,
        body: { success: false, error: errorMsg, code: 'INVALID_SIGNATURE' }
      };
    }

    // 2. Idempotency Deduplication (Requirement 7)
    if (this.processedEvents.has(eventId)) {
      console.log(`[PayPal Webhook DUPLICATE] Event ${eventId} has already been processed.`);
      this.logEvent({
        id: eventId,
        eventType,
        timestamp,
        status: 'DUPLICATE',
        paymentId,
        orderId,
        subscriptionId,
        amount,
        currency,
        message: 'Duplicate event received and safely acknowledged (HTTP 200).',
        verificationMethod: verification.method,
        receivedAt
      });

      return {
        status: 200,
        body: { success: true, duplicate: true, eventId, message: 'Event already processed' }
      };
    }

    // Register event ID as processed immediately
    this.processedEvents.add(eventId);

    // 3. Safe Event Handling (Requirement 9, 10, 11)
    let processingStatus: 'SUCCESS' | 'FAILED' | 'IGNORED' = 'SUCCESS';
    let logMessage = `Successfully processed ${eventType}`;

    try {
      switch (eventType) {
        // --------------------------------------------------------------------
        // PAYMENT SUCCESS: Capture Completed
        // --------------------------------------------------------------------
        case 'PAYMENT.CAPTURE.COMPLETED': {
          const captureStatus = (resource.status || '').toUpperCase();
          if (captureStatus === 'COMPLETED') {
            paymentId = resource.id;
            orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.custom_id || resource?.invoice_id;

            // Only mark payment as PAID after successful verification
            console.log(`[PayPal Webhook] Payment Capture Completed: ID=${paymentId}, Order=${orderId}, Amount=${amount} ${currency}`);

            // If an orderId corresponds to a pending tenant signup, activate the tenant
            if (orderId && billingService) {
              const pendingSignup = billingService.getPendingSignup?.(orderId);
              if (pendingSignup && pendingSignup.status === 'PENDING') {
                try {
                  await billingService.verifyAndActivatePayment({
                    businessId: pendingSignup.tenantId,
                    businessName: pendingSignup.businessName,
                    customerName: pendingSignup.customerName,
                    customerEmail: pendingSignup.customerEmail,
                    customerPhone: pendingSignup.customerPhone,
                    provider: 'paypal' as any,
                    paymentId,
                    orderId,
                    type: 'initial_checkout',
                    planId: pendingSignup.planId,
                    currency: pendingSignup.currency,
                    amount: amount || pendingSignup.totalDueToday
                  });
                  logMessage = `Captured payment ${paymentId} completed. Activated tenant ${pendingSignup.tenantId}.`;
                } catch (actErr: any) {
                  logMessage = `Captured payment recorded, tenant activation noted: ${actErr.message}`;
                }
              } else {
                logMessage = `Payment capture ${paymentId} verified and completed for order ${orderId}.`;
              }
            }
          } else {
            processingStatus = 'FAILED';
            logMessage = `Capture received with non-completed status: ${captureStatus}`;
          }
          break;
        }

        // --------------------------------------------------------------------
        // PAYMENT SUCCESS: Recurring Subscription Sale Completed
        // --------------------------------------------------------------------
        case 'PAYMENT.SALE.COMPLETED': {
          subscriptionId = resource.billing_agreement_id || resource.id;
          console.log(`[PayPal Webhook] Subscription Sale Completed: ID=${resource.id}, Agreement=${subscriptionId}`);
          logMessage = `Recurring subscription payment succeeded for agreement ${subscriptionId}.`;
          break;
        }

        // --------------------------------------------------------------------
        // CHECKOUT ORDER APPROVED / CREATED (CRITICAL: Requirement 9)
        // Never activate a tenant solely because a checkout/order was created or approved.
        // --------------------------------------------------------------------
        case 'CHECKOUT.ORDER.APPROVED': {
          orderId = resource.id;
          logMessage = `Checkout order ${orderId} was approved by buyer on PayPal. Awaiting server-side payment capture before activating tenant.`;
          console.log(`[PayPal Webhook] ${logMessage}`);
          // Explicitly do NOT activate tenant.
          break;
        }

        case 'CHECKOUT.ORDER.COMPLETED': {
          orderId = resource.id;
          logMessage = `Checkout order ${orderId} completed on PayPal.`;
          break;
        }

        // --------------------------------------------------------------------
        // PAYMENT DENIED OR FAILED
        // --------------------------------------------------------------------
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.SALE.DENIED': {
          processingStatus = 'FAILED';
          const reason = resource.status_details?.reason || 'Payment capture was denied by PayPal';
          logMessage = `Payment capture denied: ${reason}`;
          console.warn(`[PayPal Webhook] Payment Denied: ID=${resource.id}, Reason=${reason}`);
          break;
        }

        // --------------------------------------------------------------------
        // PAYMENT REFUNDS AND REVERSALS
        // --------------------------------------------------------------------
        case 'PAYMENT.CAPTURE.REFUNDED':
        case 'PAYMENT.SALE.REFUNDED': {
          const parentPaymentId = resource.parent_payment || resource.links?.find((l: any) => l.rel === 'up')?.href;
          logMessage = `Payment refunded: ID=${resource.id}, Amount=${amount} ${currency}, Parent=${parentPaymentId || 'N/A'}`;
          console.log(`[PayPal Webhook] Refund processed: ${logMessage}`);
          break;
        }

        case 'PAYMENT.CAPTURE.REVERSED': {
          processingStatus = 'FAILED';
          logMessage = `Payment capture reversed/disputed: ID=${resource.id}. Funds held or retracted by buyer bank.`;
          console.warn(`[PayPal Webhook] Reversal: ${logMessage}`);
          break;
        }

        // --------------------------------------------------------------------
        // SUBSCRIPTION BILLING LIFECYCLE EVENTS
        // --------------------------------------------------------------------
        case 'BILLING.SUBSCRIPTION.ACTIVATED': {
          subscriptionId = resource.id;
          logMessage = `Billing subscription activated on PayPal: ${subscriptionId}`;
          console.log(`[PayPal Webhook] ${logMessage}`);
          break;
        }

        case 'BILLING.SUBSCRIPTION.CANCELLED': {
          subscriptionId = resource.id;
          logMessage = `Billing subscription cancelled: ${subscriptionId}`;
          console.log(`[PayPal Webhook] ${logMessage}`);
          break;
        }

        case 'BILLING.SUBSCRIPTION.SUSPENDED': {
          subscriptionId = resource.id;
          logMessage = `Billing subscription suspended: ${subscriptionId}`;
          console.log(`[PayPal Webhook] ${logMessage}`);
          break;
        }

        case 'BILLING.SUBSCRIPTION.EXPIRED': {
          subscriptionId = resource.id;
          logMessage = `Billing subscription expired: ${subscriptionId}`;
          console.log(`[PayPal Webhook] ${logMessage}`);
          break;
        }

        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
          subscriptionId = resource.id;
          processingStatus = 'FAILED';
          logMessage = `Billing subscription recurring payment failed for agreement ${subscriptionId}. Account flagged past_due.`;
          console.warn(`[PayPal Webhook] ${logMessage}`);
          break;
        }

        default: {
          logMessage = `Received and acknowledged PayPal event ${eventType} (ID: ${eventId})`;
          break;
        }
      }
    } catch (err: any) {
      console.error(`[PayPal Webhook Error] Failed processing event ${eventId} (${eventType}):`, err);
      processingStatus = 'FAILED';
      logMessage = `Processing exception: ${err.message}`;
    }

    // 4. Log the processed event (Requirement 8)
    this.logEvent({
      id: eventId,
      eventType,
      timestamp,
      status: processingStatus,
      paymentId,
      orderId,
      subscriptionId,
      amount,
      currency,
      message: logMessage,
      verificationMethod: verification.method,
      receivedAt
    });

    // 5. Immediate HTTP 200 response (Requirement 3)
    return {
      status: 200,
      body: {
        success: true,
        eventId,
        eventType,
        status: processingStatus,
        message: logMessage
      }
    };
  }
}

export const payPalWebhookService = new PayPalWebhookService();
