import {
  PaymentProvider,
  PaymentProviderName,
  SafePaymentMethod,
  SubscriptionBillingStatus,
  PaymentTransactionStatus,
  ProviderPayment,
  ProviderSubscription,
  ProviderInvoice,
  ProviderHealthReport
} from './paymentProvider.js';
import { RazorpayProvider } from './razorpayProvider.js';
import { 
  CurrencyCode, 
  PaymentRecord, 
  SubscriptionRecord, 
  PendingSignup, 
  PaymentStatus, 
  SubscriptionStatus,
  BillingAddressDetails,
  OrderCalculationResult,
  CouponValidationResult,
  PlatformPromoCode,
  TaxConfiguration,
  PlanPriceRecord,
  PlatformCurrencyRecord,
  PaymentAuditLogEntry,
  AvailablePaymentMethodItem,
  AvailablePaymentMethodsResponse
} from '../../types.js';
import { 
  provisionCustomerTenant, 
  serverBusinessesStore,
  getTenant,
  checkTenantQuota,
  recordTenantUsage 
} from '../tenantRegistry.js';
import { getUserByEmail, updateUser } from '../auth/userRegistry.js';
import { createSession } from '../auth/sessionStore.js';
import { postgresClient } from '../db/postgresClient.js';
import {
  PLAN_CONFIGS,
  getPlanPricing,
  normalizePlanId
} from '../../data/pricing.js';

export interface CouponDefinition {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'all' | 'monthly' | 'setup';
  currency?: CurrencyCode;
  minOrderAmount?: number;
  maxDiscount?: number;
}

const FIXED_PLAN_PRICES: Record<string, {
  name: string;
  INR: { monthly: number; setup: number };
  USD: { monthly: number; setup: number };
  GBP: { monthly: number; setup: number };
}> = Object.fromEntries(
  Object.entries(PLAN_CONFIGS).map(([planId, plan]) => {
    const inr = getPlanPricing(plan, 'INR');
    const usd = getPlanPricing(plan, 'USD');
    const gbp = getPlanPricing(plan, 'GBP');

    return [
      planId,
      {
        name: plan.name,
        INR: {
          monthly: inr.monthlyPrice,
          setup: inr.setupPrice
        },
        USD: {
          monthly: usd.monthlyPrice,
          setup: usd.setupPrice
        },
        GBP: {
          monthly: gbp.monthlyPrice,
          setup: gbp.setupPrice
        }
      }
    ];
  })
);

export const SERVER_PROMO_COUPONS: Record<string, CouponDefinition> = {
  GROWTH50: {
    code: 'GROWTH50',
    description: '50% off First Month Subscription',
    discountType: 'percentage',
    discountValue: 50,
    appliesTo: 'monthly'
  },
  WELCOME20: {
    code: 'WELCOME20',
    description: '20% off Total Due Today',
    discountType: 'percentage',
    discountValue: 20,
    appliesTo: 'all'
  },
  LAUNCH100: {
    code: 'LAUNCH100',
    description: '100% Setup & Implementation Fee Waiver',
    discountType: 'percentage',
    discountValue: 100,
    appliesTo: 'setup'
  },
  SUPERAGENT: {
    code: 'SUPERAGENT',
    description: '15% Early Adopter Discount',
    discountType: 'percentage',
    discountValue: 15,
    appliesTo: 'all'
  },
  AGENTDESK10: {
    code: 'AGENTDESK10',
    description: '10% Launch Promotion',
    discountType: 'percentage',
    discountValue: 10,
    appliesTo: 'all'
  },
  SAVE5000: {
    code: 'SAVE5000',
    description: '₹5,000 Flat Discount (INR Orders)',
    discountType: 'fixed',
    discountValue: 5000,
    appliesTo: 'all',
    currency: 'INR'
  },
  SAVE50USD: {
    code: 'SAVE50USD',
    description: '$50 Flat Discount (USD Orders)',
    discountType: 'fixed',
    discountValue: 50,
    appliesTo: 'all',
    currency: 'USD'
  },
  SAVE50GBP: {
    code: 'SAVE50GBP',
    description: '£50 Flat Discount (GBP Orders)',
    discountType: 'fixed',
    discountValue: 50,
    appliesTo: 'all',
    currency: 'GBP'
  }
};

export interface TenantBillingRecord {
  businessId: string;
  businessName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
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
  paymentStatus?: 'paid' | 'pending' | 'failed';
  lastPaymentId?: string;
  nextBillingDate: string;
  autoRenew: boolean;
  paymentFailed: boolean;
  paymentFailedReason?: string;

  // Explicit separated billing components
  setup_fee?: number;
  setup_discount?: number;
  setup_tax?: number;
  setup_fee_tax?: number;
  subscription_fee?: number;
  subscription_discount?: number;
  subscription_tax?: number;
  recurring_base_amount?: number;
  recurring_tax_amount?: number;
  recurring_total_amount?: number;
  tax_rate?: number;
  subscription_tax_rate?: number;
  setup_tax_rate?: number;

  createdAt: string;
  updatedAt: string;
}

export interface BillingTransaction {
  id: string;
  businessId: string;
  date: string;
  createdAt?: string;
  amount: number;
  currency: CurrencyCode;
  provider: PaymentProviderName;
  status: PaymentTransactionStatus;
  transactionId: string;
  type: 'implementation_fee' | 'subscription' | 'usage_overage' | 'initial_checkout';
  description: string;
  setup_fee?: number;
  setup_tax?: number;
  subscription_fee?: number;
  subscription_tax?: number;
}

export interface BillingInvoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  date: string;
  createdAt?: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'FAILED';
  provider: PaymentProviderName;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  providerInvoiceId?: string;
  
  // Separated invoice breakdown
  invoiceType?: 'ONE_TIME_SETUP' | 'RECURRING_SUBSCRIPTION' | 'INITIAL_BUNDLE';
  setup_fee?: number;
  setup_discount?: number;
  setup_tax?: number;
  subscription_fee?: number;
  subscription_discount?: number;
  subscription_tax?: number;
  total_amount?: number;
  tax_rate?: number;
  taxLabel?: string;
  lineItems?: Array<{
    description: string;
    type: 'ONE_TIME' | 'RECURRING';
    baseAmount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  }>;
}

export class BillingService {
  private razorpay: RazorpayProvider;
  private paymentAuditLogsStore: PaymentAuditLogEntry[] = [];

  // Server-authoritative Tax Configuration (Current Business is NOT GST Registered)
  private taxConfig: TaxConfiguration = {
    enabled: false,
    registration_status: 'NOT_REGISTERED',
    gstin: null,
    default_rate: 0.00,
    tax_name: 'GST',
    effective_from: null,
    subscription_tax_rate: 0.00,
    setup_tax_rate: 0.00,
    tax_label: 'GST Disabled (Non-Registered)',
    tax_disclaimer: 'AgentDesk is currently not GST registered. No tax is collected or charged.',
    rule_summary: 'Tax collection disabled. Current business is not GST registered.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'system'
  };

  // Multi-tenant in-memory stores with persistence & seed fallback
  private tenantBillingStore = new Map<string, TenantBillingRecord>();
  private tenantPaymentMethodsStore = new Map<string, SafePaymentMethod[]>();
  private tenantInvoicesStore = new Map<string, BillingInvoice[]>();
  private tenantTransactionsStore = new Map<string, BillingTransaction[]>();
  private processedWebhookEvents = new Set<string>(); // Idempotency cache

  // Production SaaS Payment & Subscription state stores
  private pendingSignupsStore = new Map<string, PendingSignup>(); // Keyed by razorpayOrderId or paypalOrderId
  private paymentRecordsStore = new Map<string, PaymentRecord>(); // Keyed by razorpayOrderId or paypalOrderId
  private subscriptionRecordsStore = new Map<string, SubscriptionRecord>(); // Keyed by tenantId
  private promoCodesStore = new Map<string, PlatformPromoCode>(); // Keyed by uppercase promo code
  private planPricesStore = new Map<string, PlanPriceRecord>(); // Keyed by `${plan_id}_${currency}`
  private currenciesStore = new Map<CurrencyCode, PlatformCurrencyRecord>(); // Keyed by CurrencyCode ('INR', 'USD', 'GBP')

  constructor() {
    this.razorpay = new RazorpayProvider();
    this.seedDefaultCurrencies();
    this.seedDefaultPlanPrices();
    this.seedDefaultTenants();
    this.seedDefaultPromoCodes();
    this.seedDefaultAuditLogs();
    this.hydratePersistentBilling().catch(err => {
      console.warn('[BillingService:HydrationWarning]', err?.message || err);
    });
  }

  private async hydratePersistentBilling(): Promise<void> {
    if (!(await postgresClient.initialize())) return;

    const tenantResult = await postgresClient.query('SELECT id, settings FROM agentdesk_tenants WHERE settings IS NOT NULL');
    for (const row of tenantResult?.rows || []) {
      const billing = row.settings?.billing;
      if (billing && typeof billing === 'object') {
        this.tenantBillingStore.set(String(row.id).toLowerCase(), billing as TenantBillingRecord);
      }
    }

    const invoiceResult = await postgresClient.query('SELECT id, tenant_id, razorpay_invoice_id, invoice_number, description, amount, currency, status, hosted_invoice_url, created_at, updated_at FROM agentdesk_invoices ORDER BY created_at DESC');
    for (const row of invoiceResult?.rows || []) {
      const tenantId = String(row.tenant_id || '').toLowerCase();
      if (!tenantId) continue;
      const invoices = this.tenantInvoicesStore.get(tenantId) || [];
      invoices.push({
        id: row.id,
        businessId: tenantId,
        invoiceNumber: row.invoice_number || row.razorpay_invoice_id || row.id,
        date: String(row.created_at || '').slice(0, 10),
        createdAt: row.created_at,
        description: row.description || 'AgentDesk subscription invoice',
        amount: Number(row.amount) || 0,
        currency: row.currency as CurrencyCode,
        status: row.status === 'PAID' ? 'PAID' : 'PENDING',
        provider: 'razorpay',
        providerInvoiceId: row.razorpay_invoice_id || undefined,
        hostedInvoiceUrl: row.hosted_invoice_url || undefined
      });
      this.tenantInvoicesStore.set(tenantId, invoices);
    }
  }

  private async persistBillingSnapshot(record: TenantBillingRecord): Promise<void> {
    const connected = await postgresClient.initialize();
    if (!connected) {
      if (process.env.NODE_ENV === 'production') throw new Error('Billing persistence is unavailable.');
      return;
    }

    await postgresClient.query(
      "UPDATE agentdesk_tenants SET plan_id = $2, currency = $3, settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('billing', $4::jsonb), updated_at = $5 WHERE id = $1",
      [record.businessId, record.planId, record.currency, JSON.stringify(record), record.updatedAt]
    );
  }

  private async persistInvoice(invoice: BillingInvoice): Promise<void> {
    const connected = await postgresClient.initialize();
    if (!connected) {
      if (process.env.NODE_ENV === 'production') throw new Error('Invoice persistence is unavailable.');
      return;
    }

    await postgresClient.query(
      "INSERT INTO agentdesk_invoices (id, tenant_id, razorpay_invoice_id, invoice_number, description, amount, currency, status, hosted_invoice_url, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET razorpay_invoice_id = EXCLUDED.razorpay_invoice_id, invoice_number = EXCLUDED.invoice_number, description = EXCLUDED.description, amount = EXCLUDED.amount, currency = EXCLUDED.currency, status = EXCLUDED.status, hosted_invoice_url = EXCLUDED.hosted_invoice_url, updated_at = EXCLUDED.updated_at",
      [invoice.id, invoice.businessId, invoice.providerInvoiceId || null, invoice.invoiceNumber, invoice.description, invoice.amount, invoice.currency, invoice.status, invoice.hostedInvoiceUrl || null, invoice.createdAt || invoice.date, new Date().toISOString()]
    );
  }

  private seedDefaultAuditLogs() {
    // Audit logs must record real payment lifecycle events; initialize as clean empty log store
    this.paymentAuditLogsStore = [];
  }

