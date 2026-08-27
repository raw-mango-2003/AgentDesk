import { CurrencyCode } from '../../types.js';

export type PaymentProviderName = 'razorpay' | 'paypal';

export type SubscriptionBillingStatus = 
  | 'pending' 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'paused' 
  | 'cancelled' 
  | 'expired';

export type PaymentTransactionStatus = 
  | 'pending' 
  | 'authorized' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface SafePaymentMethod {
  id: string;
  businessId: string;
  provider: PaymentProviderName;
  providerPaymentMethodId: string;
  brand: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  expiry?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProviderCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  provider: PaymentProviderName;
  createdAt: string;
}

export interface CreateCustomerParams {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  currency: CurrencyCode;
}

export interface CreatePaymentParams {
  businessId: string;
  customerId?: string;
  amount: number; // in base currency standard units (e.g., 2997 for USD $2,997)
  currency: CurrencyCode;
  description: string;
  type: 'implementation_fee' | 'subscription' | 'usage_overage';
  metadata?: Record<string, any>;
}

export interface ProviderPayment {
  id: string; // Order / Payment ID
  provider: PaymentProviderName;
  amount: number;
  currency: CurrencyCode;
  status: PaymentTransactionStatus;
  clientSecret?: string; // For checkout initialization
  orderId?: string;
  checkoutUrl?: string;
  raw?: any;
}

export interface CreateSubscriptionParams {
  businessId: string;
  customerId?: string;
  planId: string;
  planName: string;
  monthlyAmount: number;
  currency: CurrencyCode;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface ProviderSubscription {
  id: string;
  provider: PaymentProviderName;
  providerSubscriptionId: string;
  customerId?: string;
  planId: string;
  currency: CurrencyCode;
  amount: number;
  status: SubscriptionBillingStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate: string;
  approvalUrl?: string;
  raw?: any;
}

export interface CreateInvoiceParams {
  businessId: string;
  customerId?: string;
  amount: number;
  currency: CurrencyCode;
  description: string;
  items?: Array<{ name: string; amount: number; quantity: number }>;
}

export interface ProviderInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: CurrencyCode;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'FAILED';
  provider: PaymentProviderName;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  createdAt: string;
}

export interface WebhookResult {
  handled: boolean;
  event: string;
  businessId?: string;
  subscriptionId?: string;
  paymentId?: string;
  status?: string;
  message?: string;
  data?: any;
}

export interface VerifyPaymentParams {
  businessId: string;
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  signature?: string;
  provider: PaymentProviderName;
  currency: CurrencyCode;
  amount?: number;
}

export interface VerifyPaymentResult {
  verified: boolean;
  paymentId: string;
  transactionId: string;
  status: PaymentTransactionStatus;
  message?: string;
}

export interface PaymentProvider {
  name: PaymentProviderName;
  isConfigured(): boolean;
  supportsCurrency(currency: CurrencyCode): boolean;
  supportsRecurring(currency: CurrencyCode): boolean;
  
  createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer>;
  createPayment(params: CreatePaymentParams): Promise<ProviderPayment>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  
  createSubscription(params: CreateSubscriptionParams): Promise<ProviderSubscription>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  updateSubscription(subscriptionId: string, planId: string, customPrice?: number): Promise<ProviderSubscription>;
  pauseSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  resumeSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  cancelSubscription(subscriptionId: string, cancelImmediately?: boolean): Promise<ProviderSubscription>;
  
  listPaymentMethods(customerId: string, businessId: string): Promise<SafePaymentMethod[]>;
  setPrimaryPaymentMethod(businessId: string, paymentMethodId: string): Promise<boolean>;
  removePaymentMethod(businessId: string, paymentMethodId: string): Promise<boolean>;
  
  createInvoice(params: CreateInvoiceParams): Promise<ProviderInvoice>;
  getInvoice(invoiceId: string): Promise<ProviderInvoice>;
  
  handleWebhook(body: any, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult>;
}
