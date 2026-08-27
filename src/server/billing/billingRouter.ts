import { Router, Request, Response } from 'express';
import { billingService } from './billingService.js';
import { CurrencyCode } from '../../types.js';

export const billingRouter = Router();

// 1. Public Billing & Provider Configuration
billingRouter.get('/config', (req: Request, res: Response) => {
  const currency = (req.query.currency as CurrencyCode) || 'USD';
  const country = (req.query.country as string) || 'US';

  const razorpay = billingService.getProvider('razorpay') as any;
  const paypal = billingService.getProvider('paypal') as any;

  const isPaymentsEnabled = Boolean(
    (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) ||
    (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
  );

  const availableProviders = billingService.getAvailableProviders(currency, country);

  res.json({
    success: true,
    supportedCurrencies: ['USD', 'INR', 'GBP'],
    isPaymentsEnabled,
    availableProviders,
    publicKeys: {
      razorpay: razorpay.getPublicKey?.() || '',
      paypalClientId: paypal.getClientId?.() || ''
    },
    mode: isPaymentsEnabled ? 'production' : 'disabled'
  });
});

// 2. Tenant Billing Info
billingRouter.get('/tenant/:businessId', (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const billing = billingService.getTenantBilling(businessId);
    const paymentMethods = billingService.getPaymentMethods(businessId);
    const invoices = billingService.getInvoices(businessId);
    const transactions = billingService.getTransactions(businessId);

    return res.json({
      success: true,
      billing,
      paymentMethods,
      invoices,
      transactions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Create Checkout Session (Implementation Fee or Monthly Subscription)
billingRouter.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { businessId, planId, type, currency, provider, customerEmail, customerName } = req.body;

    if (!businessId || !planId || !type || !currency || !provider) {
      return res.status(400).json({ error: 'Missing required parameters for checkout session' });
    }

    // Check if payments are enabled in the environment
    const targetProvider = billingService.getProvider(provider as any);
    if (!targetProvider || !targetProvider.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Online payments are temporarily unavailable. Please contact sales.'
      });
    }

    // PayPal INR Rule Enforcement
    if (provider === 'paypal' && currency === 'INR') {
      return res.status(400).json({
        error: 'PayPal does not support INR subscriptions. Please select Razorpay for INR billing.'
      });
    }

    const session = await billingService.createCheckoutSession({
      businessId,
      planId,
      type,
      currency,
      providerName: provider,
      customerEmail,
      customerName
    });

    return res.json(session);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Verify & Activate Payment
billingRouter.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const {
      businessId,
      provider,
      paymentId,
      orderId,
      subscriptionId,
      signature,
      type,
      planId,
      currency,
      amount,
      paymentMethodData
    } = req.body;

    if (!businessId || !provider) {
      return res.status(400).json({ error: 'Business ID and provider are required.' });
    }

    const targetProvider = billingService.getProvider(provider as any);
    if (!targetProvider || !targetProvider.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Online payments are temporarily unavailable. Please contact sales.'
      });
    }

    const result = await billingService.verifyAndActivatePayment({
      businessId,
      provider,
      paymentId,
      orderId,
      subscriptionId,
      signature,
      type: type || 'subscription',
      planId: planId || 'growth',
      currency: currency || 'USD',
      amount: amount || 1497,
      paymentMethodData
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Subscription Updates (Upgrade, Downgrade, Change Plan)
billingRouter.post('/subscription/update', async (req: Request, res: Response) => {
  try {
    const { businessId, planId, customPrice } = req.body;
    if (!businessId || !planId) {
      return res.status(400).json({ error: 'businessId and planId are required' });
    }

    const updated = await billingService.updatePlan(businessId, planId, customPrice);
    return res.json({ success: true, billing: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Subscription Lifecycle (Pause, Resume, Cancel)
billingRouter.post('/subscription/pause', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.body;
    const updated = await billingService.pauseSubscription(businessId);
    return res.json({ success: true, billing: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

billingRouter.post('/subscription/resume', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.body;
    const updated = await billingService.resumeSubscription(businessId);
    return res.json({ success: true, billing: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

billingRouter.post('/subscription/cancel', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.body;
    const updated = await billingService.cancelSubscription(businessId);
    return res.json({ success: true, billing: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Payment Methods Management
billingRouter.post('/payment-methods/add', async (req: Request, res: Response) => {
  try {
    const { businessId, brand, last4, expiry, provider, isPrimary } = req.body;
    if (!businessId || !brand || !last4 || !provider) {
      return res.status(400).json({ error: 'Missing payment method details' });
    }

    const newMethod = await billingService.addPaymentMethod(businessId, {
      businessId,
      brand,
      last4,
      expiry: expiry || '12/28',
      provider,
      providerPaymentMethodId: `tok_${provider}_${Date.now()}`,
      isPrimary: Boolean(isPrimary)
    });

    return res.json({ success: true, paymentMethod: newMethod });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

billingRouter.post('/payment-methods/set-primary', async (req: Request, res: Response) => {
  try {
    const { businessId, paymentMethodId } = req.body;
    if (!businessId || !paymentMethodId) {
      return res.status(400).json({ error: 'businessId and paymentMethodId are required' });
    }

    await billingService.setPrimaryPaymentMethod(businessId, paymentMethodId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

billingRouter.post('/payment-methods/remove', async (req: Request, res: Response) => {
  try {
    const { businessId, paymentMethodId } = req.body;
    if (!businessId || !paymentMethodId) {
      return res.status(400).json({ error: 'businessId and paymentMethodId are required' });
    }

    await billingService.removePaymentMethod(businessId, paymentMethodId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Razorpay Webhook Endpoint
billingRouter.post('/webhooks/razorpay', async (req: Request, res: Response) => {
  try {
    const result = await billingService.handleWebhook('razorpay', req.body, req.headers);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Razorpay Webhook Error]', err);
    return res.status(400).json({ error: err.message });
  }
});

// 9. PayPal Webhook Endpoint
billingRouter.post('/webhooks/paypal', async (req: Request, res: Response) => {
  try {
    const result = await billingService.handleWebhook('paypal', req.body, req.headers);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[PayPal Webhook Error]', err);
    return res.status(400).json({ error: err.message });
  }
});

// 10. Webhooks Metadata & Registration Information
billingRouter.get('/webhooks/status', (_req: Request, res: Response) => {
  const isRazorpaySecretConfigured = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
  const isPaypalWebhookConfigured = Boolean(process.env.PAYPAL_WEBHOOK_ID);

  return res.json({
    success: true,
    status: 'active',
    endpoints: [
      {
        provider: 'Razorpay',
        method: 'POST',
        path: '/api/webhooks/razorpay',
        secretEnvVar: 'RAZORPAY_WEBHOOK_SECRET',
        isConfigured: isRazorpaySecretConfigured,
        supportedEvents: [
          'payment.captured',
          'order.paid',
          'subscription.charged',
          'subscription.activated',
          'subscription.cancelled',
          'subscription.paused'
        ],
        verificationMethod: 'HMAC-SHA256 signature verification via x-razorpay-signature'
      },
      {
        provider: 'PayPal',
        method: 'POST',
        path: '/api/webhooks/paypal',
        secretEnvVar: 'PAYPAL_WEBHOOK_ID',
        isConfigured: isPaypalWebhookConfigured,
        supportedEvents: [
          'PAYMENT.CAPTURE.COMPLETED',
          'BILLING.SUBSCRIPTION.ACTIVATED',
          'BILLING.SUBSCRIPTION.CANCELLED',
          'BILLING.SUBSCRIPTION.SUSPENDED',
          'BILLING.SUBSCRIPTION.PAYMENT.FAILED'
        ],
        verificationMethod: 'Webhook ID / transmission verification header validation'
      }
    ],
    idempotencyEngine: 'In-memory + DB Deduplication Active',
    note: 'When deploying to production, register these exact endpoint paths in your Razorpay Dashboard (Webhooks section) and PayPal Developer Portal.'
  });
});

