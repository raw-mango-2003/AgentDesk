import {
  PaymentProvider,
  PaymentProviderName,
  SafePaymentMethod,
  SubscriptionBillingStatus,
  PaymentTransactionStatus,
  ProviderPayment,
  ProviderSubscription,
  ProviderInvoice
} from './paymentProvider.js';
import { RazorpayProvider } from './razorpayProvider.js';
import { PayPalProvider } from './paypalProvider.js';
import { CurrencyCode } from '../../types.js';

export interface TenantBillingRecord {
  businessId: string;
  planId: string;
  planName: string;
  provider: PaymentProviderName;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currency: CurrencyCode;
  monthlyFee: number;
  implementationFee: number;
  implementationFeePaid: boolean;
  status: SubscriptionBillingStatus;
  nextBillingDate: string;
  autoRenew: boolean;
  paymentFailed: boolean;
  paymentFailedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingTransaction {
  id: string;
  businessId: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
  provider: PaymentProviderName;
  status: PaymentTransactionStatus;
  transactionId: string;
  type: 'implementation_fee' | 'subscription' | 'usage_overage';
  description: string;
}

export interface BillingInvoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'FAILED';
  provider: PaymentProviderName;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  providerInvoiceId?: string;
}

export class BillingService {
  private razorpay: RazorpayProvider;
  private paypal: PayPalProvider;

  // Multi-tenant in-memory stores with persistence & seed fallback
  private tenantBillingStore = new Map<string, TenantBillingRecord>();
  private tenantPaymentMethodsStore = new Map<string, SafePaymentMethod[]>();
  private tenantInvoicesStore = new Map<string, BillingInvoice[]>();
  private tenantTransactionsStore = new Map<string, BillingTransaction[]>();
  private processedWebhookEvents = new Set<string>(); // Idempotency cache

  constructor() {
    this.razorpay = new RazorpayProvider();
    this.paypal = new PayPalProvider();
    this.seedDefaultTenants();
  }

