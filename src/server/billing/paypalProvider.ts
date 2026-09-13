import {
  PaymentProvider,
  PaymentProviderName,
  CreateCustomerParams,
  ProviderCustomer,
  CreatePaymentParams,
  ProviderPayment,
  VerifyPaymentParams,
  VerifyPaymentResult,
  CreateSubscriptionParams,
  ProviderSubscription,
  CreateInvoiceParams,
  ProviderInvoice,
  SafePaymentMethod,
  WebhookResult,
  ProviderHealthReport
} from './paymentProvider.js';
import { CurrencyCode } from '../../types.js';
import { payPalWebhookService } from './paypalWebhookService.js';

export class PayPalProvider implements PaymentProvider {
  public name: PaymentProviderName = 'paypal';
  private clientId: string;
  private clientSecret: string;
  private environment: 'live' | 'sandbox';
  private webhookId: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
    this.clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
    const envRaw = (process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase();
    this.environment = envRaw === 'sandbox' ? 'sandbox' : 'live';
    this.webhookId = (process.env.PAYPAL_WEBHOOK_ID || '').trim();
  }

  public getBaseUrl(): string {
    return this.environment === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  public isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  public getPublicKey(): string {
    return this.clientId;
  }

  public getWebhookId(): string {
    return this.webhookId;
  }

  public getEnvironment(): 'live' | 'sandbox' {
    return this.environment;
  }

  public supportsCurrency(currency: CurrencyCode): boolean {
    // PayPal handles USD and GBP; INR is processed by Razorpay
    return currency === 'USD' || currency === 'GBP';
  }

  public supportsRecurring(currency: CurrencyCode): boolean {
    return currency === 'USD' || currency === 'GBP';
  }

  /**
   * Real server-side health check verifying PayPal credentials with PayPal OAuth API
   */
  public async checkHealth(): Promise<ProviderHealthReport> {
    const lastChecked = new Date().toISOString();
    if (!this.clientId || !this.clientSecret) {
      return {
        provider: 'paypal',
        status: 'Configuration Required',
        isConfigured: false,
        message: 'Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment',
        environment: this.environment,
        lastChecked
      };
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const res = await fetch(`${this.getBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.access_token) {
          return {
            provider: 'paypal',
            status: 'Connected',
            isConfigured: true,
            message: `PayPal ${this.environment.toUpperCase()} API connected and authenticated successfully`,
            environment: this.environment,
            lastChecked,
            details: {
              clientIdPrefix: `${this.clientId.substring(0, 8)}...`,
              webhookConfigured: Boolean(this.webhookId)
            }
          };
        }
      }

      if (res.status === 401) {
        return {
          provider: 'paypal',
          status: 'Authentication Failed',
          isConfigured: true,
          message: 'PayPal client authentication failed. PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is rejected by PayPal.',
          environment: this.environment,
          lastChecked
        };
      }

      return {
        provider: 'paypal',
        status: 'Unavailable',
        isConfigured: true,
        message: `PayPal API returned HTTP status ${res.status}`,
        environment: this.environment,
        lastChecked
      };
    } catch (err: any) {
      return {
        provider: 'paypal',
        status: 'Error',
        isConfigured: true,
        message: `Network error connecting to PayPal API: ${err.message}`,
        environment: this.environment,
        lastChecked
      };
    }
  }

  /**
   * Retrieve a live OAuth 2.0 access token from PayPal
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60000) {
      return this.cachedToken.token;
    }

    if (!this.isConfigured()) {
      throw new Error('PayPal credentials missing (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured)');
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.getBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401) {
        throw new Error('PayPal authentication failed: Client Authentication failed. Please verify live credentials.');
      }
      throw new Error(`PayPal token error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };
    return data.access_token;
  }

  /**
   * Create an authentic PayPal order on PayPal servers
   */
  public async createPayment(params: CreatePaymentParams): Promise<ProviderPayment> {
    const token = await this.getAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.businessId,
          description: params.description || 'AgentDesk Subscription & Setup',
          custom_id: params.businessId,
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2)
          }
        }
      ],
      application_context: {
        brand_name: 'AgentDesk Technologies',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.APP_URL || 'https://agentdesk.ai'}/checkout/paypal-success`,
        cancel_url: `${process.env.APP_URL || 'https://agentdesk.ai'}/checkout/paypal-cancel`
      }
    };

    const res = await fetch(`${this.getBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`PayPal order creation failed: ${err.message || JSON.stringify(err)}`);
    }

    const orderData = await res.json();
    const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

    return {
      id: orderData.id,
      provider: 'paypal',
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
      orderId: orderData.id,
      raw: {
        orderId: orderData.id,
        approveUrl: approveLink,
        status: orderData.status,
        links: orderData.links
      }
    };
  }

  /**
   * Capture a verified PayPal order after user approval
   */
  public async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const orderId = params.orderId || params.paymentId;
    if (!orderId) {
      return {
        verified: false,
        paymentId: '',
        transactionId: '',
        status: 'failed',
        message: 'Missing PayPal order ID for payment verification and capture'
      };
    }

    try {
      const token = await this.getAccessToken();

      // First check order status
      const getRes = await fetch(`${this.getBaseUrl()}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!getRes.ok) {
        throw new Error(`Failed to retrieve PayPal order ${orderId}`);
      }

      const orderInfo = await getRes.json();
      
      let captureId = '';
      let isCompleted = false;

      // If already captured
      const existingCapture = orderInfo.purchase_units?.[0]?.payments?.captures?.[0];
      if (existingCapture && existingCapture.status === 'COMPLETED') {
        captureId = existingCapture.id;
        isCompleted = true;
      } else if (orderInfo.status === 'APPROVED') {
        // Capture the order
        const captureRes = await fetch(`${this.getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!captureRes.ok) {
          const capErr = await captureRes.json();
          throw new Error(`PayPal capture error: ${capErr.message || JSON.stringify(capErr)}`);
        }

        const captureData = await captureRes.json();
        const cap = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        if (cap && cap.status === 'COMPLETED') {
          captureId = cap.id;
          isCompleted = true;
        } else if (captureData.status === 'COMPLETED') {
          captureId = captureData.id;
          isCompleted = true;
        }
      }

      if (isCompleted) {
        return {
          verified: true,
          paymentId: captureId || orderId,
          transactionId: orderId,
          status: 'paid',
          message: 'PayPal payment successfully captured and verified on server.'
        };
      }

      return {
        verified: false,
        paymentId: orderId,
        transactionId: orderId,
        status: 'pending',
        message: `PayPal order status is ${orderInfo.status}; payment has not been captured.`
      };
    } catch (err: any) {
      return {
        verified: false,
        paymentId: orderId,
        transactionId: orderId,
        status: 'failed',
        message: `PayPal capture and verification failed: ${err.message}`
      };
    }
  }

  public async createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer> {
    return {
      id: `paypal_cust_${Date.now()}`,
      provider: 'paypal',
      name: params.name,
      email: params.email,
      phone: params.phone,
      createdAt: new Date().toISOString()
    };
  }

  public async createSubscription(params: CreateSubscriptionParams): Promise<ProviderSubscription> {
    const token = await this.getAccessToken();

    const subPayload = {
      plan_id: params.planId,
      custom_id: params.businessId,
      application_context: {
        brand_name: 'AgentDesk Technologies',
        user_action: 'SUBSCRIBE_NOW'
      }
    };

    const res = await fetch(`${this.getBaseUrl()}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subPayload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`PayPal subscription creation failed: ${err.message || JSON.stringify(err)}`);
    }

    const subData = await res.json();
    const nextBill = subData.billing_info?.next_billing_time || new Date(Date.now() + 30 * 86400000).toISOString();
    return {
      id: subData.id,
      provider: 'paypal',
      providerSubscriptionId: subData.id,
      planId: params.planId,
      currency: params.currency,
      amount: params.monthlyAmount,
      status: 'pending',
      businessId: params.businessId,
      currentPeriodStart: subData.create_time,
      currentPeriodEnd: nextBill,
      nextBillingDate: nextBill,
      raw: subData
    };
  }

  public async getSubscription(subscriptionId: string): Promise<ProviderSubscription> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.getBaseUrl()}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch PayPal subscription ${subscriptionId}`);
    }

    const data = await res.json();
    const nextBilling = data.billing_info?.next_billing_time || new Date(Date.now() + 30 * 86400000).toISOString();
    return {
      id: data.id,
      provider: 'paypal',
      providerSubscriptionId: data.id,
      planId: data.plan_id,
      currency: (data.billing_info?.last_payment?.amount?.currency_code as CurrencyCode) || 'USD',
      amount: parseFloat(data.billing_info?.last_payment?.amount?.value || '0'),
      status: data.status === 'ACTIVE' ? 'active' : (data.status === 'CANCELLED' ? 'cancelled' : 'pending'),
      businessId: data.custom_id || '',
      currentPeriodStart: data.start_time || new Date().toISOString(),
      currentPeriodEnd: nextBilling,
      nextBillingDate: nextBilling,
      raw: data
    };
  }

  public async updateSubscription(subscriptionId: string, planId: string): Promise<ProviderSubscription> {
    return this.getSubscription(subscriptionId);
  }

  public async pauseSubscription(subscriptionId: string): Promise<ProviderSubscription> {
    const token = await this.getAccessToken();
    await fetch(`${this.getBaseUrl()}/v1/billing/subscriptions/${subscriptionId}/suspend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Customer requested suspension' })
    });
    return this.getSubscription(subscriptionId);
  }

  public async resumeSubscription(subscriptionId: string): Promise<ProviderSubscription> {
    const token = await this.getAccessToken();
    await fetch(`${this.getBaseUrl()}/v1/billing/subscriptions/${subscriptionId}/activate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Reactivation' })
    });
    return this.getSubscription(subscriptionId);
  }

  public async cancelSubscription(subscriptionId: string): Promise<ProviderSubscription> {
    const token = await this.getAccessToken();
    await fetch(`${this.getBaseUrl()}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Customer cancelled subscription' })
    });
    return this.getSubscription(subscriptionId);
  }

  public async listPaymentMethods(_customerId: string, _businessId: string): Promise<SafePaymentMethod[]> {
    return [];
  }

  public async setPrimaryPaymentMethod(_businessId: string, _paymentMethodId: string): Promise<boolean> {
    return true;
  }

  public async removePaymentMethod(_businessId: string, _paymentMethodId: string): Promise<boolean> {
    return true;
  }

  /**
   * Real PayPal Invoicing API v2 integration
   */
  public async createInvoice(params: CreateInvoiceParams): Promise<ProviderInvoice> {
    const token = await this.getAccessToken();

    // 1. Generate invoice number
    const numRes = await fetch(`${this.getBaseUrl()}/v2/invoicing/generate-next-invoice-number`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    let invoiceNumber = `INV-${Date.now()}`;
    if (numRes.ok) {
      const numData = await numRes.json();
      invoiceNumber = numData.invoice_number || invoiceNumber;
    }

    // 2. Draft invoice payload
    const items = params.items && params.items.length > 0
      ? params.items.map(it => ({
          name: it.name,
          quantity: it.quantity.toString(),
          unit_amount: {
            currency_code: params.currency,
            value: it.amount.toFixed(2)
          }
        }))
      : [
          {
            name: params.description || 'AgentDesk Platform Fee',
            quantity: '1',
            unit_amount: {
              currency_code: params.currency,
              value: params.amount.toFixed(2)
            }
          }
        ];

    const invoicePayload = {
      detail: {
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        currency_code: params.currency,
        note: 'Thank you for choosing AgentDesk AI RevenueOS.'
      },
      invoicer: {
        name: { given_name: 'AgentDesk Technologies Inc.' }
      },
      items
    };

    const invRes = await fetch(`${this.getBaseUrl()}/v2/invoicing/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    });

    if (!invRes.ok) {
      const err = await invRes.json();
      throw new Error(`PayPal invoice creation failed: ${err.message || JSON.stringify(err)}`);
    }

    const invData = await invRes.json();
    const invoiceId = invData.id || invData.rel;
    const viewUrl = invData.href || `https://www.paypal.com/invoice/p/#${invoiceId}`;

    return {
      id: invoiceId,
      invoiceNumber,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      provider: 'paypal',
      hostedInvoiceUrl: viewUrl,
      createdAt: new Date().toISOString()
    };
  }

  public async getInvoice(invoiceId: string): Promise<ProviderInvoice> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.getBaseUrl()}/v2/invoicing/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to retrieve PayPal invoice ${invoiceId}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      invoiceNumber: data.detail?.invoice_number || invoiceId,
      amount: parseFloat(data.amount?.value || '0'),
      currency: (data.amount?.currency_code as CurrencyCode) || 'USD',
      status: data.status === 'PAID' ? 'PAID' : 'PENDING',
      provider: 'paypal',
      hostedInvoiceUrl: data.detail?.metadata?.recipient_view_url,
      createdAt: data.detail?.invoice_date || new Date().toISOString()
    };
  }

  public async handleWebhook(body: any, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult> {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const result = await payPalWebhookService.handleWebhook(rawBody, body, headers);
    return {
      handled: result.status === 200,
      event: body?.event_type || 'PAYPAL_EVENT',
      status: result.status === 200 ? 'SUCCESS' : 'FAILED',
      data: result.body
    };
  }
}

export const paypalProvider = new PayPalProvider();
