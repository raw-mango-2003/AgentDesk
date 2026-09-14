import { Router, Request, Response } from 'express';
import { billingService } from './billingService.js';
import { CurrencyCode } from '../../types.js';
import { requirePlatformAdmin, requireTenantAccess } from '../auth/authRouter.js';
import { paymentRateLimiter } from '../integrations/rateLimiter.js';

export const billingRouter = Router();

// 1. Public Billing & Provider Configuration
billingRouter.get('/config', (req: Request, res: Response) => {
  const currency = (req.query.currency as CurrencyCode) || 'USD';
  const country = (req.query.country as string) || 'US';

  const razorpay = billingService.getProvider('razorpay') as any;

  const isRazorpayConfigured = Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
  const isPaymentsEnabled = isRazorpayConfigured;

  const availableProviders = billingService.getAvailableProviders(currency, country);

  res.json({
    success: true,
    supportedCurrencies: ['USD', 'INR', 'GBP'],
    isPaymentsEnabled,
    availableProviders,
    publicKeys: {
      razorpay: razorpay.getPublicKey?.() || ''
    },
    mode: isPaymentsEnabled ? 'production' : 'disabled'
  });
});

// 2. Tenant Billing Info
billingRouter.get('/tenant/:businessId', requireTenantAccess, (req: Request, res: Response) => {
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

// 2.5. Authoritative Order Pricing & Taxes Calculation
billingRouter.post('/calculate-order', (req: Request, res: Response) => {
  try {
    const { planId, currency, type, couponCode, country, state, gstin, customerEmail, tenantId } = req.body;
    if (!planId || !currency) {
      return res.status(400).json({ success: false, error: 'planId and currency are required.' });
    }
    const calculation = billingService.calculateOrderAmount({
      planId,
      currency,
      type: type || 'initial_checkout',
      couponCode,
      country,
      state,
      gstin,
      customerEmail,
      tenantId
    });
    return res.json({ success: true, ...calculation });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 2.52. Provider & Capability Availability Check
billingRouter.get('/available-payment-methods', async (req: Request, res: Response) => {
  try {
    const currency = (req.query.currency as any) || 'INR';
    const country = (req.query.country as string) || undefined;
    const planId = (req.query.planId as string) || (req.query.plan as string) || undefined;

    const result = await billingService.getAvailablePaymentMethods({ currency, country, planId });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

billingRouter.post('/available-payment-methods', async (req: Request, res: Response) => {
  try {
    const { currency = 'INR', country, planId, plan } = req.body;
    const result = await billingService.getAvailablePaymentMethods({
      currency: currency as any,
      country,
      planId: planId || plan
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 2.53. Provider Health Check Endpoint
billingRouter.get('/providers/health', async (_req: Request, res: Response) => {
  try {
    const health = await billingService.getProvidersHealth();
    return res.json({ success: true, health });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2.54. Payment Audit Logs Endpoint
billingRouter.get('/admin/payment-audit-logs', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const provider = req.query.provider as string;
    const logs = billingService.getPaymentAuditLogs({ tenantId, provider });
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

billingRouter.post('/record-audit-event', (req: Request, res: Response) => {
  try {
    const { action, tenantId, customerEmail, provider, providerOrderId, providerPaymentId, amount, currency, status, method, details } = req.body;
    if (!action || !tenantId) {
      return res.status(400).json({ success: false, error: 'action and tenantId are required' });
    }
    const log = billingService.recordAuditLog({
      action,
      tenantId,
      customerEmail: customerEmail || 'unknown@customer.com',
      provider: provider || 'razorpay',
      providerOrderId,
      providerPaymentId,
      amount,
      currency,
      status: status || 'INFO',
      method,
      details,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    return res.json({ success: true, log });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 2.55. Multi-Currency Platform Endpoints
billingRouter.get('/currencies', async (_req: Request, res: Response) => {
  try {
    const currencies = await billingService.getAllCurrencies();
    return res.json({ success: true, currencies });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

billingRouter.put('/currencies/:code/toggle', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { enabled } = req.body;
    const updated = billingService.toggleCurrency(code as any, Boolean(enabled));
    return res.json({ success: true, currency: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

billingRouter.get('/plan-prices', (req: Request, res: Response) => {
  try {
    const { planId } = req.query;
    if (planId && typeof planId === 'string') {
      const prices = billingService.getPlanPricesForPlan(planId);
      return res.json({ success: true, planPrices: prices });
    }
    const prices = billingService.getAllPlanPrices();
    return res.json({ success: true, planPrices: prices });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

billingRouter.put('/plan-prices', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const { planId, currency, setupFee, monthlyFee, active } = req.body;
    if (!planId || !currency) {
      return res.status(400).json({ success: false, error: 'planId and currency are required.' });
    }
    const updated = billingService.updatePlanPrice(
      planId, 
      currency, 
      Number(setupFee), 
      Number(monthlyFee), 
      active !== undefined ? Boolean(active) : true
    );
    return res.json({ success: true, planPrice: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

billingRouter.get('/revenue-analytics', requirePlatformAdmin, (_req: Request, res: Response) => {
  try {
    const analytics = billingService.getRevenueAnalyticsByCurrency();
    return res.json({ success: true, analytics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2.6. Validate Promo Code
billingRouter.post('/validate-coupon', (req: Request, res: Response) => {
  try {
    const { couponCode, code, planId, currency, customerEmail, tenantId, subtotal } = req.body;
    const effectiveCode = couponCode || code;
    const result = billingService.validateCoupon(effectiveCode, planId, currency, customerEmail, tenantId, subtotal);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2.7. Platform Admin Promo Codes Management
billingRouter.get('/promo-codes', requirePlatformAdmin, (_req: Request, res: Response) => {
  try {
    const codes = billingService.getAllPromoCodes();
    return res.json({ success: true, promoCodes: codes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

billingRouter.post('/promo-codes', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const newPromo = billingService.createPromoCode(req.body);
    return res.status(201).json({ success: true, promoCode: newPromo });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

billingRouter.put('/promo-codes/:code', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const updatedPromo = billingService.updatePromoCode(req.params.code, req.body);
    return res.json({ success: true, promoCode: updatedPromo });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

billingRouter.delete('/promo-codes/:code', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const deleted = billingService.deletePromoCode(req.params.code);
    return res.json({ success: deleted });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

billingRouter.post('/promo-codes/:code/toggle', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const toggled = billingService.togglePromoCodeActive(req.params.code);
    return res.json({ success: true, promoCode: toggled });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 2.8. Platform Admin Tax Settings Management
billingRouter.get('/tax-settings', (_req: Request, res: Response) => {
  try {
    const config = billingService.getTaxConfiguration();
    return res.json({ success: true, taxConfig: config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

billingRouter.get('/tax-config', (_req: Request, res: Response) => {
  try {
    const config = billingService.getTaxConfiguration();
    return res.json({ success: true, taxConfig: config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

billingRouter.put('/tax-settings', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const updated = billingService.updateTaxConfiguration(req.body, req.body.updatedBy || 'Platform Admin');
    return res.json({ success: true, taxConfig: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

billingRouter.put('/tax-config', requirePlatformAdmin, (req: Request, res: Response) => {
  try {
    const updated = billingService.updateTaxConfiguration(req.body, req.body.updatedBy || 'Platform Admin');
    return res.json({ success: true, taxConfig: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 3. Create Checkout Session (Implementation Fee, Monthly Subscription, or Bundled Initial Checkout)
billingRouter.post('/create-checkout-session', paymentRateLimiter, async (req: Request, res: Response) => {
  try {
    const { 
      businessId, 
      businessName, 
      planId, 
      type, 
      currency, 
      displayCurrency,
      displayAmount,
      customerEmail, 
      customerName, 
      customerPhone,
      couponCode,
      billingAddress
    } = req.body;
    const provider = req.body.provider || 'razorpay';

    if (!businessId || !planId || !type || !currency) {
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

    const session = await billingService.createCheckoutSession({
      businessId,
      businessName,
      planId,
      type,
      currency,
      displayCurrency,
      displayAmount,
      providerName: provider,
      customerEmail,
      customerName,
      customerPhone,
      couponCode,
      billingAddress
    });

    return res.json(session);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 3.5. Order Status & Polling Endpoint
billingRouter.get('/order-status/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    const status = await billingService.getOrderStatus(orderId);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Verify & Activate Payment
billingRouter.post('/verify-payment', paymentRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      businessId,
      businessName,
      customerName,
      customerEmail,
      customerPhone,
      paymentId,
      orderId,
      subscriptionId,
      signature,
      type,
      planId,
      currency,
      displayCurrency,
      displayAmount,
      amount,
      paymentMethodData
    } = req.body;

    const provider = req.body.provider || 'razorpay';

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required.' });
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
      businessName,
      customerName,
      customerEmail,
      customerPhone,
      provider,
      paymentId,
      orderId,
      subscriptionId,
      signature,
      type: type || 'initial_checkout',
      planId: planId || 'growth',
      currency: currency || 'INR',
      displayCurrency,
      displayAmount,
      amount,
      paymentMethodData
    });

    if (result.sessionToken) {
      res.cookie('agentdesk_session', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 4.5. Admin Subscriptions List
billingRouter.get('/admin/subscriptions', (_req: Request, res: Response) => {
  try {
    const subscriptions = billingService.getAllTenantBillings();
    return res.json({
      success: true,
      subscriptions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4.6. Admin Pending Signups (Awaiting Payment Verification)
billingRouter.get('/admin/pending-signups', (_req: Request, res: Response) => {
  try {
    const signups = billingService.getPendingSignups();
    return res.json({
      success: true,
      signups
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4.7. Admin Payment Records (Server Payment Audit Trail)
billingRouter.get('/admin/payment-records', (_req: Request, res: Response) => {
  try {
    const records = billingService.getPaymentRecords();
    return res.json({
      success: true,
      records
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4.8. Admin SaaS Subscription Records
billingRouter.get('/admin/subscription-records', (_req: Request, res: Response) => {
  try {
    const subscriptions = billingService.getSubscriptionRecords();
    return res.json({
      success: true,
      subscriptions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4.81. Admin Invoices Across All Tenants
billingRouter.get('/admin/invoices', (_req: Request, res: Response) => {
  try {
    const invoices = billingService.getAllInvoices();
    return res.json({
      success: true,
      invoices
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4.82. Admin Transactions Across All Tenants
billingRouter.get('/admin/all-transactions', (_req: Request, res: Response) => {
  try {
    const transactions = billingService.getAllTransactions();
    return res.json({
      success: true,
      transactions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4.9. Admin Reconcile / Retry Order Provisioning
billingRouter.post('/admin/reconcile', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required for reconciliation' });
    }
    const result = await billingService.reconcilePayment(orderId);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 4.10. Abandon / Cancel Checkout Session
billingRouter.post('/cancel-checkout', (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (orderId) {
      const signup = billingService.getPendingSignup(orderId);
      if (signup && signup.status === 'PENDING') {
        signup.status = 'CANCELLED';
        signup.updatedAt = new Date().toISOString();
      }
    }
    return res.json({ success: true, message: 'Checkout session marked as cancelled' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    const rawBody = (req as any).rawBodyString || (req as any).rawBody || JSON.stringify(req.body);
    const result = await billingService.handleWebhook('razorpay', req.body, req.headers, rawBody);
    if (result && !result.handled && result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Razorpay Webhook Error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 9. Webhooks Metadata & Registration Information
billingRouter.get('/webhooks/status', (req: Request, res: Response) => {
  const isRazorpaySecretConfigured = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  return res.json({
    success: true,
    status: 'active',
    endpoints: [
      {
        provider: 'Razorpay',
        method: 'POST',
        path: '/api/webhooks/razorpay',
        fullUrl: `${baseUrl}/api/webhooks/razorpay`,
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
      }
    ],
    idempotencyEngine: 'In-memory + DB Deduplication Active',
    note: 'When deploying to production, register the /api/webhooks/razorpay endpoint in your Razorpay Developer Dashboard.'
  });
});