  private seedDefaultCurrencies() {
    const currencies: PlatformCurrencyRecord[] = [
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        flag: '🇮🇳',
        enabled: true,
        isDefault: true,
        countryCode: 'IN',
        countryName: 'India',
        supportedProviders: ['razorpay']
      },
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        flag: '🇺🇸',
        enabled: true,
        isDefault: false,
        countryCode: 'US',
        countryName: 'United States',
        supportedProviders: ['razorpay']
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        flag: '🇬🇧',
        enabled: true,
        isDefault: false,
        countryCode: 'GB',
        countryName: 'United Kingdom',
        supportedProviders: ['razorpay']
      }
    ];

    for (const c of currencies) {
      this.currenciesStore.set(c.code, c);
    }
  }

  private seedDefaultPlanPrices() {
    const seeds: Array<{ plan_id: string; currency: CurrencyCode; setup_fee: number; monthly_fee: number }> = [
      // Starter Plan
      { plan_id: 'starter', currency: 'INR', setup_fee: 19999, monthly_fee: 14999 },
      { plan_id: 'starter', currency: 'USD', setup_fee: 249, monthly_fee: 199 },
      { plan_id: 'starter', currency: 'GBP', setup_fee: 199, monthly_fee: 159 },

      // Growth Plan
      { plan_id: 'growth', currency: 'INR', setup_fee: 34999, monthly_fee: 29999 },
      { plan_id: 'growth', currency: 'USD', setup_fee: 449, monthly_fee: 399 },
      { plan_id: 'growth', currency: 'GBP', setup_fee: 349, monthly_fee: 299 },

      // Scale Plan
      { plan_id: 'scale', currency: 'INR', setup_fee: 59999, monthly_fee: 59999 },
      { plan_id: 'scale', currency: 'USD', setup_fee: 799, monthly_fee: 799 },
      { plan_id: 'scale', currency: 'GBP', setup_fee: 599, monthly_fee: 599 },

      // Enterprise
      { plan_id: 'enterprise', currency: 'INR', setup_fee: 0, monthly_fee: 0 },
      { plan_id: 'enterprise', currency: 'USD', setup_fee: 0, monthly_fee: 0 },
      { plan_id: 'enterprise', currency: 'GBP', setup_fee: 0, monthly_fee: 0 },

      // Enterprise Custom
      { plan_id: 'enterprise_custom', currency: 'INR', setup_fee: 0, monthly_fee: 0 },
      { plan_id: 'enterprise_custom', currency: 'USD', setup_fee: 0, monthly_fee: 0 },
      { plan_id: 'enterprise_custom', currency: 'GBP', setup_fee: 0, monthly_fee: 0 },
    ];

    const now = new Date().toISOString();
    for (const s of seeds) {
      const key = `${s.plan_id.toLowerCase()}_${s.currency.toUpperCase()}`;
      this.planPricesStore.set(key, {
        id: `price_${s.plan_id.toLowerCase()}_${s.currency.toUpperCase()}`,
        plan_id: s.plan_id.toLowerCase(),
        currency: s.currency,
        setup_fee: s.setup_fee,
        monthly_fee: s.monthly_fee,
        active: true,
        created_at: now,
        updated_at: now
      });
    }
  }

  private seedDefaultPromoCodes() {
    const defaultCodes: PlatformPromoCode[] = [
      {
        id: 'promo_growth50',
        code: 'GROWTH50',
        description: '50% off First Month Subscription',
        discountType: 'percentage',
        discountValue: 50,
        appliesTo: 'monthly',
        usageLimit: 100,
        usageCount: 14,
        active: true,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_welcome20',
        code: 'WELCOME20',
        description: '20% off Total Order',
        discountType: 'percentage',
        discountValue: 20,
        appliesTo: 'all',
        usageLimit: 500,
        usageCount: 28,
        active: true,
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_launch100',
        code: 'LAUNCH100',
        description: '100% Setup & Implementation Fee Waiver',
        discountType: 'percentage',
        discountValue: 100,
        appliesTo: 'setup',
        usageLimit: 50,
        usageCount: 9,
        active: true,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_superagent',
        code: 'SUPERAGENT',
        description: '15% Early Adopter Discount',
        discountType: 'percentage',
        discountValue: 15,
        appliesTo: 'all',
        usageLimit: 200,
        usageCount: 6,
        active: true,
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_agentdesk10',
        code: 'AGENTDESK10',
        description: '10% Launch Promotion',
        discountType: 'percentage',
        discountValue: 10,
        appliesTo: 'all',
        usageLimit: 1000,
        usageCount: 42,
        active: true,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_save5000',
        code: 'SAVE5000',
        description: '₹5,000 Flat Discount on INR Orders',
        discountType: 'fixed',
        discountValue: 5000,
        currency: 'INR',
        appliesTo: 'all',
        usageLimit: 50,
        usageCount: 8,
        active: true,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_save50usd',
        code: 'SAVE50USD',
        description: '$50 Flat Discount on USD Orders',
        discountType: 'fixed',
        discountValue: 50,
        currency: 'USD',
        appliesTo: 'all',
        usageLimit: 50,
        usageCount: 5,
        active: true,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_entire100',
        code: 'ENTIRE100',
        description: '100% off initial checkout',
        discountType: 'percentage',
        discountValue: 100,
        appliesTo: 'all',
        usageLimit: 100,
        usageCount: 0,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'promo_save50gbp',
        code: 'SAVE50GBP',
        description: '£50 Flat Discount on GBP Orders',
        discountType: 'fixed',
        discountValue: 50,
        currency: 'GBP',
        appliesTo: 'all',
        usageLimit: 50,
        usageCount: 3,
        active: true,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const code of defaultCodes) {
      this.promoCodesStore.set(code.code.toUpperCase(), code);
    }
  }

  private seedDefaultTenants() {
    const defaultTenants = [
      { id: 'summit-home-services', name: 'Summit Home Services', country: 'US', currency: 'USD' as CurrencyCode, plan: 'scale' },
      { id: 'sharma-dental-care', name: 'Sharma Dental Care', country: 'IN', currency: 'INR' as CurrencyCode, plan: 'growth' },
      { id: 'london-growth-partners', name: 'London Growth Partners', country: 'GB', currency: 'GBP' as CurrencyCode, plan: 'scale' }
    ];

    for (const t of defaultTenants) {
      const p = FIXED_PLAN_PRICES[t.plan] || FIXED_PLAN_PRICES.growth;
      const currencyPrices = p[t.currency] || p.INR;
      const monthly = currencyPrices.monthly;
      const setup = currencyPrices.setup;

      this.tenantBillingStore.set(t.id, {
        businessId: t.id,
        planId: t.plan,
        planName: p.name,
        provider: 'razorpay' as PaymentProviderName,
        providerCustomerId: '',
        providerSubscriptionId: '',
        currency: t.currency,
        monthlyFee: monthly,
        implementationFee: setup,
        implementationFeePaid: true,
        status: 'active',
        nextBillingDate: '',
        autoRenew: false,
        paymentFailed: false,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      });

      // No fake payment methods by default; customer must register real payment method
      this.tenantPaymentMethodsStore.set(t.id, []);

      // No fake invoices; real invoices are generated upon payment events
      this.tenantInvoicesStore.set(t.id, []);

      // No fake transactions; real transactions are recorded upon payments
      this.tenantTransactionsStore.set(t.id, []);
    }
  }

  public getProvider(_name?: PaymentProviderName): PaymentProvider {
    return this.razorpay;
  }

  public getAvailableProviders(currency: CurrencyCode, _country?: string): Array<{
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

    // Razorpay is the designated active billing provider
    list.push({
      name: 'razorpay',
      label: currency === 'INR'
        ? 'Razorpay (Cards, UPI, QR, NetBanking, Wallets)'
        : 'Razorpay (International Cards & Currencies)',
      isConfigured: this.razorpay.isConfigured(),
      isRecommended: true,
      supportsRecurring: this.razorpay.supportsRecurring(currency)
    });

    return list;
  }

  public async getAvailablePaymentMethods(params: {
    currency: CurrencyCode;
    country?: string;
    planId?: string;
  }): Promise<AvailablePaymentMethodsResponse> {
    const { currency, country, planId } = params;
    const isConfigured = this.razorpay.isConfigured();
    const isCurrencySupported = this.razorpay.supportsCurrency(currency);
    const isPaymentAvailable = isConfigured && isCurrencySupported;

    if (!isPaymentAvailable) {
      return {
        success: true,
        currency,
        country,
        planId,
        isPaymentAvailable: false,
        provider: 'razorpay',
        providerName: 'Razorpay',
        providerLabel: 'Razorpay',
        methods: [],
        allowsINRFallback: false,
        unavailableMessage: !isConfigured
          ? 'Payment gateway is not currently configured with live credentials.'
          : `Payments in ${currency} are not supported by the payment gateway.`
      };
    }

    if (currency === 'INR') {
      return {
        success: true,
        currency,
        country,
        planId,
        isPaymentAvailable: true,
        provider: 'razorpay',
        providerName: 'Razorpay',
        providerLabel: 'Razorpay (Cards, UPI, QR, Net Banking, Wallets)',
        methods: [
          { id: 'cards', name: 'Cards', category: 'cards', description: 'Credit & Debit Cards (Visa, Mastercard, RuPay, Amex)', popular: true },
          { id: 'upi', name: 'UPI', category: 'upi', description: 'Google Pay, PhonePe, Paytm & any UPI app', popular: true },
          { id: 'qr', name: 'QR Code', category: 'qr', description: 'Dynamic Instant QR Code' },
          { id: 'netbanking', name: 'Net Banking', category: 'netbanking', description: '50+ Major Indian Banks' },
          { id: 'wallets', name: 'Wallets', category: 'wallets', description: 'Paytm, PhonePe & Wallets' }
        ],
        allowsINRFallback: false
      };
    }

    // International Currencies: USD, GBP -> Razorpay International
    return {
      success: true,
      currency,
      country,
      planId,
      isPaymentAvailable: true,
      provider: 'razorpay',
      providerName: 'Razorpay',
      providerLabel: 'Razorpay (International Credit & Debit Cards)',
      methods: [
        { id: 'cards', name: 'Credit or Debit Card', category: 'cards', description: 'Visa, Mastercard, American Express, Diners Club', popular: true }
      ],
      allowsINRFallback: false
    };
  }

  public getTenantBilling(businessId: string): TenantBillingRecord {
    const norm = businessId.trim().toLowerCase();
    const existing = this.tenantBillingStore.get(norm);

    // Billing displayed to customers must always come from the canonical
    // platform plan-price table, never from the legacy demo seed values.
    const business = serverBusinessesStore.get(norm);
    const planId = normalizePlanId(business?.plan || existing?.planId || 'growth');
    const currency = (
      business?.currency === 'INR' ||
      business?.currency === 'GBP' ||
      business?.currency === 'USD'
    ) ? business.currency : (business?.country === 'IN' ? 'INR' : 'USD');

    const priceRecord = this.getPlanPrice(planId, currency as CurrencyCode);
    const fallbackPlan = FIXED_PLAN_PRICES[planId] || FIXED_PLAN_PRICES.growth;
    const canonicalPricing = priceRecord
      ? { monthly: priceRecord.monthly_fee, setup: priceRecord.setup_fee }
      : fallbackPlan[currency as CurrencyCode] || fallbackPlan.USD;

    const nextDate = existing?.nextBillingDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    })();

    const record: TenantBillingRecord = {
      ...(business?.billing && typeof business.billing === 'object' ? business.billing : {}),
      ...(existing || {}),
      businessId: norm,
      planId,
      planName: fallbackPlan.name,
      provider: existing?.provider || 'razorpay',
      currency: currency as CurrencyCode,
      monthlyFee: canonicalPricing.monthly,
      implementationFee: canonicalPricing.setup,
      implementationFeePaid: existing?.implementationFeePaid ?? true,
      status: existing?.status || 'trialing',
      nextBillingDate: nextDate,
      autoRenew: existing?.autoRenew ?? true,
      paymentFailed: existing?.paymentFailed ?? false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tenantBillingStore.set(norm, record);
    return record;
  }

  public getPaymentMethods(businessId: string): SafePaymentMethod[] {
    const norm = businessId.trim().toLowerCase();
    return this.tenantPaymentMethodsStore.get(norm) || [];
  }

  public getInvoices(businessId: string): BillingInvoice[] {
    const norm = businessId.trim().toLowerCase();
    return this.tenantInvoicesStore.get(norm) || [];
  }

  public getAllInvoices(): BillingInvoice[] {
    const all: BillingInvoice[] = [];
    for (const invoices of this.tenantInvoicesStore.values()) {
      all.push(...invoices);
    }
    return all.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  }

  public getTransactions(businessId: string): BillingTransaction[] {
    const norm = businessId.trim().toLowerCase();
    return this.tenantTransactionsStore.get(norm) || [];
  }

  public getAllTransactions(): BillingTransaction[] {
    const all: BillingTransaction[] = [];
    for (const txs of this.tenantTransactionsStore.values()) {
      all.push(...txs);
    }
    return all.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  }

  public validateCoupon(couponCode: string, planId?: string, currency?: CurrencyCode, customerEmail?: string, tenantId?: string, customSubtotal?: number): CouponValidationResult {
    if (!couponCode || !couponCode.trim()) {
      return {
        valid: false,
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        discountAmount: 0,
        message: 'Please enter a promotional code.'
      };
    }
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = this.promoCodesStore.get(cleanCode);
    
    // Privacy protection & Generic error message as required by spec:
    // "Do not reveal why another customer's coupon exists."
    // "If invalid: Show clear error: 'Invalid or expired promotional code'"
    const invalidResponse: CouponValidationResult = {
      valid: false,
      code: cleanCode,
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      message: 'Invalid or expired promotional code.'
    };

    if (!coupon || !coupon.active) {
      return invalidResponse;
    }

    // Check expiry
    if (coupon.expiryDate) {
      const exp = new Date(coupon.expiryDate).getTime();
      if (!isNaN(exp) && Date.now() > exp) {
        return invalidResponse;
      }
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return invalidResponse;
    }

    // Check plan restriction
    if (coupon.planId && planId && coupon.planId.toLowerCase() !== planId.toLowerCase()) {
      return invalidResponse;
    }

    // Check tenant restriction
    if (coupon.tenantId && tenantId && coupon.tenantId.toLowerCase() !== tenantId.toLowerCase()) {
      return invalidResponse;
    }

    // Check email restriction
    if (coupon.customerEmail && customerEmail && coupon.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      return invalidResponse;
    }

    const p = FIXED_PLAN_PRICES[planId || 'growth'] || FIXED_PLAN_PRICES.growth;
    const curr = currency || 'INR';
    const prices = p[curr] || p.INR;
    const monthly = prices.monthly;
    const setup = prices.setup;
    const subtotal = customSubtotal !== undefined ? customSubtotal : (monthly + setup);

    // Check min order value
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return invalidResponse;
    }

    let discountAmount = 0;
    if (coupon.appliesTo === 'setup') {
      discountAmount = coupon.discountType === 'percentage' 
        ? Math.round((setup * coupon.discountValue) / 100 * 100) / 100
        : Math.min(coupon.discountValue, setup);
    } else if (coupon.appliesTo === 'monthly' || coupon.appliesTo === 'first_month' || coupon.appliesTo === 'recurring') {
      discountAmount = coupon.discountType === 'percentage'
        ? Math.round((monthly * coupon.discountValue) / 100 * 100) / 100
        : Math.min(coupon.discountValue, monthly);
    } else {
      discountAmount = coupon.discountType === 'percentage'
        ? Math.round((subtotal * coupon.discountValue) / 100 * 100) / 100
        : Math.min(coupon.discountValue, subtotal);
    }

    return {
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      appliesTo: coupon.appliesTo,
      message: `Code applied: ${coupon.description}`
    };
  }

  // ----------------------------------------------------
  // SERVER TAX CONFIGURATION ENGINE
  // ----------------------------------------------------

  public getTaxConfiguration(): TaxConfiguration {
    return { ...this.taxConfig };
  }

  public updateTaxConfiguration(updates: Partial<TaxConfiguration>, updatedBy?: string): TaxConfiguration {
    const nextEnabled = updates.enabled !== undefined ? Boolean(updates.enabled) : this.taxConfig.enabled;
    const nextRegStatus = updates.registration_status !== undefined ? updates.registration_status : this.taxConfig.registration_status;
    const nextGstin = updates.gstin !== undefined ? (updates.gstin ? updates.gstin.trim().toUpperCase() : null) : this.taxConfig.gstin;
    const effectiveDateProvided = updates.effective_from !== undefined ? (updates.effective_from ? updates.effective_from.trim() : null) : this.taxConfig.effective_from;
    const nextEffectiveFrom = (nextEnabled && !effectiveDateProvided) 
      ? new Date().toISOString().split('T')[0] 
      : effectiveDateProvided;
    const nextSubRate = updates.subscription_tax_rate !== undefined 
      ? Math.max(0, Math.min(1, Number(updates.subscription_tax_rate))) 
      : this.taxConfig.subscription_tax_rate;
    const nextSetupRate = updates.setup_tax_rate !== undefined 
      ? Math.max(0, Math.min(1, Number(updates.setup_tax_rate))) 
      : this.taxConfig.setup_tax_rate;
    const nextDefaultRate = updates.default_rate !== undefined 
      ? Math.max(0, Math.min(1, Number(updates.default_rate))) 
      : (nextSubRate || this.taxConfig.default_rate);

    // Strict validation if Platform Admin tries to enable GST collection
    if (nextEnabled) {
      if (nextRegStatus !== 'REGISTERED') {
        throw new Error('Cannot enable GST collection while GST registration status is NOT REGISTERED.');
      }
      if (!nextGstin || nextGstin.length < 5) {
        throw new Error('A valid GSTIN is mandatory before GST tax collection can be enabled.');
      }
      if (nextSubRate <= 0 && nextSetupRate <= 0 && nextDefaultRate <= 0) {
        throw new Error('A valid GST rate greater than 0% is required before enabling tax collection.');
      }
    }

    this.taxConfig.enabled = nextEnabled;
    this.taxConfig.registration_status = nextRegStatus;
    this.taxConfig.gstin = nextGstin;
    this.taxConfig.effective_from = nextEffectiveFrom;
    this.taxConfig.subscription_tax_rate = nextEnabled ? nextSubRate : 0.00;
    this.taxConfig.setup_tax_rate = nextEnabled ? nextSetupRate : 0.00;
    this.taxConfig.default_rate = nextEnabled ? nextDefaultRate : 0.00;
    this.taxConfig.tax_name = updates.tax_name?.trim() || this.taxConfig.tax_name || 'GST';

    if (updates.tax_label !== undefined && updates.tax_label.trim()) {
      this.taxConfig.tax_label = updates.tax_label.trim();
    } else {
      this.taxConfig.tax_label = nextEnabled 
        ? `${Math.round(nextSubRate * 100)}% GST` 
        : 'GST Disabled (Non-Registered)';
    }

    if (updates.tax_disclaimer !== undefined && updates.tax_disclaimer.trim()) {
      this.taxConfig.tax_disclaimer = updates.tax_disclaimer.trim();
    } else {
      this.taxConfig.tax_disclaimer = nextEnabled
        ? 'GST applied as per statutory registration.'
        : 'AgentDesk is currently not GST registered. No tax is collected or charged.';
    }

    this.taxConfig.rule_summary = nextEnabled
      ? `GST Enabled (${nextGstin}). Subscription: ${Math.round(nextSubRate * 100)}% • Setup: ${Math.round(nextSetupRate * 100)}%`
      : 'GST is currently disabled. AgentDesk is not GST registered.';

    this.taxConfig.updatedAt = new Date().toISOString();
    if (updatedBy) {
      this.taxConfig.updatedBy = updatedBy;
    }
    return { ...this.taxConfig };
  }

  // ----------------------------------------------------
  // PLATFORM ADMIN PROMOTIONAL CODE ENGINE
  // ----------------------------------------------------

  public getAllPromoCodes(): PlatformPromoCode[] {
    return Array.from(this.promoCodesStore.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getPromoCode(code: string): PlatformPromoCode | undefined {
    return this.promoCodesStore.get(code.trim().toUpperCase());
  }

  public createPromoCode(data: {
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    appliesTo: 'monthly' | 'setup' | 'all' | 'first_month' | 'recurring';
    tenantId?: string;
    customerEmail?: string;
    planId?: string;
    expiryDate?: string;
    usageLimit?: number;
    minOrderValue?: number;
    active?: boolean;
  }): PlatformPromoCode {
    const cleanCode = data.code.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Promotional code cannot be empty.');
    }
    if (this.promoCodesStore.has(cleanCode)) {
      throw new Error(`Promo code "${cleanCode}" already exists.`);
    }

    const newPromo: PlatformPromoCode = {
      id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: cleanCode,
      description: (data.description || '').trim() || `${cleanCode} promotional discount`,
      discountType: data.discountType || 'percentage',
      discountValue: Number(data.discountValue) || 0,
      appliesTo: data.appliesTo || 'all',
      tenantId: data.tenantId?.trim() || undefined,
      customerEmail: data.customerEmail?.trim()?.toLowerCase() || undefined,
      planId: data.planId?.trim() || undefined,
      expiryDate: data.expiryDate?.trim() || undefined,
      usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
      usageCount: 0,
      minOrderValue: data.minOrderValue ? Number(data.minOrderValue) : undefined,
      active: data.active !== undefined ? Boolean(data.active) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.promoCodesStore.set(cleanCode, newPromo);
    return newPromo;
  }

  public updatePromoCode(code: string, data: Partial<PlatformPromoCode>): PlatformPromoCode {
    const cleanCode = code.trim().toUpperCase();
    const existing = this.promoCodesStore.get(cleanCode);
    if (!existing) {
      throw new Error(`Promo code "${cleanCode}" not found.`);
    }

    const updated: PlatformPromoCode = {
      ...existing,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      discountType: data.discountType !== undefined ? data.discountType : existing.discountType,
      discountValue: data.discountValue !== undefined ? Number(data.discountValue) : existing.discountValue,
      appliesTo: data.appliesTo !== undefined ? data.appliesTo : existing.appliesTo,
      tenantId: data.tenantId !== undefined ? (data.tenantId.trim() || undefined) : existing.tenantId,
      customerEmail: data.customerEmail !== undefined ? (data.customerEmail.trim().toLowerCase() || undefined) : existing.customerEmail,
      planId: data.planId !== undefined ? (data.planId.trim() || undefined) : existing.planId,
      expiryDate: data.expiryDate !== undefined ? (data.expiryDate.trim() || undefined) : existing.expiryDate,
      usageLimit: data.usageLimit !== undefined ? (data.usageLimit ? Number(data.usageLimit) : undefined) : existing.usageLimit,
      minOrderValue: data.minOrderValue !== undefined ? (data.minOrderValue ? Number(data.minOrderValue) : undefined) : existing.minOrderValue,
      active: data.active !== undefined ? Boolean(data.active) : existing.active,
      updatedAt: new Date().toISOString()
    };

    this.promoCodesStore.set(cleanCode, updated);
    return updated;
  }

  public deletePromoCode(code: string): boolean {
    const cleanCode = code.trim().toUpperCase();
    return this.promoCodesStore.delete(cleanCode);
  }

  // ----------------------------------------------------
  // PLATFORM MULTI-CURRENCY & PLAN PRICING MANAGEMENT
  // ----------------------------------------------------

  public async getProvidersHealth(): Promise<{
    razorpay: ProviderHealthReport;
  }> {
    const razorpayReport = await this.razorpay.checkHealth();
    return {
      razorpay: razorpayReport
    };
  }

  public async getAllCurrencies(): Promise<PlatformCurrencyRecord[]> {
    const health = await this.getProvidersHealth();
    const isConnected = health.razorpay.status === 'Connected';
    return Array.from(this.currenciesStore.values()).map(c => {
      return {
        ...c,
        supportedProviders: ['razorpay'],
        providerStatus: health.razorpay.status,
        currencyStatus: c.enabled && isConnected ? 'Enabled' : 'Disabled for checkout',
        checkoutAvailability: c.enabled && isConnected ? 'Available' : 'Unavailable'
      };
    });
  }

  public recordAuditLog(entry: Omit<PaymentAuditLogEntry, 'id' | 'timestamp'>): PaymentAuditLogEntry {
    const log: PaymentAuditLogEntry = {
      id: `audit_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.paymentAuditLogsStore.unshift(log);
    if (this.paymentAuditLogsStore.length > 500) {
      this.paymentAuditLogsStore.pop();
    }
    return log;
  }

  public getPaymentAuditLogs(filter?: { tenantId?: string; provider?: string }): PaymentAuditLogEntry[] {
    let logs = [...this.paymentAuditLogsStore];
    if (filter?.tenantId) {
      const norm = filter.tenantId.toLowerCase();
      logs = logs.filter(l => l.tenantId?.toLowerCase() === norm);
    }
    if (filter?.provider && filter.provider !== 'all') {
      logs = logs.filter(l => l.provider.toLowerCase() === filter.provider?.toLowerCase());
    }
    return logs;
  }

  public getEnabledCurrencies(): PlatformCurrencyRecord[] {
    return Array.from(this.currenciesStore.values()).filter(c => c.enabled);
  }

  public isCurrencyEnabled(currency: CurrencyCode): boolean {
    const c = this.currenciesStore.get(currency);
    return Boolean(c && c.enabled);
  }

  public toggleCurrency(code: CurrencyCode, enabled: boolean): PlatformCurrencyRecord {
    const c = this.currenciesStore.get(code);
    if (!c) {
      throw new Error(`Currency ${code} is not recognized by the platform.`);
    }
    if (code === 'INR' && !enabled) {
      throw new Error('Cannot disable INR while active Razorpay domestic plans depend on it.');
    }
    c.enabled = enabled;
    return { ...c };
  }

  public getAllPlanPrices(): PlanPriceRecord[] {
    return Array.from(this.planPricesStore.values());
  }

  public getPlanPricesForPlan(planId: string): PlanPriceRecord[] {
    const cleanPlanId = (planId || 'starter').trim().toLowerCase();
    return Array.from(this.planPricesStore.values()).filter(p => p.plan_id === cleanPlanId);
  }

  public getPlanPrice(planId: string, currency: CurrencyCode): PlanPriceRecord | undefined {
    const cleanPlanId = (planId || 'starter').trim().toLowerCase();
    const key = `${cleanPlanId}_${currency.toUpperCase()}`;
    return this.planPricesStore.get(key);
  }

  public updatePlanPrice(planId: string, currency: CurrencyCode, setupFee: number, monthlyFee: number, active: boolean = true): PlanPriceRecord {
    const cleanPlanId = (planId || 'starter').trim().toLowerCase();
    if (typeof setupFee !== 'number' || setupFee < 0) {
      throw new Error('Setup fee must be a non-negative number.');
    }
    if (typeof monthlyFee !== 'number' || monthlyFee < 0) {
      throw new Error('Monthly fee must be a non-negative number.');
    }

    const key = `${cleanPlanId}_${currency.toUpperCase()}`;
    const existing = this.planPricesStore.get(key);
    const now = new Date().toISOString();

    const record: PlanPriceRecord = {
      id: existing ? existing.id : `price_${cleanPlanId}_${currency.toUpperCase()}`,
      plan_id: cleanPlanId,
      currency,
      setup_fee: setupFee,
      monthly_fee: monthlyFee,
      active,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    };

    this.planPricesStore.set(key, record);

    return record;
  }

  public getRevenueAnalyticsByCurrency() {
    const records = Array.from(this.paymentRecordsStore.values()).filter(r => r.status === 'CAPTURED');
    const subs = Array.from(this.subscriptionRecordsStore.values()).filter(s => s.status === 'ACTIVE');

    const analytics: Record<CurrencyCode, {
      currency: CurrencyCode;
      symbol: string;
      totalRevenue: number;
      transactionCount: number;
      activeSubscriptions: number;
    }> = {
      INR: { currency: 'INR', symbol: '₹', totalRevenue: 0, transactionCount: 0, activeSubscriptions: 0 },
      USD: { currency: 'USD', symbol: '$', totalRevenue: 0, transactionCount: 0, activeSubscriptions: 0 },
      GBP: { currency: 'GBP', symbol: '£', totalRevenue: 0, transactionCount: 0, activeSubscriptions: 0 }
    };

    for (const r of records) {
      const cur = r.currency || 'INR';
      if (analytics[cur]) {
        analytics[cur].totalRevenue += (r.final_amount ?? r.amount ?? 0);
        analytics[cur].transactionCount += 1;
      }
    }

    for (const s of subs) {
      const cur = s.currency || 'INR';
      if (analytics[cur]) {
        analytics[cur].activeSubscriptions += 1;
      }
    }

    return analytics;
  }

  public togglePromoCodeActive(code: string): PlatformPromoCode {
    const cleanCode = code.trim().toUpperCase();
    const existing = this.promoCodesStore.get(cleanCode);
    if (!existing) {
      throw new Error(`Promo code "${cleanCode}" not found.`);
    }
    existing.active = !existing.active;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  public calculateOrderAmount(params: {
    planId: string;
    currency: CurrencyCode;
    type?: 'initial_checkout' | 'implementation_fee' | 'subscription';
    couponCode?: string;
    country?: string;
    state?: string;
    gstin?: string;
    customerEmail?: string;
    tenantId?: string;
  }): OrderCalculationResult {
    const { planId, currency, type = 'initial_checkout', couponCode, country, gstin, customerEmail, tenantId } = params;

    // 1. Authoritative Currency Validation
    if (!this.isCurrencyEnabled(currency)) {
      throw new Error(`Currency ${currency} is not currently enabled for checkout.`);
    }

    // 2. Authoritative Multi-Currency Plan Pricing lookup from plan_prices
    const priceRecord = this.getPlanPrice(planId, currency);
    if (!priceRecord) {
      throw new Error(`Pricing configuration for plan "${planId}" in currency "${currency}" not found.`);
    }

    const planName = FIXED_PLAN_PRICES[planId]?.name || planId.charAt(0).toUpperCase() + planId.slice(1);
    const monthlyFee = priceRecord.monthly_fee;
    const setupFee = priceRecord.setup_fee;

    let rawSetupFee = 0;
    let rawSubscriptionFee = 0;

    if (type === 'implementation_fee') {
      rawSetupFee = setupFee;
      rawSubscriptionFee = 0;
    } else if (type === 'subscription') {
      rawSetupFee = 0;
      rawSubscriptionFee = monthlyFee;
    } else {
      // 'initial_checkout' bundles one-time setup fee + first-month recurring subscription
      rawSetupFee = setupFee;
      rawSubscriptionFee = monthlyFee;
    }

    const subtotal = rawSetupFee + rawSubscriptionFee;

    let appliedCoupon: PlatformPromoCode | null = null;
    let couponError: string | null = null;
    let setup_discount = 0;
    let subscription_discount = 0;

    if (couponCode && couponCode.trim()) {
      const code = couponCode.trim().toUpperCase();
      const coupon = this.promoCodesStore.get(code);
      if (coupon && coupon.active) {
        // Check expiry
        const isExpired = coupon.expiryDate && (new Date(coupon.expiryDate).getTime() < Date.now());
        const isLimitExceeded = coupon.usageLimit && (coupon.usageCount >= coupon.usageLimit);
        const isBelowMinOrder = coupon.minOrderValue && (subtotal < coupon.minOrderValue);
        const isPlanMismatch = coupon.planId && planId && (coupon.planId.toLowerCase() !== planId.toLowerCase());
        const isTenantMismatch = coupon.tenantId && tenantId && (coupon.tenantId.toLowerCase() !== tenantId.toLowerCase());
        const isEmailMismatch = coupon.customerEmail && customerEmail && (coupon.customerEmail.toLowerCase() !== customerEmail.toLowerCase());
        // Currency isolation: fixed amount coupons must match the order currency
        const isCurrencyMismatch = coupon.discountType === 'fixed' && coupon.currency && (coupon.currency !== currency);

        if (isCurrencyMismatch) {
          couponError = `Promotional code "${code}" is valid only for ${coupon.currency} orders.`;
        } else if (!isExpired && !isLimitExceeded && !isBelowMinOrder && !isPlanMismatch && !isTenantMismatch && !isEmailMismatch) {
          appliedCoupon = coupon;

          if (coupon.appliesTo === 'setup') {
            setup_discount = coupon.discountType === 'percentage' 
              ? Math.round((rawSetupFee * coupon.discountValue) / 100 * 100) / 100
              : Math.min(coupon.discountValue, rawSetupFee);
            subscription_discount = 0;
          } else if (coupon.appliesTo === 'monthly' || coupon.appliesTo === 'first_month' || coupon.appliesTo === 'recurring') {
            subscription_discount = coupon.discountType === 'percentage'
              ? Math.round((rawSubscriptionFee * coupon.discountValue) / 100 * 100) / 100
              : Math.min(coupon.discountValue, rawSubscriptionFee);
            setup_discount = 0;
          } else {
            // 'all' applies to overall order
            if (coupon.discountType === 'percentage') {
              setup_discount = Math.round((rawSetupFee * coupon.discountValue) / 100 * 100) / 100;
              subscription_discount = Math.round((rawSubscriptionFee * coupon.discountValue) / 100 * 100) / 100;
            } else {
              setup_discount = Math.min(coupon.discountValue, rawSetupFee);
              const remaining = Math.max(0, coupon.discountValue - setup_discount);
              subscription_discount = Math.min(remaining, rawSubscriptionFee);
            }
          }
        } else {
          couponError = 'Invalid or expired promotional code';
        }
      } else {
        couponError = 'Invalid or expired promotional code';
      }
    }

    const totalDiscount = Math.round((setup_discount + subscription_discount) * 100) / 100;

    // Server-side Tax Configuration Check
    // When GST is disabled (business is NOT registered), no tax is calculated or charged.
    const isIndia = currency === 'INR' || country?.toUpperCase() === 'IN' || country?.toUpperCase() === 'INDIA';
    const isTaxActive = Boolean(this.taxConfig.enabled && this.taxConfig.registration_status === 'REGISTERED');
    const subTaxRate = (isTaxActive && isIndia) ? this.taxConfig.subscription_tax_rate : 0.0;
    const setupTaxRate = (isTaxActive && isIndia) ? this.taxConfig.setup_tax_rate : 0.0;

    const setup_net = Math.max(0, rawSetupFee - setup_discount);
    const setup_tax = isTaxActive ? Math.round(setup_net * setupTaxRate * 100) / 100 : 0.00;
    const setup_total = Math.round((setup_net + setup_tax) * 100) / 100;

    const subscription_net = Math.max(0, rawSubscriptionFee - subscription_discount);
    const subscription_tax = isTaxActive ? Math.round(subscription_net * subTaxRate * 100) / 100 : 0.00;
    const subscription_total = Math.round((subscription_net + subscription_tax) * 100) / 100;

    const total_due_today = Math.round((setup_total + subscription_total) * 100) / 100;

    // Recurring subscription for subsequent billing cycles:
    // Setup fee is ONE-TIME and NEVER included in recurring subscription.
    const recurringDiscount = (appliedCoupon && appliedCoupon.appliesTo === 'recurring')
      ? (appliedCoupon.discountType === 'percentage'
          ? Math.round((monthlyFee * appliedCoupon.discountValue) / 100 * 100) / 100
          : Math.min(appliedCoupon.discountValue, monthlyFee))
      : 0;
    const recurring_base_amount = Math.max(0, monthlyFee - recurringDiscount);
    const recurring_tax_amount = isTaxActive ? Math.round(recurring_base_amount * subTaxRate * 100) / 100 : 0.00;
    const recurring_total_amount = Math.round((recurring_base_amount + recurring_tax_amount) * 100) / 100;

    const taxLabel = isTaxActive
      ? (setupTaxRate === 0 ? `${Math.round(subTaxRate * 100)}% GST on Subscription Only` : `${Math.round(subTaxRate * 100)}% GST`)
      : '0% Tax (GST Disabled)';

    return {
      planId,
      planName,
      currency,

      // Mandatory separated components
      setup_fee: rawSetupFee,
      setup_discount,
      setup_tax,
      setup_fee_tax: setup_tax,
      setup_total,

      subscription_fee: rawSubscriptionFee,
      subscription_discount,
      subscription_tax,
      subscription_total,

      discount: totalDiscount,
      total_due_today,

      recurring_base_amount,
      recurring_tax_amount,
      recurring_total_amount,

      subscription_tax_rate: subTaxRate,
      setup_tax_rate: setupTaxRate,
      tax_rate: subTaxRate,

      // Backward-compatible & authoritative fields
      monthlyFee,
      setupFee,
      subtotal,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponDescription: appliedCoupon ? appliedCoupon.description : null,
      discountAmount: totalDiscount,
      couponError,
      taxAmount: subscription_tax + setup_tax,
      tax_enabled: isTaxActive,
      taxEnabled: isTaxActive,
      tax_registration_status: this.taxConfig.registration_status,
      taxLabel,
      totalDueToday: total_due_today,
      recurringAmount: recurring_total_amount,
      gstin: isTaxActive ? (gstin || null) : null,
      taxDisclaimer: this.taxConfig.tax_disclaimer
    };
  }

  /**
   * Activate a legitimately zero-value promotional checkout without calling Razorpay.
   * A zero-value order must never be sent to the payment gateway.
   */
  public async activatePromotionalCheckout(params: {
    businessId: string;
    businessName: string;
    planId: string;
    currency: CurrencyCode;
    couponCode: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    billingAddress?: BillingAddressDetails;
    displayCurrency?: CurrencyCode;
    displayAmount?: number;
  }) {
    const { businessId, businessName, planId, currency, couponCode, customerEmail, customerName, customerPhone, billingAddress, displayCurrency, displayAmount } = params;
    const cleanCoupon = couponCode.trim().toUpperCase();
    const norm = businessId.trim().toLowerCase();
    if (!norm || !businessName.trim() || !customerEmail.trim() || !customerName.trim()) {
      throw new Error('Required customer and business details are missing.');
    }
    const coupon = this.promoCodesStore.get(cleanCoupon);
    if (!coupon || !coupon.active) throw new Error('Invalid or expired promotional code.');
    if (coupon.discountType !== 'percentage' || coupon.discountValue !== 100 || coupon.appliesTo !== 'all') {
      throw new Error('This promotional code does not qualify for free activation.');
    }
    const calc = this.calculateOrderAmount({
      planId, currency, type: 'initial_checkout', couponCode: cleanCoupon,
      country: billingAddress?.country, state: billingAddress?.state, gstin: billingAddress?.gstin,
      customerEmail, tenantId: norm
    });
    if (calc.couponError || calc.couponCode !== cleanCoupon) throw new Error('Invalid or expired promotional code.');
    if (calc.total_due_today !== 0 || calc.discountAmount !== calc.subtotal) {
      throw new Error('This promotional code does not cover the full initial checkout.');
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw new Error('This promotional code has reached its usage limit.');
    const existing = serverBusinessesStore.get(norm);
    if (existing?.status === 'active' && existing?.subscriptionState === 'ACTIVE') throw new Error('This workspace has already been activated.');
    const now = new Date();
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 30);
    const nextBillingDateFormatted = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const promoOrderId = 'promo_' + cleanCoupon + '_' + Date.now();
    const provResult = await provisionCustomerTenant({
      tenantId: norm, businessName: businessName.trim(), customerName: customerName.trim(),
      customerEmail: customerEmail.trim(), customerPhone: customerPhone?.trim(), planId, currency, orderId: promoOrderId
    });
    const user = getUserByEmail(customerEmail.trim());
    let sessionToken: string | undefined;
    if (user) {
      updateUser(user.id, { tenantId: norm, role: 'BUSINESS_ADMIN', status: 'ACTIVE', emailVerified: true });
      const session = await createSession(user.id, user.email, 'BUSINESS_ADMIN', norm);
      sessionToken = session.token;
    }
    const recurringAmount = calc.recurring_total_amount;
    this.subscriptionRecordsStore.set(norm, {
      id: 'promo_sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      userId: customerEmail.trim(), tenantId: norm, plan: planId, status: 'ACTIVE', billingInterval: 'monthly',
      amount: recurringAmount, currency, monthly_price: calc.recurring_base_amount, monthlyPrice: calc.recurring_base_amount,
      baseAmount: calc.recurring_base_amount, base_amount: calc.recurring_base_amount, taxAmount: calc.recurring_tax_amount,
      tax_amount: calc.recurring_tax_amount, taxRate: calc.subscription_tax_rate, final_amount: recurringAmount,
      setupPayment: 'ONE_TIME', subscriptionType: 'RECURRING', provider: 'razorpay',
      currentPeriodStart: now.toISOString(), currentPeriodEnd: nextDate.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(),
      metadata: { billingMode: 'PROMOTIONAL_FREE_ACTIVATION', couponCode: cleanCoupon, initialAmountWaived: calc.subtotal, recurringAmountDue: recurringAmount, recurringPaymentSetupRequired: true, displayCurrency: displayCurrency || currency, displayAmount: displayAmount ?? calc.total_due_today }
    });
    const billing = this.getTenantBilling(norm);
    billing.businessName = businessName.trim(); billing.customerName = customerName.trim(); billing.customerEmail = customerEmail.trim(); billing.customerPhone = customerPhone?.trim();
    billing.planId = planId; billing.planName = calc.planName; billing.provider = 'razorpay'; billing.status = 'active'; billing.paymentStatus = 'paid';
    billing.lastPaymentId = undefined; billing.paymentFailed = false; billing.currency = currency; billing.monthlyFee = recurringAmount;
    billing.implementationFee = calc.setup_total; billing.implementationFeePaid = true; billing.setup_fee = calc.setup_fee; billing.setup_discount = calc.setup_discount;
    billing.setup_tax = calc.setup_tax; billing.setup_fee_tax = calc.setup_fee_tax; billing.subscription_fee = calc.subscription_fee; billing.subscription_tax = calc.subscription_tax;
    billing.recurring_base_amount = calc.recurring_base_amount; billing.recurring_tax_amount = calc.recurring_tax_amount; billing.recurring_total_amount = recurringAmount;
    billing.subscription_tax_rate = calc.subscription_tax_rate; billing.setup_tax_rate = calc.setup_tax_rate; billing.nextBillingDate = nextBillingDateFormatted;
    billing.providerSubscriptionId = undefined; billing.updatedAt = now.toISOString(); this.tenantBillingStore.set(norm, billing);
    coupon.usageCount = (coupon.usageCount || 0) + 1; coupon.updatedAt = now.toISOString();
    this.recordAuditLog({ action: 'tenant_activated', tenantId: norm, businessName: businessName.trim(), customerEmail: customerEmail.trim(), provider: 'razorpay', amount: 0, currency, status: 'PROMOTIONAL_FREE_ACTIVATION', details: { couponCode: cleanCoupon, initialAmountWaived: calc.subtotal, recurringAmountDue: recurringAmount, recurringPaymentSetupRequired: true } });
    return { success: true, status: 'ACTIVATED', activationType: 'PROMOTIONAL_FREE', tenantId: norm, sessionToken, paymentId: 'PROMO-' + cleanCoupon, amount: 0, currency, displayCurrency: displayCurrency || currency, displayAmount: displayAmount ?? 0, planId, planName: calc.planName, setupFee: calc.setup_fee, subscriptionFee: calc.subscription_fee, nextBillingDate: nextBillingDateFormatted, recurringAmount, recurringPaymentSetupRequired: true, business: provResult.business, agent: provResult.agent, breakdown: calc };
  }
  public async createCheckoutSession(params: {
    businessId: string;
    businessName?: string;
    planId: string;
    type: 'implementation_fee' | 'subscription' | 'initial_checkout';
    currency: CurrencyCode;
    displayCurrency?: CurrencyCode;
    displayAmount?: number;
    providerName: PaymentProviderName;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    couponCode?: string;
    billingAddress?: BillingAddressDetails;
  }) {
    const { 
      businessId, 
      businessName, 
      planId, 
      type, 
      currency, 
      displayCurrency,
      displayAmount,
      providerName, 
      customerEmail, 
      customerName, 
      customerPhone,
      couponCode,
      billingAddress
    } = params;

    const calc = this.calculateOrderAmount({
      planId,
      currency,
      type,
      couponCode,
      country: billingAddress?.country,
      state: billingAddress?.state,
      gstin: billingAddress?.gstin
    });

    const provider = this.getProvider(providerName);
    if (!provider.isConfigured()) {
      throw new Error('Online payments are temporarily unavailable. Please contact sales.');
    }
    if (!provider.supportsCurrency(currency)) {
      throw new Error('This payment method is not available for this currency.');
    }

    const normalizedTenantId = businessId.trim().toLowerCase();

    // Idempotency / Deduplication check:
    // If a pending order already exists with identical parameters and amount, return existing order
    const existingPending = Array.from(this.pendingSignupsStore.values()).find(s => 
      s.tenantId === normalizedTenantId && 
      s.planId === planId && 
      s.currency === currency && 
      s.totalDueToday === calc.totalDueToday && 
      s.status === 'PENDING'
    );
    if (existingPending && existingPending.razorpayOrderId) {
      const existingPayment = this.paymentRecordsStore.get(existingPending.razorpayOrderId);
      if (existingPayment && existingPayment.status === 'PENDING') {
        const pubKey = provider.getPublicKey?.() || '';
        return {
          success: true,
          type,
          orderId: existingPending.provider_order_id || existingPending.razorpayOrderId,
          amount: calc.totalDueToday,
          breakdown: calc,
          currency,
          provider: providerName,
          planId,
          planName: calc.planName,
          tenantId: normalizedTenantId,
          status: 'PENDING',
          keyId: pubKey
        };
      }
    }

    if (type === 'initial_checkout') {
      // Bundled Order for setup fee + first month subscription with discounts and taxes
      const payment = await provider.createPayment({
        businessId,
        amount: calc.totalDueToday,
        currency,
        description: `AgentDesk ${calc.planName} Plan - Setup Fee + 1st Month Subscription`,
        type: 'initial_checkout',
        metadata: {
          planId,
          planName: calc.planName,
          businessName: businessName || businessId,
          customerEmail,
          customerName,
          customerPhone,
          couponCode: calc.couponCode || '',
          discountAmount: String(calc.discountAmount),
          taxAmount: String(calc.taxAmount),
          totalDueToday: String(calc.totalDueToday),
          setup_fee: calc.setup_fee,
          setup_discount: calc.setup_discount,
          setup_tax: calc.setup_tax,
          subscription_fee: calc.subscription_fee,
          subscription_discount: calc.subscription_discount,
          subscription_tax: calc.subscription_tax,
          gstin: billingAddress?.gstin || ''
        }
      });

      const orderId = payment.orderId || payment.id;

      // 1. Record Pending Signup (CRITICAL: DOES NOT CREATE TENANT YET)
      const pendingSignup: PendingSignup = {
        id: `signup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tenantId: normalizedTenantId,
        businessName: businessName || businessId,
        customerName: customerName || billingAddress?.contactName || 'Valued Customer',
        customerEmail: customerEmail || billingAddress?.email || 'billing@customer.com',
        customerPhone: customerPhone || billingAddress?.phone || '',
        planId,
        planName: calc.planName,
        currency,
        display_currency: displayCurrency || currency,
        display_amount: displayAmount !== undefined ? displayAmount : calc.totalDueToday,
        payment_currency: currency,
        payment_amount: calc.totalDueToday,
        monthlyFee: calc.monthlyFee,
        setupFee: calc.setupFee,
        subtotal: calc.subtotal,

        // Explicit separate billing components
        setup_fee: calc.setup_fee,
        setup_discount: calc.setup_discount,
        setup_tax: calc.setup_tax,
        setup_fee_tax: calc.setup_tax,
        setup_total: calc.setup_total,
        subscription_fee: calc.subscription_fee,
        subscription_discount: calc.subscription_discount,
        subscription_tax: calc.subscription_tax,
        subscription_total: calc.subscription_total,
        recurring_base_amount: calc.recurring_base_amount,
        recurring_tax_amount: calc.recurring_tax_amount,
        recurring_total_amount: calc.recurring_total_amount,
        subscription_tax_rate: calc.subscription_tax_rate,
        setup_tax_rate: calc.setup_tax_rate,

        couponCode: calc.couponCode,
        couponDescription: calc.couponDescription,
        discountAmount: calc.discountAmount,
        base_amount: calc.subtotal,
        discount_amount: calc.discountAmount,
        tax_amount: calc.taxAmount,
        final_amount: calc.totalDueToday,
        taxRate: calc.taxRate,
        taxAmount: calc.taxAmount,
        taxLabel: calc.taxLabel,
        totalDueToday: calc.totalDueToday,
        total_due_today: calc.total_due_today,
        provider: providerName,
        payment_provider: providerName,
        provider_order_id: orderId,
        razorpayOrderId: orderId,
        status: 'PENDING',
        billingAddress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.pendingSignupsStore.set(orderId, pendingSignup);

      // 2. Record Payment in PENDING status
      const paymentRecord: PaymentRecord = {
        id: orderId,
        userId: customerEmail || normalizedTenantId,
        tenantId: normalizedTenantId,
        plan: planId,
        amount: calc.totalDueToday,
        base_amount: calc.subtotal,
        discount_amount: calc.discountAmount,
        tax_amount: calc.taxAmount,
        final_amount: calc.totalDueToday,
        currency,
        provider: providerName,
        payment_provider: providerName,
        provider_order_id: orderId,
        razorpayOrderId: orderId,
        status: 'PENDING',

        // Explicit separate billing components
        setup_fee: calc.setup_fee,
        setup_discount: calc.setup_discount,
        setup_tax: calc.setup_tax,
        subscription_fee: calc.subscription_fee,
        subscription_discount: calc.subscription_discount,
        subscription_tax: calc.subscription_tax,
        recurring_base_amount: calc.recurring_base_amount,
        recurring_tax_amount: calc.recurring_tax_amount,
        recurring_total_amount: calc.recurring_total_amount,
        tax_rate: calc.taxRate,
        subscription_tax_rate: calc.subscription_tax_rate,
        setup_tax_rate: calc.setup_tax_rate,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          businessName,
          customerName,
          customerEmail,
          customerPhone,
          breakdown: calc
        }
      };
      this.paymentRecordsStore.set(orderId, paymentRecord);

      this.recordAuditLog({
        action: 'order_created',
        tenantId: normalizedTenantId,
        businessName: businessName || businessId,
        customerEmail: customerEmail || billingAddress?.email || 'billing@customer.com',
        provider: providerName,
        providerOrderId: orderId,
        amount: calc.totalDueToday,
        currency,
        status: 'PENDING',
        details: { planId, type: 'initial_checkout', breakdown: calc }
      });

      const pubKey = provider.getPublicKey?.() || '';
      return {
        success: true,
        type: 'initial_checkout',
        payment,
        orderId,
        approvalUrl: payment.checkoutUrl,
        amount: calc.totalDueToday,
        breakdown: calc,
        currency,
        displayCurrency: displayCurrency || currency,
        displayAmount: displayAmount !== undefined ? displayAmount : calc.totalDueToday,
        paymentCurrency: currency,
        paymentAmount: calc.totalDueToday,
        provider: providerName,
        planId,
        planName: calc.planName,
        tenantId: normalizedTenantId,
        status: 'PENDING',
        keyId: pubKey
      };
    } else if (type === 'implementation_fee') {
      const payment = await provider.createPayment({
        businessId,
        amount: calc.totalDueToday,
        currency,
        description: `One-time Implementation Setup Fee for ${calc.planName} (${currency} ${calc.totalDueToday})`,
        type: 'implementation_fee',
        metadata: { planId, customerEmail, customerName, customerPhone, breakdown: calc }
      });

      const orderId = payment.orderId || payment.id;
      const paymentRecord: PaymentRecord = {
        id: orderId,
        userId: customerEmail || normalizedTenantId,
        tenantId: normalizedTenantId,
        plan: planId,
        amount: calc.totalDueToday,
        currency,
        razorpayOrderId: orderId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { planId, type: 'implementation_fee', breakdown: calc }
      };
      this.paymentRecordsStore.set(orderId, paymentRecord);

      const razorpayProvider = provider as RazorpayProvider;
      return {
        success: true,
        type: 'implementation_fee',
        payment,
        orderId,
        amount: calc.totalDueToday,
        breakdown: calc,
        currency,
        provider: providerName,
        status: 'PENDING',
        keyId: razorpayProvider.getPublicKey?.() || process.env.RAZORPAY_KEY_ID
      };
    } else {
      const planCfg = FIXED_PLAN_PRICES[planId as keyof typeof FIXED_PLAN_PRICES] || FIXED_PLAN_PRICES.starter;
      const pricingForCur = currency === 'INR' ? planCfg.INR : (currency === 'GBP' ? planCfg.GBP : planCfg.USD);
      const subAmount = pricingForCur.monthly;
      const sub = await provider.createSubscription({
        businessId,
        planId,
        planName: planCfg.name,
        monthlyAmount: subAmount,
        currency,
        metadata: { customerEmail, customerName, customerPhone }
      });
      return {
        success: true,
        type: 'subscription',
        subscription: sub,
        amount: subAmount,
        currency,
        provider: providerName
      };
    }
  }

  public async verifyAndActivatePayment(params: {
    businessId: string;
    businessName?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    provider: PaymentProviderName;
    paymentId?: string;
    orderId?: string;
    subscriptionId?: string;
    signature?: string;
    type: 'implementation_fee' | 'subscription' | 'initial_checkout';
    planId: string;
    currency: CurrencyCode;
    displayCurrency?: CurrencyCode;
    displayAmount?: number;
    amount: number;
    paymentMethodData?: {
      brand?: string;
      last4?: string;
      expiry?: string;
    };
  }) {
    const {
      businessId,
      businessName,
      customerName,
      customerEmail,
      customerPhone,
      provider: providerName,
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
    } = params;

    const norm = businessId.trim().toLowerCase();
    const pendingSignup = (orderId ? this.pendingSignupsStore.get(orderId) : undefined) ||
      Array.from(this.pendingSignupsStore.values()).find(s => s.tenantId === norm || s.razorpayOrderId === orderId);
    const paymentRecord = (orderId ? this.paymentRecordsStore.get(orderId) : undefined) ||
      Array.from(this.paymentRecordsStore.values()).find(p => p.razorpayOrderId === orderId || p.tenantId === norm);

    // For paid checkout, the amount is server-authoritative. Never trust the
    // amount echoed by the browser; it must match the amount used to create
    // the stored Razorpay order.
    if (type === 'initial_checkout') {
      if (!orderId || !pendingSignup) {
        throw new Error('Payment order could not be matched to a server-side checkout.');
      }
      const expectedAmount = pendingSignup.totalDueToday;
      if (typeof expectedAmount !== 'number' || expectedAmount <= 0) {
        throw new Error('Invalid server-side payment amount.');
      }
      if (typeof amount === 'number' && Number.isFinite(amount) && Math.abs(amount - expectedAmount) > 0.001) {
        throw new Error('Payment amount does not match the server-authorized order.');
      }
      params.amount = expectedAmount;
    }

    const authoritativePaymentAmount = (type === 'initial_checkout' && pendingSignup)
      ? pendingSignup.totalDueToday
      : amount;

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
      amount: authoritativePaymentAmount
    });

    if (!verification.verified) {
      if (paymentRecord) {
        paymentRecord.status = 'FAILED';
        paymentRecord.failureReason = verification.message || 'Signature mismatch';
        paymentRecord.updatedAt = new Date().toISOString();
      }
      if (pendingSignup) {
        pendingSignup.status = 'FAILED';
        pendingSignup.failureReason = verification.message || 'Signature mismatch';
        pendingSignup.updatedAt = new Date().toISOString();
      }
      this.recordAuditLog({
        action: 'payment_failed',
        tenantId: norm,
        businessName,
        customerEmail: customerEmail || 'billing@customer.com',
        provider: providerName,
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        amount,
        currency,
        status: 'FAILED',
        details: { reason: verification.message || 'Payment verification failed on server.' }
      });
      throw new Error(verification.message || 'Payment verification failed on server.');
    }

    this.recordAuditLog({
      action: 'payment_verified',
      tenantId: norm,
      businessName,
      customerEmail: customerEmail || 'billing@customer.com',
      provider: providerName,
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      amount: authoritativePaymentAmount,
      currency,
      status: 'PAID',
      method: paymentMethodData?.brand || verification.method || 'online'
    });

    const currentBilling = this.getTenantBilling(norm);

    const priceRecord = this.getPlanPrice(planId, currency);
    const planName = FIXED_PLAN_PRICES[planId]?.name || planId.charAt(0).toUpperCase() + planId.slice(1);
    const monthlyPrice = priceRecord?.monthly_fee ?? (FIXED_PLAN_PRICES[planId]?.[currency]?.monthly || 14999);
    const setupPrice = priceRecord?.setup_fee ?? (FIXED_PLAN_PRICES[planId]?.[currency]?.setup || 19999);

    const txId = verification.transactionId || paymentId || `PAY-RAZORPAY-${Date.now().toString().slice(-6)}`;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const nextBillingDateFormatted = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // 1. Mark Payment Record as CAPTURED
    if (paymentRecord) {
      paymentRecord.status = 'CAPTURED';
      paymentRecord.provider = providerName;
      paymentRecord.payment_provider = providerName;
      paymentRecord.provider_payment_id = verification.paymentId || paymentId;
      paymentRecord.razorpayPaymentId = paymentId;
      paymentRecord.razorpaySignature = signature;
      paymentRecord.paidAt = new Date().toISOString();
      paymentRecord.updatedAt = new Date().toISOString();
      paymentRecord.currency = currency;
      if (pendingSignup) {
        paymentRecord.base_amount = pendingSignup.base_amount;
        paymentRecord.discount_amount = pendingSignup.discount_amount;
        paymentRecord.tax_amount = pendingSignup.tax_amount;
        paymentRecord.final_amount = pendingSignup.final_amount;
        paymentRecord.setup_fee = pendingSignup.setup_fee;
        paymentRecord.setup_discount = pendingSignup.setup_discount;
        paymentRecord.setup_tax = pendingSignup.setup_tax;
        paymentRecord.subscription_fee = pendingSignup.subscription_fee;
        paymentRecord.subscription_discount = pendingSignup.subscription_discount;
        paymentRecord.subscription_tax = pendingSignup.subscription_tax;
        paymentRecord.recurring_base_amount = pendingSignup.recurring_base_amount;
        paymentRecord.recurring_tax_amount = pendingSignup.recurring_tax_amount;
        paymentRecord.recurring_total_amount = pendingSignup.recurring_total_amount;
        paymentRecord.tax_rate = pendingSignup.taxRate;
        paymentRecord.subscription_tax_rate = pendingSignup.subscription_tax_rate;
        paymentRecord.setup_tax_rate = pendingSignup.setup_tax_rate;
      }
    }

    // 2. Create / Update Subscription Record as ACTIVE
    // CRITICAL: Subscription amount is strictly the recurring subscription fee.
    // The setup fee is ONE-TIME and is NEVER recurring.
    const isTaxActive = Boolean(this.taxConfig.enabled && this.taxConfig.registration_status === 'REGISTERED');
    const activeSubBase = pendingSignup?.subscription_fee ?? monthlyPrice;
    const activeSubTax = isTaxActive ? (pendingSignup?.subscription_tax ?? (currency === 'INR' ? Math.round(activeSubBase * this.taxConfig.subscription_tax_rate * 100) / 100 : 0)) : 0;
    const activeSubTotal = pendingSignup?.recurring_total_amount ?? (pendingSignup?.subscription_total ?? Math.round((activeSubBase + activeSubTax) * 100) / 100);

    const subscriptionRecord: SubscriptionRecord = {
      id: subscriptionId || `sub_${norm}_${Date.now()}`,
      userId: customerEmail || (pendingSignup?.customerEmail) || norm,
      tenantId: norm,
      plan: planId,
      status: 'ACTIVE',
      billingInterval: 'monthly',
      amount: activeSubTotal,
      currency,
      monthly_price: activeSubBase,
      monthlyPrice: activeSubBase,
      base_amount: activeSubBase,
      baseAmount: activeSubBase,
      tax_amount: activeSubTax,
      taxAmount: activeSubTax,
      final_amount: activeSubTotal,
      taxRate: isTaxActive ? (pendingSignup?.subscription_tax_rate ?? this.taxConfig.subscription_tax_rate) : 0,
      setupPayment: 'ONE_TIME',
      subscriptionType: 'RECURRING',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: nextDate.toISOString(),
      provider: providerName,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.subscriptionRecordsStore.set(norm, subscriptionRecord);

    // 3. Transactionally Provision Customer Tenant (Business, AI Agent, Isolated Knowledge Base)
    let provisionedBusiness: any = null;
    let provisionedAgent: any = null;

    if (type === 'initial_checkout' || !serverBusinessesStore.has(norm)) {
      try {
        const provResult = await provisionCustomerTenant({
          tenantId: norm,
          businessName: businessName || (pendingSignup ? pendingSignup.businessName : norm),
          customerEmail: customerEmail || (pendingSignup ? pendingSignup.customerEmail : 'billing@customer.com'),
          customerPhone: customerPhone || (pendingSignup ? pendingSignup.customerPhone : undefined),
          planId,
          currency,
          paymentId,
          orderId
        });
        provisionedBusiness = provResult.business;
        provisionedAgent = provResult.agent;

        if (pendingSignup) {
          pendingSignup.status = 'ACTIVATED';
          pendingSignup.updatedAt = new Date().toISOString();
        }
        this.recordAuditLog({
          action: 'tenant_activated',
          tenantId: norm,
          businessName: businessName || norm,
          customerEmail: customerEmail || 'billing@customer.com',
          provider: providerName,
          providerOrderId: orderId,
          providerPaymentId: paymentId,
          status: 'ACTIVE',
          details: { planId, businessName }
        });
      } catch (provErr: any) {
        console.error('[Tenant Provisioning Error after Payment Verification]', provErr);
        if (pendingSignup) {
          pendingSignup.provisioningFailed = true;
          pendingSignup.provisioningError = provErr.message;
          pendingSignup.updatedAt = new Date().toISOString();
        }
        throw new Error(`Payment was captured successfully, but tenant provisioning failed: ${provErr.message}. Support has been alerted.`);
      }
    }

    // Update Billing Record
    currentBilling.businessName = businessName || currentBilling.businessName || businessId;
    currentBilling.customerName = customerName || currentBilling.customerName;
    currentBilling.customerEmail = customerEmail || currentBilling.customerEmail;
    currentBilling.customerPhone = customerPhone || currentBilling.customerPhone;
    currentBilling.planId = planId;
    currentBilling.planName = planName;
    currentBilling.provider = providerName;
    currentBilling.status = 'active';
    currentBilling.paymentStatus = 'paid';
    currentBilling.lastPaymentId = txId;
    currentBilling.paymentFailed = false;
    currentBilling.currency = currency;
    currentBilling.monthlyFee = activeSubTotal;
    currentBilling.implementationFee = pendingSignup?.setup_total ?? setupPrice;
    currentBilling.setup_fee = pendingSignup?.setup_fee ?? setupPrice;
    currentBilling.setup_tax = pendingSignup?.setup_tax ?? 0;
    currentBilling.setup_fee_tax = pendingSignup?.setup_tax ?? 0;
    currentBilling.subscription_fee = activeSubBase;
    currentBilling.subscription_tax = activeSubTax;
    currentBilling.recurring_base_amount = pendingSignup?.recurring_base_amount ?? activeSubBase;
    currentBilling.recurring_tax_amount = pendingSignup?.recurring_tax_amount ?? activeSubTax;
    currentBilling.recurring_total_amount = activeSubTotal;
    currentBilling.subscription_tax_rate = isTaxActive ? (pendingSignup?.subscription_tax_rate ?? this.taxConfig.subscription_tax_rate) : 0.00;
    currentBilling.setup_tax_rate = isTaxActive ? (pendingSignup?.setup_tax_rate ?? this.taxConfig.setup_tax_rate) : 0.00;
    currentBilling.nextBillingDate = nextBillingDateFormatted;
    currentBilling.updatedAt = new Date().toISOString();

    if (type === 'initial_checkout') {
      currentBilling.implementationFeePaid = true;
      if (subscriptionId) {
        currentBilling.providerSubscriptionId = subscriptionId;
      }
    } else if (type === 'implementation_fee') {
      currentBilling.implementationFeePaid = true;
    } else {
      if (subscriptionId) {
        currentBilling.providerSubscriptionId = subscriptionId;
      }
    }

    this.tenantBillingStore.set(norm, currentBilling);
    await this.persistBillingSnapshot(currentBilling);

    // Record Transaction
    const txList = this.getTransactions(norm);
    txList.unshift({
      id: `tx_${Date.now()}`,
      businessId: norm,
      date: new Date().toISOString().split('T')[0],
      amount: authoritativePaymentAmount,
      currency,
      provider: providerName,
      status: 'paid',
      transactionId: txId,
      type,
      setup_fee: pendingSignup?.setup_fee,
      setup_tax: pendingSignup?.setup_tax ?? 0,
      subscription_fee: pendingSignup?.subscription_fee,
      subscription_tax: pendingSignup?.subscription_tax ?? 0,
      description: type === 'initial_checkout'
        ? (isTaxActive 
            ? `Setup Fee + 1st Month Subscription (${planName})` 
            : `Setup Fee + 1st Month Subscription (${planName})`)
        : type === 'implementation_fee'
        ? `One-time Implementation Fee (${planName})`
        : `Monthly Subscription Platform Access (${planName})`
    });
    this.tenantTransactionsStore.set(norm, txList);

    // Record Invoices / Commercial Receipts
    const invList = this.getInvoices(norm);
    const invNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    if (type === 'initial_checkout') {
      const setupFeeAmt = pendingSignup?.setup_fee ?? setupPrice;
      const setupTaxAmt = isTaxActive ? (pendingSignup?.setup_tax ?? 0) : 0;
      const setupTotalAmt = pendingSignup?.setup_total ?? (setupFeeAmt + setupTaxAmt);

      const subFeeAmt = pendingSignup?.subscription_fee ?? monthlyPrice;
      const subTaxAmt = isTaxActive ? (pendingSignup?.subscription_tax ?? 0) : 0;
      const subTotalAmt = pendingSignup?.subscription_total ?? (subFeeAmt + subTaxAmt);

      // 1. Create Invoice / Receipt for One-Time Setup Fee
      invList.unshift({
        id: `inv_setup_${Date.now()}`,
        businessId: norm,
        invoiceNumber: `INV-SETUP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        description: isTaxActive
          ? `${planName} Plan - One-Time White-Glove Setup & Implementation Fee`
          : `${planName} Plan - One-Time White-Glove Setup & Implementation Fee`,
        amount: setupTotalAmt,
        currency,
        status: 'PAID',
        provider: providerName,
        invoiceType: 'ONE_TIME_SETUP',
        setup_fee: setupFeeAmt,
        setup_discount: pendingSignup?.setup_discount ?? 0,
        setup_tax: setupTaxAmt,
        total_amount: setupTotalAmt,
        tax_rate: isTaxActive ? (this.taxConfig.setup_tax_rate) : 0,
        taxLabel: isTaxActive ? `${Math.round(this.taxConfig.setup_tax_rate * 100)}% GST` : 'No Tax Applicable',
        lineItems: [
          {
            description: 'White-Glove Architecture, Agent Workflow & Setup Fee',
            type: 'ONE_TIME',
            baseAmount: setupFeeAmt,
            taxRate: isTaxActive ? (this.taxConfig.setup_tax_rate) : 0,
            taxAmount: setupTaxAmt,
            total: setupTotalAmt
          }
        ],
        pdfUrl: '#'
      });

      // 2. Create Invoice / Receipt for Monthly Recurring Subscription
      invList.unshift({
        id: `inv_sub_${Date.now()}`,
        businessId: norm,
        invoiceNumber: invNum,
        date: new Date().toISOString().split('T')[0],
        description: isTaxActive
          ? `${planName} Plan - Monthly AI RevenueOS Platform Subscription (${Math.round(this.taxConfig.subscription_tax_rate * 100)}% GST)`
          : `${planName} Plan - Monthly AI RevenueOS Platform Subscription`,
        amount: subTotalAmt,
        currency,
        status: 'PAID',
        provider: providerName,
        invoiceType: 'RECURRING_SUBSCRIPTION',
        subscription_fee: subFeeAmt,
        subscription_discount: pendingSignup?.subscription_discount ?? 0,
        subscription_tax: subTaxAmt,
        total_amount: subTotalAmt,
        tax_rate: isTaxActive ? (this.taxConfig.subscription_tax_rate) : 0,
        taxLabel: isTaxActive ? this.taxConfig.tax_label : 'No Tax Applicable',
        lineItems: [
          {
            description: 'Monthly AI RevenueOS Platform Subscription (First Month)',
            type: 'RECURRING',
            baseAmount: subFeeAmt,
            taxRate: isTaxActive ? (this.taxConfig.subscription_tax_rate) : 0,
            taxAmount: subTaxAmt,
            total: subTotalAmt
          }
        ],
        pdfUrl: '#'
      });
    } else {
      invList.unshift({
        id: `inv_${Date.now()}`,
        businessId: norm,
        invoiceNumber: invNum,
        date: new Date().toISOString().split('T')[0],
        description: type === 'implementation_fee'
          ? `${planName} - Implementation Fee`
          : `${planName} - Monthly Platform Subscription`,
        amount,
        currency,
        status: 'PAID',
        provider: providerName,
        invoiceType: type === 'implementation_fee' ? 'ONE_TIME_SETUP' : 'RECURRING_SUBSCRIPTION',
        total_amount: amount,
        tax_rate: 0,
        taxLabel: 'No Tax Applicable',
        pdfUrl: '#'
      });
    }
    this.tenantInvoicesStore.set(norm, invList);
    const latestInvoice = invList[0];
    if (latestInvoice) await this.persistInvoice(latestInvoice);

    // Register safe payment method if passed
    if (paymentMethodData) {
      const pmList = this.getPaymentMethods(norm);
      pmList.forEach(pm => { pm.isPrimary = false; });
      pmList.unshift({
        id: `pm_${Date.now()}`,
        businessId: norm,
        provider: providerName,
        providerPaymentMethodId: `tok_${providerName}_${Date.now()}`,
        brand: paymentMethodData.brand || 'Card',
        last4: paymentMethodData.last4 || '****',
        expiry: paymentMethodData.expiry || '',
        isPrimary: true,
        createdAt: new Date().toISOString()
      });
      this.tenantPaymentMethodsStore.set(norm, pmList);
    }

    // Link and activate customer user account in user registry
    let sessionToken: string | undefined;
    const targetUserEmail = customerEmail || (pendingSignup?.customerEmail);
    if (targetUserEmail) {
      try {
        const user = getUserByEmail(targetUserEmail);
        if (user) {
          updateUser(user.id, {
            tenantId: norm,
            status: 'ACTIVE'
          });
          const session = await createSession(user.id, user.email, 'BUSINESS_ADMIN', norm);
          sessionToken = session.token;
        }
      } catch (userErr) {
        console.warn('[BillingService] Could not auto-activate user account:', userErr);
      }
    }

    // Increment promo code usage count if coupon was applied
    const appliedCouponCode = pendingSignup?.couponCode;
    if (appliedCouponCode) {
      const promo = this.promoCodesStore.get(appliedCouponCode.toUpperCase());
      if (promo) {
        promo.usageCount = (promo.usageCount || 0) + 1;
        promo.updatedAt = new Date().toISOString();
      }
    }

    return {
      success: true,
      status: 'ACTIVATED',
      tenantId: norm,
      sessionToken,
      transactionId: txId,
      invoiceNumber: invNum,
      nextBillingDate: nextBillingDateFormatted,
      monthlyFee: monthlyPrice,
      setupFee: setupPrice,
      amount: authoritativePaymentAmount,
      currency,
      displayCurrency: displayCurrency || pendingSignup?.display_currency || currency,
      displayAmount: displayAmount !== undefined ? displayAmount : (pendingSignup?.display_amount !== undefined ? pendingSignup.display_amount : amount),
      paymentCurrency: currency,
      paymentAmount: amount,
      billing: currentBilling,
      business: provisionedBusiness,
      agent: provisionedAgent
    };
  }

  public async getOrderStatus(orderId: string) {
    const signup = this.pendingSignupsStore.get(orderId);
    const payment = this.paymentRecordsStore.get(orderId);

    if (!signup && !payment) {
      return { found: false, status: 'NOT_FOUND', orderId };
    }

    const currentStatus = signup?.status || payment?.status || 'PENDING';
    if (currentStatus === 'ACTIVATED' || currentStatus === 'PAYMENT_VERIFIED' || payment?.status === 'CAPTURED') {
      return {
        found: true,
        status: 'PAYMENT_VERIFIED',
        orderId,
        tenantId: signup?.tenantId || payment?.tenantId,
        planId: signup?.planId || payment?.plan,
        amount: signup?.totalDueToday || payment?.amount,
        currency: signup?.currency || payment?.currency,
        paidAt: payment?.paidAt || signup?.updatedAt,
        redirectUrl: '/business/dashboard'
      };
    }

    if (currentStatus === 'FAILED') {
      return {
        found: true,
        status: 'PAYMENT_FAILED',
        orderId,
        failureReason: signup?.failureReason || payment?.failureReason || 'Payment authorization was unsuccessful.'
      };
    }

    if (currentStatus === 'CANCELLED') {
      return {
        found: true,
        status: 'PAYMENT_CANCELLED',
        orderId,
        message: 'Payment was cancelled or dismissed by the user.'
      };
    }

    // Check with Razorpay API if payment was captured asynchronously
    const razorpayProvider = this.getProvider('razorpay') as RazorpayProvider;
    if (razorpayProvider && razorpayProvider.isConfigured() && payment?.razorpayPaymentId) {
      try {
        const details = await razorpayProvider.fetchPaymentDetails(payment.razorpayPaymentId);
        if (details && (details.status === 'captured' || details.status === 'authorized')) {
          await this.reconcilePayment(orderId);
          return {
            found: true,
            status: 'PAYMENT_VERIFIED',
            orderId,
            tenantId: signup?.tenantId,
            redirectUrl: '/business/dashboard'
          };
        }
      } catch (e) {
        // Continue with pending status
      }
    }

    return {
      found: true,
      status: 'PAYMENT_PENDING',
      orderId,
      tenantId: signup?.tenantId || payment?.tenantId
    };
  }

  public getAllTenantBillings(): Array<TenantBillingRecord & {
    transactionsCount: number;
    invoicesCount: number;
  }> {
    const list: Array<TenantBillingRecord & {
      transactionsCount: number;
      invoicesCount: number;
    }> = [];

    for (const [id, record] of this.tenantBillingStore.entries()) {
      const txs = this.tenantTransactionsStore.get(id) || [];
      const invs = this.tenantInvoicesStore.get(id) || [];
      list.push({
        ...record,
        transactionsCount: txs.length,
        invoicesCount: invs.length
      });
    }

    return list;
  }

  public async updatePlan(businessId: string, newPlanId: string, customPrice?: number) {
    const norm = businessId.trim().toLowerCase();
    const billing = this.getTenantBilling(norm);

    

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
    await this.persistBillingSnapshot(billing);
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
    await this.persistBillingSnapshot(billing);
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
    await this.persistBillingSnapshot(billing);
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

  public getPendingSignups(): PendingSignup[] {
    return Array.from(this.pendingSignupsStore.values());
  }

  public getPendingSignup(orderId: string): PendingSignup | undefined {
    return this.pendingSignupsStore.get(orderId);
  }

  public getPaymentRecords(): PaymentRecord[] {
    return Array.from(this.paymentRecordsStore.values());
  }

  public getSubscriptionRecords(): SubscriptionRecord[] {
    return Array.from(this.subscriptionRecordsStore.values());
  }

  public async reconcilePayment(orderId: string) {
    const signup = this.pendingSignupsStore.get(orderId);
    const payment = this.paymentRecordsStore.get(orderId);
    if (!signup && !payment) {
      throw new Error(`No payment or signup found for order ${orderId}`);
    }
    const tenantId = (signup?.tenantId || payment?.tenantId || '').toLowerCase();
    const planId = signup?.planId || payment?.plan || 'starter';
    const email = signup?.customerEmail || (payment?.userId as string) || 'billing@customer.com';
    const bizName = signup?.businessName || tenantId;

    const provResult = await provisionCustomerTenant({
      tenantId,
      businessName: bizName,
      customerEmail: email,
      planId,
      currency: (signup?.currency || payment?.currency || 'USD') as any,
      paymentId: payment?.razorpayPaymentId || signup?.razorpayPaymentId,
      orderId
    });

    if (signup) {
      signup.status = 'ACTIVATED';
      signup.provisioningFailed = false;
      signup.updatedAt = new Date().toISOString();
    }
    return { success: true, business: provResult.business, agent: provResult.agent };
  }

  public async handleWebhook(
    providerName: PaymentProviderName,
    body: any,
    headers: Record<string, string | string[] | undefined>,
    rawBody?: string | Buffer
  ) {
    const provider = this.getProvider(providerName);
    const result = await (provider as any).handleWebhook(body, headers, rawBody);

    if (!result.handled) {
      return { success: false, handled: false, error: result.message || 'Webhook rejected by provider' };
    }

    // Idempotency: make PostgreSQL uniqueness authoritative when available.
    // The in-memory set is only a fallback for development / DB outages.
    const eventId = body?.id || body?.event_id || `${providerName}_${result.event}_${result.paymentId || result.subscriptionId || Date.now()}`;
    if (this.processedWebhookEvents.has(eventId)) {
      return { success: true, handled: true, duplicate: true, message: 'Event already processed' };
    }

    const dbConnected = await postgresClient.initialize();
    if (dbConnected) {
      const insertResult = await postgresClient.query(`
        INSERT INTO agentdesk_webhook_events (event_id, provider, event_type, status, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (event_id) DO NOTHING
      `, [
        eventId,
        providerName,
        result.event || 'unknown',
        'RECEIVED',
        JSON.stringify(body || {})
      ]);

      if ((insertResult?.rowCount ?? 0) === 0) {
        const existingEvent = await postgresClient.query(
          'SELECT status FROM agentdesk_webhook_events WHERE event_id = $1 LIMIT 1',
          [eventId]
        );
        if (existingEvent?.rows?.[0]?.status === 'PROCESSED') {
          this.processedWebhookEvents.add(eventId);
          return { success: true, handled: true, duplicate: true, message: 'Event already processed' };
        }
        // A previous attempt may have crashed after recording the event. Leave
        // RECEIVED/FAILED events retryable instead of dropping the provider retry.
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Payment webhooks must fail closed when durable idempotency storage is unavailable.
      // The provider can retry safely once PostgreSQL is healthy again.
      return {
        success: false,
        handled: false,
        error: 'Webhook persistence is temporarily unavailable. Please retry.'
      };
    }

    // Extract IDs across providers
    let orderId = body?.payload?.payment?.entity?.order_id || body?.payload?.order?.entity?.id;
    let paymentId = body?.payload?.payment?.entity?.id || result.paymentId;
    const signature = headers['x-razorpay-signature'] as string;

    // Handle payment.captured / order.paid for Razorpay pending signups
    if (result.event === 'payment.captured' || result.event === 'order.paid') {
      if (orderId && this.pendingSignupsStore.has(orderId)) {
        const signup = this.pendingSignupsStore.get(orderId)!;
        if (signup.status === 'PENDING') {
          try {
            await this.verifyAndActivatePayment({
              businessId: signup.tenantId,
              businessName: signup.businessName,
              customerName: signup.customerName,
              customerEmail: signup.customerEmail,
              customerPhone: signup.customerPhone,
              provider: providerName,
              paymentId,
              orderId,
              signature,
              type: 'initial_checkout',
              planId: signup.planId,
              currency: signup.currency,
              amount: signup.totalDueToday
            });
            console.log(`[Razorpay Webhook] Automated tenant activation successful for order "${orderId}"`);
          } catch (err: any) {
            console.error(`[Razorpay Webhook] Auto-activation error for order "${orderId}":`, err.message);
          }
        }
      }
    }

    // Handle payment.failed
    if (result.event === 'payment.failed') {
      const failedOrderId = body?.payload?.payment?.entity?.order_id || orderId;
      if (failedOrderId) {
        const signup = this.pendingSignupsStore.get(failedOrderId);
        if (signup && signup.status === 'PENDING') {
          signup.status = 'FAILED';
          signup.failureReason = body?.payload?.payment?.entity?.error_description || 'Payment failed';
          signup.updatedAt = new Date().toISOString();
        }
        const paymentRec = this.paymentRecordsStore.get(failedOrderId);
        if (paymentRec) {
          paymentRec.status = 'FAILED';
          paymentRec.failureReason = body?.payload?.payment?.entity?.error_description || 'Payment failed';
          paymentRec.updatedAt = new Date().toISOString();
        }
      }
    }

    // A successful recurring charge is a new billable period. Record it as a
    // transaction and create a fresh invoice exactly once per webhook event.
    if (result.event === 'subscription.charged' && result.businessId) {
      const norm = result.businessId.toLowerCase();
      const billing = this.getTenantBilling(norm);
      const subscription = result.data || {};
      const paymentAmount = Number(
        subscription?.amount_paid ??
        subscription?.amount ??
        billing.recurring_total_amount ??
        billing.monthlyFee ??
        0
      ) / 100;
      const paymentCurrency = (subscription?.currency || billing.currency || 'INR') as CurrencyCode;
      const paymentId = result.paymentId || subscription?.payment_id || `subpay_${eventId}`;
      const existingInvoices = this.tenantInvoicesStore.get(norm) || [];
      const duplicateInvoice = existingInvoices.some((invoice: any) =>
        invoice.providerPaymentId === paymentId ||
        invoice.paymentId === paymentId ||
        invoice.webhookEventId === eventId
      );

      if (!duplicateInvoice) {
        const paidAt = new Date().toISOString();
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
        existingInvoices.unshift({
          id: `inv_recurring_${eventId}`,
          businessId: norm,
          invoiceNumber,
          date: paidAt.split('T')[0],
          createdAt: paidAt,
          description: `${billing.planName || 'AgentDesk'} Plan - Monthly Platform Subscription`,
          amount: paymentAmount,
          currency: paymentCurrency,
          status: 'PAID',
          provider: providerName,
          invoiceType: 'RECURRING_SUBSCRIPTION',
          subscription_fee: billing.subscription_fee ?? billing.monthlyFee ?? paymentAmount,
          subscription_tax: billing.subscription_tax ?? 0,
          total_amount: paymentAmount,
          tax_rate: billing.subscription_tax_rate ?? 0,
          taxLabel: (billing.subscription_tax_rate ?? 0) > 0
            ? `${Math.round((billing.subscription_tax_rate ?? 0) * 100)}% GST`
            : 'No Tax Applicable',
          lineItems: [{
            description: `Monthly AI RevenueOS Platform Subscription (${billing.planName || 'AgentDesk'})`,
            type: 'RECURRING',
            baseAmount: billing.subscription_fee ?? billing.monthlyFee ?? paymentAmount,
            taxRate: billing.subscription_tax_rate ?? 0,
            taxAmount: billing.subscription_tax ?? 0,
            total: paymentAmount
          }],
          pdfUrl: '#'
        });
        this.tenantInvoicesStore.set(norm, existingInvoices);
        const recurringInvoice = existingInvoices[0];
        if (recurringInvoice) await this.persistInvoice(recurringInvoice);

        const txList = this.tenantTransactionsStore.get(norm) || [];
        txList.unshift({
          id: `tx_${eventId}`,
          businessId: norm,
          date: paidAt.split('T')[0],
          createdAt: paidAt,
          amount: paymentAmount,
          currency: paymentCurrency,
          provider: providerName,
          status: 'paid',
          transactionId: paymentId,
          type: 'subscription',
          subscription_fee: billing.subscription_fee ?? billing.monthlyFee ?? paymentAmount,
          subscription_tax: billing.subscription_tax ?? 0,
          description: `Monthly Subscription Platform Access (${billing.planName || 'AgentDesk'})`
        });
        this.tenantTransactionsStore.set(norm, txList);
      }

      billing.status = 'active';
      billing.paymentStatus = 'paid';
      billing.paymentFailed = false;
      billing.lastPaymentId = paymentId;
      const next = new Date();
      next.setDate(next.getDate() + 30);
      billing.nextBillingDate = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      billing.updatedAt = new Date().toISOString();
      this.tenantBillingStore.set(norm, billing);
      await this.persistBillingSnapshot(billing);
    }

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

    if (dbConnected) {
      await postgresClient.query(
        'UPDATE agentdesk_webhook_events SET status = $2 WHERE event_id = $1',
        [eventId, 'PROCESSED']
      );
    }
    this.processedWebhookEvents.add(eventId);
    return { success: true, result };
  }
}

// Singleton Service
export const billingService = new BillingService();