  private seedDefaultTenants() {
    const defaultTenants = [
      { id: 'summit-home-services', name: 'Summit Home Services', country: 'US', currency: 'USD' as CurrencyCode, plan: 'scale' },
      { id: 'sharma-dental-care', name: 'Sharma Dental Care', country: 'IN', currency: 'INR' as CurrencyCode, plan: 'growth' },
      { id: 'london-growth-partners', name: 'London Growth Partners', country: 'GB', currency: 'GBP' as CurrencyCode, plan: 'scale' }
    ];

    const FIXED_PLAN_PRICES: Record<string, {
      name: string;
      INR: { monthly: number; setup: number };
      USD: { monthly: number; setup: number };
      GBP: { monthly: number; setup: number };
    }> = {
      starter: {
        name: 'Starter',
        INR: { monthly: 14999, setup: 19999 },
        USD: { monthly: 199, setup: 249 },
        GBP: { monthly: 159, setup: 199 }
      },
      growth: {
        name: 'Growth',
        INR: { monthly: 29999, setup: 34999 },
        USD: { monthly: 399, setup: 449 },
        GBP: { monthly: 299, setup: 349 }
      },
      scale: {
        name: 'Scale',
        INR: { monthly: 59999, setup: 59999 },
        USD: { monthly: 799, setup: 799 },
        GBP: { monthly: 599, setup: 599 }
      },
      enterprise: {
        name: 'Enterprise',
        INR: { monthly: 0, setup: 0 },
        USD: { monthly: 0, setup: 0 },
        GBP: { monthly: 0, setup: 0 }
      },
      enterprise_custom: {
        name: 'Enterprise',
        INR: { monthly: 0, setup: 0 },
        USD: { monthly: 0, setup: 0 },
        GBP: { monthly: 0, setup: 0 }
      }
    };

    for (const t of defaultTenants) {
      const p = FIXED_PLAN_PRICES[t.plan] || FIXED_PLAN_PRICES.growth;
      const currencyPrices = p[t.currency] || p.INR;
      const monthly = currencyPrices.monthly;
      const setup = currencyPrices.setup;

      const provider: PaymentProviderName = t.currency === 'INR' ? 'razorpay' : 'paypal';
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 18);

      this.tenantBillingStore.set(t.id, {
        businessId: t.id,
        planId: t.plan,
        planName: p.name,
        provider,
        providerCustomerId: `cust_${provider}_${t.id}`,
        providerSubscriptionId: `sub_${provider}_${t.id}_882`,
        currency: t.currency,
        monthlyFee: monthly,
        implementationFee: setup,
        implementationFeePaid: true,
        status: 'active',
        nextBillingDate: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        autoRenew: true,
        paymentFailed: false,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Default Payment Method
      this.tenantPaymentMethodsStore.set(t.id, [
        {
          id: `pm_${t.id}_primary`,
          businessId: t.id,
          provider,
          providerPaymentMethodId: `tok_${provider}_${t.id}_991`,
          brand: provider === 'paypal' ? 'PayPal Account' : 'Visa',
          last4: provider === 'paypal' ? 'Primary PayPal Wallet' : '8892',
          expiryMonth: 9,
          expiryYear: 2028,
          expiry: '09/28',
          isPrimary: true,
          createdAt: new Date().toISOString()
        }
      ]);

      // Seed Invoices
      this.tenantInvoicesStore.set(t.id, [
        {
          id: `inv_${t.id}_02`,
          businessId: t.id,
          invoiceNumber: `INV-${new Date().getFullYear()}-0881`,
          date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: `${p.name} - Monthly Platform & Autonomous AI Receptionist`,
          amount: monthly,
          currency: t.currency,
          status: 'PAID',
          provider,
          pdfUrl: '#'
        },
        {
          id: `inv_${t.id}_01`,
          businessId: t.id,
          invoiceNumber: `INV-${new Date().getFullYear()}-0801`,
          date: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: `${p.name} - 12-Step Implementation & Multi-Agent Architecture Fee`,
          amount: setup,
          currency: t.currency,
          status: 'PAID',
          provider,
          pdfUrl: '#'
        }
      ]);

      // Seed Transactions
      this.tenantTransactionsStore.set(t.id, [
        {
          id: `tx_${t.id}_02`,
          businessId: t.id,
          date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: monthly,
          currency: t.currency,
          provider,
          status: 'paid',
          transactionId: `PAY-${provider.toUpperCase().slice(0, 3)}-994821`,
          type: 'subscription',
          description: `Monthly Subscription renewal for ${p.name}`
        },
        {
          id: `tx_${t.id}_01`,
          businessId: t.id,
          date: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: setup,
          currency: t.currency,
          provider,
          status: 'paid',
          transactionId: `PAY-${provider.toUpperCase().slice(0, 3)}-881023`,
          type: 'implementation_fee',
          description: `Implementation setup fee for ${p.name}`
        }
      ]);
    }
  }

  public getProvider(name: PaymentProviderName): PaymentProvider {
    return name === 'razorpay' ? this.razorpay : this.paypal;
  }

  public getAvailableProviders(currency: CurrencyCode, country?: string): Array<{
    name: PaymentProviderName;
    label: string;
    isConfigured: boolean;
    isRecommended: boolean;
    supportsRecurring: boolean;
  }> {
    const list: Array<{
      name: PaymentProviderName;
      label: string;
      isConfigured: boolean;
      isRecommended: boolean;
      supportsRecurring: boolean;
    }> = [];

    // Razorpay Check
    if (this.razorpay.supportsCurrency(currency)) {
      list.push({
        name: 'razorpay',
        label: 'Razorpay (Cards, UPI, NetBanking)',
        isConfigured: this.razorpay.isConfigured(),
        isRecommended: currency === 'INR' || country === 'IN',
        supportsRecurring: this.razorpay.supportsRecurring(currency)
      });
    }

    // PayPal Check (Strict Rule: NO INR)
    if (this.paypal.supportsCurrency(currency)) {
      list.push({
        name: 'paypal',
        label: 'PayPal (Wallet, International Cards)',
        isConfigured: this.paypal.isConfigured(),
        isRecommended: (currency === 'USD' || currency === 'GBP') && country !== 'IN',
        supportsRecurring: this.paypal.supportsRecurring(currency)
      });
    }

    return list;
  }

  public getTenantBilling(businessId: string): TenantBillingRecord {
    const norm = businessId.trim().toLowerCase();
    if (!this.tenantBillingStore.has(norm)) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);

      const record: TenantBillingRecord = {
        businessId: norm,
        planId: 'growth',
        planName: 'Growth',
        provider: 'razorpay',
        currency: 'USD',
        monthlyFee: 1497,
        implementationFee: 7497,
        implementationFeePaid: false,
        status: 'trialing',
        nextBillingDate: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        autoRenew: true,
        paymentFailed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.tenantBillingStore.set(norm, record);
    }
    return this.tenantBillingStore.get(norm)!;
  }

  public getPaymentMethods(businessId: string): SafePaymentMethod[] {
    const norm = businessId.trim().toLowerCase();
    return this.tenantPaymentMethodsStore.get(norm) || [];
  }

  public getInvoices(businessId: string): BillingInvoice[] {
    const norm = businessId.trim().toLowerCase();
    return this.tenantInvoicesStore.get(norm) || [];
  }

  public getTransactions(businessId: string): BillingTransaction[] {
    const norm = businessId.trim().toLowerCase();
    return this.tenantTransactionsStore.get(norm) || [];
  }

  public async createCheckoutSession(params: {
    businessId: string;
    planId: string;
    type: 'implementation_fee' | 'subscription';
    currency: CurrencyCode;
    providerName: PaymentProviderName;
    customerEmail?: string;
    customerName?: string;
  }) {
    const { businessId, planId, type, currency, providerName, customerEmail, customerName } = params;

    // Strict validation
    if (providerName === 'paypal' && currency === 'INR') {
      throw new Error('PayPal does not support INR subscriptions or payments. Please select Razorpay.');
    }

    const FIXED_PLAN_PRICES: Record<string, {
      name: string;
      INR: { monthly: number; setup: number };
      USD: { monthly: number; setup: number };
      GBP: { monthly: number; setup: number };
    }> = {
      starter: {
        name: 'Starter',
        INR: { monthly: 14999, setup: 19999 },
        USD: { monthly: 199, setup: 249 },
        GBP: { monthly: 159, setup: 199 }
      },
      growth: {
        name: 'Growth',
        INR: { monthly: 29999, setup: 34999 },
        USD: { monthly: 399, setup: 449 },
        GBP: { monthly: 299, setup: 349 }
      },
      scale: {
        name: 'Scale',
        INR: { monthly: 59999, setup: 59999 },
        USD: { monthly: 799, setup: 799 },
        GBP: { monthly: 599, setup: 599 }
      },
      enterprise: {
        name: 'Enterprise',
        INR: { monthly: 0, setup: 0 },
        USD: { monthly: 0, setup: 0 },
        GBP: { monthly: 0, setup: 0 }
      },
      enterprise_custom: {
        name: 'Enterprise',
        INR: { monthly: 0, setup: 0 },
        USD: { monthly: 0, setup: 0 },
        GBP: { monthly: 0, setup: 0 }
      }
    };

    const p = FIXED_PLAN_PRICES[planId] || FIXED_PLAN_PRICES.growth;
    const currencyPrices = p[currency] || p.INR;
    let baseAmount = type === 'implementation_fee' ? currencyPrices.setup : currencyPrices.monthly;

    const provider = this.getProvider(providerName);
    if (!provider.isConfigured()) {
      throw new Error('Online payments are temporarily unavailable. Please contact sales.');
    }

    if (type === 'implementation_fee') {
      const payment = await provider.createPayment({
        businessId,
        amount: baseAmount,
        currency,
        description: `One-time Implementation Setup Fee for ${p.name} (${currency} ${baseAmount})`,
        type: 'implementation_fee',
        metadata: { planId, customerEmail, customerName }
      });
      return {
        success: true,
        type: 'implementation_fee',
        payment,
        amount: baseAmount,
        currency,
        provider: providerName
      };
    } else {
      const sub = await provider.createSubscription({
        businessId,
        planId,
        planName: p.name,
        monthlyAmount: baseAmount,
        currency,
        metadata: { customerEmail, customerName }
      });
      return {
        success: true,
        type: 'subscription',
        subscription: sub,
        amount: baseAmount,
        currency,
        provider: providerName
      };
    }
  }

  public async verifyAndActivatePayment(params: {
    businessId: string;
    provider: PaymentProviderName;
    paymentId?: string;
    orderId?: string;
    subscriptionId?: string;
    signature?: string;
    type: 'implementation_fee' | 'subscription';
    planId: string;
    currency: CurrencyCode;
    amount: number;
    paymentMethodData?: {
      brand?: string;
      last4?: string;
      expiry?: string;
    };
  }) {
    const { businessId, provider: providerName, paymentId, orderId, subscriptionId, signature, type, planId, currency, amount, paymentMethodData } = params;

    const provider = this.getProvider(providerName);
    if (!provider.isConfigured()) {
      throw new Error('Online payments are temporarily unavailable. Please contact sales.');
    }
    const verification = await provider.verifyPayment({
      businessId,
      paymentId,
      orderId,
      subscriptionId,
      signature,
      provider: providerName,
      currency,
      amount
    });

    if (!verification.verified) {
      throw new Error(verification.message || 'Payment verification failed on server.');
    }

    const norm = businessId.trim().toLowerCase();
    const currentBilling = this.getTenantBilling(norm);

    const planNames: Record<string, string> = {
      starter: 'Starter',
      growth: 'Growth',
      enterprise: 'Enterprise',
      enterprise_custom: 'Enterprise Custom'
    };

    // Update Billing Record
    if (type === 'implementation_fee') {
      currentBilling.implementationFeePaid = true;
      currentBilling.updatedAt = new Date().toISOString();
    } else {
      currentBilling.planId = planId;
      currentBilling.planName = planNames[planId] || 'Growth';
      currentBilling.provider = providerName;
      currentBilling.status = 'active';
      currentBilling.paymentFailed = false;
      currentBilling.monthlyFee = amount;
      currentBilling.currency = currency;
      if (subscriptionId) {
        currentBilling.providerSubscriptionId = subscriptionId;
      }
      currentBilling.updatedAt = new Date().toISOString();
    }

    this.tenantBillingStore.set(norm, currentBilling);

    // Record Transaction
    const txId = verification.transactionId || `PAY-${providerName.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;
    const txList = this.getTransactions(norm);
    txList.unshift({
      id: `tx_${Date.now()}`,
      businessId: norm,
      date: new Date().toISOString().split('T')[0],
      amount,
      currency,
      provider: providerName,
      status: 'paid',
      transactionId: txId,
      type,
      description: type === 'implementation_fee'
        ? `One-time Implementation Fee (${planNames[planId] || planId})`
        : `Monthly Subscription Platform Access (${planNames[planId] || planId})`
    });
    this.tenantTransactionsStore.set(norm, txList);

    // Record Invoice
    const invList = this.getInvoices(norm);
    const invNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    invList.unshift({
      id: `inv_${Date.now()}`,
      businessId: norm,
      invoiceNumber: invNum,
      date: new Date().toISOString().split('T')[0],
      description: type === 'implementation_fee'
        ? `${planNames[planId] || planId} - 12-Step Implementation Fee`
        : `${planNames[planId] || planId} - Monthly Platform Subscription`,
      amount,
      currency,
      status: 'PAID',
      provider: providerName,
      pdfUrl: '#'
    });
    this.tenantInvoicesStore.set(norm, invList);

    // Register safe payment method if passed
    if (paymentMethodData) {
      const pmList = this.getPaymentMethods(norm);
      pmList.forEach(pm => { pm.isPrimary = false; });
      pmList.unshift({
        id: `pm_${Date.now()}`,
        businessId: norm,
        provider: providerName,
        providerPaymentMethodId: `tok_${providerName}_${Date.now()}`,
        brand: paymentMethodData.brand || (providerName === 'paypal' ? 'PayPal Account' : 'Visa'),
        last4: paymentMethodData.last4 || (providerName === 'paypal' ? 'PayPal Wallet' : '8892'),
        expiry: paymentMethodData.expiry || '09/28',
        isPrimary: true,
        createdAt: new Date().toISOString()
      });
      this.tenantPaymentMethodsStore.set(norm, pmList);
    }

    return {
      success: true,
      transactionId: txId,
      invoiceNumber: invNum,
      billing: currentBilling
    };
  }

  public async updatePlan(businessId: string, newPlanId: string, customPrice?: number) {
    const norm = businessId.trim().toLowerCase();
    const billing = this.getTenantBilling(norm);

    const FIXED_PLAN_PRICES: Record<string, {
      name: string;
      INR: { monthly: number; setup: number };
      USD: { monthly: number; setup: number };
      GBP: { monthly: number; setup: number };
    }> = {
      starter: {
        name: 'Starter',
        INR: { monthly: 14999, setup: 19999 },
        USD: { monthly: 199, setup: 249 },
        GBP: { monthly: 159, setup: 199 }
      },
      growth: {
        name: 'Growth',
        INR: { monthly: 29999, setup: 34999 },
        USD: { monthly: 399, setup: 449 },
        GBP: { monthly: 299, setup: 349 }
      },
      scale: {
        name: 'Scale',
        INR: { monthly: 59999, setup: 59999 },
        USD: { monthly: 799, setup: 799 },
        GBP: { monthly: 599, setup: 599 }
      },
      enterprise: {
        name: 'Enterprise',
        INR: { monthly: 0, setup: 0 },
        USD: { monthly: 0, setup: 0 },
        GBP: { monthly: 0, setup: 0 }
      },
      enterprise_custom: {
        name: 'Enterprise',
        INR: { monthly: 0, setup: 0 },
        USD: { monthly: 0, setup: 0 },
        GBP: { monthly: 0, setup: 0 }
      }
    };

    const p = FIXED_PLAN_PRICES[newPlanId] || FIXED_PLAN_PRICES.growth;
    const currencyPrices = p[billing.currency] || p.INR;
    let monthly = customPrice !== undefined ? customPrice : currencyPrices.monthly;

    const provider = this.getProvider(billing.provider);
    if (billing.providerSubscriptionId) {
      await provider.updateSubscription(billing.providerSubscriptionId, newPlanId, monthly);
    }

    billing.planId = newPlanId;
    billing.planName = p.name;
    billing.monthlyFee = monthly;
    billing.updatedAt = new Date().toISOString();
    this.tenantBillingStore.set(norm, billing);

    return billing;
  }

  public async pauseSubscription(businessId: string) {
    const norm = businessId.trim().toLowerCase();
    const billing = this.getTenantBilling(norm);
    const provider = this.getProvider(billing.provider);

    if (billing.providerSubscriptionId) {
      await provider.pauseSubscription(billing.providerSubscriptionId);
    }

    billing.status = 'paused';
    billing.updatedAt = new Date().toISOString();
    this.tenantBillingStore.set(norm, billing);
    return billing;
  }

  public async resumeSubscription(businessId: string) {
    const norm = businessId.trim().toLowerCase();
    const billing = this.getTenantBilling(norm);
    const provider = this.getProvider(billing.provider);

    if (billing.providerSubscriptionId) {
      await provider.resumeSubscription(billing.providerSubscriptionId);
    }

    billing.status = 'active';
    billing.updatedAt = new Date().toISOString();
    this.tenantBillingStore.set(norm, billing);
    return billing;
  }

  public async cancelSubscription(businessId: string) {
    const norm = businessId.trim().toLowerCase();
    const billing = this.getTenantBilling(norm);
    const provider = this.getProvider(billing.provider);

    if (billing.providerSubscriptionId) {
      await provider.cancelSubscription(billing.providerSubscriptionId);
    }

    billing.status = 'cancelled';
    billing.autoRenew = false;
    billing.updatedAt = new Date().toISOString();
    this.tenantBillingStore.set(norm, billing);
    return billing;
  }

  public async addPaymentMethod(businessId: string, method: Omit<SafePaymentMethod, 'id' | 'createdAt'>) {
    const norm = businessId.trim().toLowerCase();
    const currentList = this.getPaymentMethods(norm);

    if (method.isPrimary) {
      currentList.forEach(m => { m.isPrimary = false; });
    }

    const newMethod: SafePaymentMethod = {
      ...method,
      id: `pm_${norm}_${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString()
    };

    currentList.unshift(newMethod);
    this.tenantPaymentMethodsStore.set(norm, currentList);
    return newMethod;
  }

  public async setPrimaryPaymentMethod(businessId: string, paymentMethodId: string) {
    const norm = businessId.trim().toLowerCase();
    const currentList = this.getPaymentMethods(norm);
    let found = false;

    for (const m of currentList) {
      if (m.id === paymentMethodId) {
        m.isPrimary = true;
        found = true;
      } else {
        m.isPrimary = false;
      }
    }

    if (!found) {
      throw new Error('Payment method not found');
    }

    this.tenantPaymentMethodsStore.set(norm, currentList);
    return true;
  }

  public async removePaymentMethod(businessId: string, paymentMethodId: string) {
    const norm = businessId.trim().toLowerCase();
    const currentList = this.getPaymentMethods(norm);
    const billing = this.getTenantBilling(norm);

    const target = currentList.find(m => m.id === paymentMethodId);
    if (!target) {
      throw new Error('Payment method not found');
    }

    // Safety guard: If subscription is active and this is the only payment method, block removal
    if (billing.status === 'active' && currentList.length <= 1) {
      throw new Error(
        'This payment method is currently required for your active subscription. Add another payment method before removing it.'
      );
    }

    const filtered = currentList.filter(m => m.id !== paymentMethodId);
    // If we removed the primary, promote the next one to primary
    if (target.isPrimary && filtered.length > 0) {
      filtered[0].isPrimary = true;
    }

    this.tenantPaymentMethodsStore.set(norm, filtered);
    return true;
  }

  public async handleWebhook(providerName: PaymentProviderName, body: any, headers: Record<string, string | string[] | undefined>) {
    const provider = this.getProvider(providerName);
    const result = await provider.handleWebhook(body, headers);

    // Idempotency: avoid double handling of identical webhook payload ID
    const eventId = body?.id || body?.event_id || `${providerName}_${result.event}_${result.paymentId || result.subscriptionId || Date.now()}`;
    if (this.processedWebhookEvents.has(eventId)) {
      return { success: true, duplicate: true, message: 'Event already processed' };
    }
    this.processedWebhookEvents.add(eventId);

    if (result.businessId) {
      const norm = result.businessId.toLowerCase();
      const billing = this.getTenantBilling(norm);

      if (result.status === 'active' || result.status === 'paid') {
        billing.status = 'active';
        billing.paymentFailed = false;
      } else if (result.status === 'paused') {
        billing.status = 'paused';
      } else if (result.status === 'cancelled') {
        billing.status = 'cancelled';
      }
      this.tenantBillingStore.set(norm, billing);
    }

    return { success: true, result };
  }
}

// Singleton Service
export const billingService = new BillingService();
