import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  AlertCircle, 
  Check, 
  Loader2, 
  X, 
  Bot, 
  Sparkles, 
  ArrowLeft,
  RotateCcw,
  Globe,
  CreditCard,
  Smartphone,
  QrCode,
  Wallet
} from 'lucide-react';
import { formatCurrencyAmount } from '../lib/currency';
import { getPlanConfig } from '../data/pricing';
import { saveBusiness, saveAgent } from '../lib/dbService';
import { ErrorBoundary } from './common/ErrorBoundary';
import { CurrencyCode, AvailablePaymentMethodsResponse } from '../types';

export interface AgentDeskCheckoutProps {
  initialPlanId?: string;
  initialCurrency?: CurrencyCode;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: (provisioned: {
    tenantId: string;
    businessName: string;
    customerEmail: string;
    planName: string;
    paymentId: string;
    amount: number;
    currency?: CurrencyCode;
  }) => void;
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
}

interface OrderCalculationState {
  planId: string;
  planName: string;
  currency: CurrencyCode;
  setup_fee: number;
  setup_tax: number;
  subscription_fee: number;
  subscription_tax: number;
  discount: number;
  total_due_today: number;
  recurring_total: number;
  tax_enabled?: boolean;
}

const AVAILABLE_PLANS = [
  { id: 'starter', name: 'Starter Plan', isPopular: false },
  { id: 'growth', name: 'Growth Plan', isPopular: true },
  { id: 'scale', name: 'Scale Plan', isPopular: false }
];

const DEFAULT_PLAN_PRICES: Record<CurrencyCode, Record<string, { setup: number; monthly: number }>> = {
  INR: {
    starter: { setup: 19999, monthly: 14999 },
    growth: { setup: 34999, monthly: 29999 },
    scale: { setup: 59999, monthly: 59999 }
  },
  USD: {
    starter: { setup: 299, monthly: 199 },
    growth: { setup: 499, monthly: 399 },
    scale: { setup: 999, monthly: 799 }
  },
  GBP: {
    starter: { setup: 249, monthly: 169 },
    growth: { setup: 419, monthly: 339 },
    scale: { setup: 829, monthly: 669 }
  }
};

const getSavedSession = (key: string, def = '') => {
  try {
    return typeof window !== 'undefined' ? sessionStorage.getItem(key) || def : def;
  } catch {
    return def;
  }
};

const setSavedSession = (key: string, val: string) => {
  try {
    if (typeof window !== 'undefined') sessionStorage.setItem(key, val);
  } catch {}
};

export const AgentDeskCheckoutInner: React.FC<AgentDeskCheckoutProps> = ({
  initialPlanId = 'starter',
  initialCurrency = 'INR',
  isModal = false,
  onClose,
  onSuccess,
  onNavigateHome,
  onNavigateLogin
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    const valid = ['starter', 'growth', 'scale'];
    return valid.includes(initialPlanId?.toLowerCase()) ? initialPlanId.toLowerCase() : 'starter';
  });

  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency || 'INR');

  // Customer & Organization Information with sessionStorage persistence
  const [fullName, setFullName] = useState(() => getSavedSession('ad_checkout_name', ''));
  const [businessName, setBusinessName] = useState(() => getSavedSession('ad_checkout_biz', ''));
  const [email, setEmail] = useState(() => getSavedSession('ad_checkout_email', ''));
  const [phone, setPhone] = useState(() => getSavedSession('ad_checkout_phone', ''));

  // Billing Information with sessionStorage persistence
  const [address, setAddress] = useState(() => getSavedSession('ad_checkout_addr', ''));
  const [city, setCity] = useState(() => getSavedSession('ad_checkout_city', ''));
  const [state, setState] = useState(() => getSavedSession('ad_checkout_state', ''));
  const [country] = useState('India');
  const [gstin, setGstin] = useState(() => getSavedSession('ad_checkout_gstin', ''));

  // Sync back to sessionStorage on input
  useEffect(() => {
    setSavedSession('ad_checkout_name', fullName);
    setSavedSession('ad_checkout_biz', businessName);
    setSavedSession('ad_checkout_email', email);
    setSavedSession('ad_checkout_phone', phone);
    setSavedSession('ad_checkout_addr', address);
    setSavedSession('ad_checkout_city', city);
    setSavedSession('ad_checkout_state', state);
    setSavedSession('ad_checkout_gstin', gstin);
  }, [fullName, businessName, email, phone, address, city, state, gstin]);

  // Promotional Code
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);

  // Authoritative Pricing & Calculation State (source of truth from backend)
  const [calculation, setCalculation] = useState<OrderCalculationState>(() => {
    const prices = DEFAULT_PLAN_PRICES[initialCurrency || 'INR'] || DEFAULT_PLAN_PRICES.INR;
    const p = prices[selectedPlanId] || prices.starter;
    const planObj = AVAILABLE_PLANS.find(x => x.id === selectedPlanId) || AVAILABLE_PLANS[0];
    return {
      planId: planObj.id,
      planName: planObj.name,
      currency: initialCurrency || 'INR',
      setup_fee: p.setup,
      setup_tax: 0,
      subscription_fee: p.monthly,
      subscription_tax: 0,
      discount: 0,
      total_due_today: p.setup + p.monthly,
      recurring_total: p.monthly,
      tax_enabled: false
    };
  });

  // Flow & Submission State
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [payInINROptIn, setPayInINROptIn] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('upi');
  const [paymentCapability, setPaymentCapability] = useState<AvailablePaymentMethodsResponse | null>(null);
  const [inrCalculation, setInrCalculation] = useState<OrderCalculationState | null>(null);
  const [successData, setSuccessData] = useState<{
    tenantId: string;
    businessName: string;
    customerEmail: string;
    planName: string;
    paymentId: string;
    amount: number;
    currency: CurrencyCode;
    displayCurrency?: CurrencyCode;
    displayAmount?: number;
    setupFee: number;
    subscriptionFee: number;
    gstAmount: number;
    nextBillingDate: string;
  } | null>(null);

  // Query server for authoritative calculation
  const fetchAuthoritativeCalculation = useCallback(async (
    planIdToCalc: string,
    couponToApply?: string | null,
    curToCalc?: CurrencyCode,
    billingState?: string,
    billingGstin?: string,
    customerEmail?: string
  ) => {
    const activeCurrency = curToCalc || 'INR';
    try {
      setCalculating(true);
      const res = await fetch('/api/billing/calculate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planIdToCalc,
          currency: activeCurrency,
          type: 'initial_checkout',
          couponCode: couponToApply || undefined,
          country: 'India',
          state: billingState?.trim() || undefined,
          gstin: billingGstin?.trim() || undefined,
          customerEmail: customerEmail?.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCalculation({
            planId: data.planId,
            planName: data.planName,
            currency: (data.currency as CurrencyCode) || activeCurrency,
            setup_fee: Number(data.setup_fee),
            setup_tax: Number(data.setup_tax || 0),
            subscription_fee: Number(data.subscription_fee),
            subscription_tax: Number(data.subscription_tax || 0),
            discount: Number(data.discount || 0),
            total_due_today: Number(data.total_due_today),
            recurring_total: Number(data.recurring_total_amount || data.subscription_fee),
            tax_enabled: Boolean(data.tax_enabled || data.taxEnabled)
          });
          return data;
        }
      }
    } catch (err) {
      console.warn('Live calculation sync notice:', err);
    } finally {
      setCalculating(false);
    }
  }, []);

  // Fetch payment capability from backend
  const fetchPaymentCapabilities = useCallback(async (cur: CurrencyCode, planId: string) => {
    try {
      const res = await fetch(`/api/billing/available-payment-methods?currency=${cur}&planId=${planId}`);
      if (res.ok) {
        const data: AvailablePaymentMethodsResponse = await res.json();
        setPaymentCapability(data);
        const validMethods = data.methods?.map(m => m.id) || (data.inrFallback?.methods?.map(m => m.id) || ['cards']);
        setSelectedMethod(prev => validMethods.includes(prev) ? prev : (validMethods[0] || 'cards'));
      }
    } catch (err) {
      console.warn('Failed to fetch payment capabilities:', err);
    }
  }, []);

  // Fetch authoritative INR calculation for international plans
  const fetchAuthoritativeINRCalculation = useCallback(async (
    planIdToCalc: string,
    couponToApply?: string | null,
    billingState?: string,
    billingGstin?: string,
    customerEmail?: string
  ) => {
    try {
      const res = await fetch('/api/billing/calculate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planIdToCalc,
          currency: 'INR',
          type: 'initial_checkout',
          couponCode: couponToApply || undefined,
          country: 'India',
          state: billingState?.trim() || undefined,
          gstin: billingGstin?.trim() || undefined,
          customerEmail: customerEmail?.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInrCalculation({
            planId: data.planId,
            planName: data.planName,
            currency: 'INR',
            setup_fee: Number(data.setup_fee),
            setup_tax: Number(data.setup_tax || 0),
            subscription_fee: Number(data.subscription_fee),
            subscription_tax: Number(data.subscription_tax || 0),
            discount: Number(data.discount || 0),
            total_due_today: Number(data.total_due_today),
            recurring_total: Number(data.recurring_total_amount || data.subscription_fee),
            tax_enabled: Boolean(data.tax_enabled || data.taxEnabled)
          });
          return data;
        }
      }
    } catch (err) {
      console.warn('Live INR calculation sync notice:', err);
    }
  }, []);

  // Recalculate only when the plan/coupon/currency changes. Billing fields are
  // deliberately passed as values so typing into the form does not create a
  // new callback and fire a POST request for every keystroke.
  useEffect(() => {
    const currentState = state.trim();
    const currentGstin = gstin.trim();
    const currentEmail = email.trim();

    fetchAuthoritativeCalculation(
      selectedPlanId,
      appliedCoupon,
      currency,
      currentState,
      currentGstin,
      currentEmail
    );
    fetchPaymentCapabilities(currency, selectedPlanId);

    if (currency !== 'INR') {
      fetchAuthoritativeINRCalculation(
        selectedPlanId,
        appliedCoupon,
        currentState,
        currentGstin,
        currentEmail
      );
    }
  }, [selectedPlanId, appliedCoupon, currency, fetchAuthoritativeCalculation, fetchPaymentCapabilities, fetchAuthoritativeINRCalculation]);

  // Handle Promo Code Apply
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    setCouponError(null);
    setCouponApplying(true);

    try {
      const res = await fetch('/api/billing/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: code,
          planId: selectedPlanId,
          currency: currency,
          customerEmail: email.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || 'Invalid or expired promotional code.');
        setCouponApplying(false);
        return;
      }

      setAppliedCoupon(code);
      setCouponError(null);
    } catch (err: any) {
      setCouponError(err.message || 'Failed to validate promo code.');
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  // Ensure Razorpay SDK script is ready
  const ensureRazorpayLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof (window as any).Razorpay === 'function') {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        setTimeout(() => resolve(typeof (window as any).Razorpay === 'function'), 1500);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Main Checkout Submission
  const handlePaySecurely = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validation
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!businessName.trim()) {
      setError('Please enter your business or company name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError('Please enter a valid contact phone number.');
      return;
    }

    if (currency !== 'INR' && !payInINROptIn) {
      setError(`International payment in ${currency} is not currently available. Please choose "Pay in INR" to proceed with payment via Razorpay.`);
      return;
    }

    setLoading(true);

    try {
      // 1. Authoritative calculation check
      let totalAmountToCharge = 0;
      if (currency === 'INR') {
        const calcData = await fetchAuthoritativeCalculation(
          selectedPlanId,
          appliedCoupon,
          'INR',
          state,
          gstin,
          email
        );
        totalAmountToCharge = calcData?.total_due_today ?? calculation.total_due_today;
      } else {
        const inrData = await fetchAuthoritativeINRCalculation(
          selectedPlanId,
          appliedCoupon,
          state,
          gstin,
          email
        );
        totalAmountToCharge = inrData?.total_due_today ?? inrCalculation?.total_due_today ?? 0;
      }

      // A legitimate 100% promotional checkout has a real payable amount of ₹0.
      // Razorpay does not support a zero-value order, so activate it through the
      // server's dedicated, coupon-validated free-activation path.
      if (totalAmountToCharge === 0) {
        if (!appliedCoupon) {
          throw new Error('A zero-value checkout requires a valid promotional code.');
        }

        const cleanSlug = businessName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 24) || 'workspace';
        const tenantId = `${cleanSlug}-${Date.now().toString().slice(-4)}`;

        const freeRes = await fetch('/api/billing/activate-promotional-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: tenantId,
            businessName: businessName.trim(),
            planId: selectedPlanId,
            currency: 'INR',
            couponCode: appliedCoupon,
            customerName: fullName.trim(),
            customerEmail: email.trim(),
            customerPhone: phone.trim(),
            displayCurrency: currency,
            displayAmount: calculation.total_due_today,
            billingAddress: {
              address: address.trim(),
              city: city.trim(),
              state: state.trim(),
              country: 'India',
              gstin: gstin.trim().toUpperCase()
            }
          })
        });

        const freeData = await freeRes.json().catch(() => ({}));
        if (!freeRes.ok || !freeData.success || freeData.status !== 'ACTIVATED') {
          throw new Error(freeData.error || 'Promotional activation could not be completed. Please try again.');
        }

        if (freeData.business) await saveBusiness(freeData.business);
        if (freeData.agent) await saveAgent(freeData.agent);

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        const nextBillingFormatted = nextDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        const freeSuccessPayload = {
          tenantId: freeData.business?.id || tenantId,
          businessName: businessName.trim(),
          customerEmail: email.trim(),
          planName: calculation.planName,
          paymentId: freeData.paymentId || `PROMO-${appliedCoupon}`,
          amount: 0,
          currency: 'INR' as CurrencyCode,
          displayCurrency: currency,
          displayAmount: calculation.total_due_today,
          setupFee: calculation.setup_fee,
          subscriptionFee: calculation.subscription_fee,
          gstAmount: calculation.subscription_tax,
          nextBillingDate: freeData.nextBillingDate || nextBillingFormatted
        };

        try {
          sessionStorage.removeItem('ad_checkout_name');
          sessionStorage.removeItem('ad_checkout_biz');
          sessionStorage.removeItem('ad_checkout_email');
          sessionStorage.removeItem('ad_checkout_phone');
          sessionStorage.removeItem('ad_checkout_addr');
          sessionStorage.removeItem('ad_checkout_city');
          sessionStorage.removeItem('ad_checkout_state');
          sessionStorage.removeItem('ad_checkout_gstin');
        } catch {}

        setPaymentFailed(false);
        setSuccessData(freeSuccessPayload);
        setLoading(false);
        if (onSuccess) onSuccess(freeSuccessPayload);
        return;
      }

      if (totalAmountToCharge < 0) {
        throw new Error('Invalid authoritative order amount. Please refresh and try again.');
      }

      // 2. Generate slug-safe tenant identifier
      const cleanSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24) || 'workspace';
      const tenantId = `${cleanSlug}-${Date.now().toString().slice(-4)}`;

      // 3. Create server-side Razorpay Checkout Session
      const sessionRes = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: tenantId,
          businessName: businessName.trim(),
          planId: selectedPlanId,
          type: 'initial_checkout',
          currency: 'INR',
          displayCurrency: currency,
          displayAmount: calculation.total_due_today,
          provider: 'razorpay',
          customerName: fullName.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          couponCode: appliedCoupon || undefined,
          billingAddress: {
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            country: 'India',
            gstin: gstin.trim().toUpperCase()
          }
        })
      });

      const sessionData = await sessionRes.json().catch(() => ({}));
      if (!sessionRes.ok || !sessionData.orderId) {
        throw new Error(sessionData.error || 'Payment service temporarily unavailable. Please try again.');
      }

      // 4. Ensure Razorpay SDK script is ready
      const rzpReady = await ensureRazorpayLoaded();
      if (!rzpReady || typeof (window as any).Razorpay !== 'function') {
        throw new Error('Payment service temporarily unavailable. Please check your connection and try again.');
      }

      // 5. Open standard Razorpay Checkout Modal
      const rzpKey = sessionData.keyId || sessionData.payment?.raw?.key || '';
      const orderId = sessionData.orderId;

      const orderDesc = currency !== 'INR'
        ? `AgentDesk ${calculation.planName} Plan (${formatCurrencyAmount(calculation.total_due_today, currency)} ${currency}) - Charged in INR`
        : `${calculation.planName} - Setup & 1st Month Subscription`;

      const rzpOptions = {
        key: rzpKey,
        amount: Math.round(totalAmountToCharge * 100),
        currency: 'INR',
        name: 'AgentDesk',
        description: orderDesc,
        order_id: orderId,
        prefill: {
          name: fullName.trim(),
          email: email.trim(),
          contact: phone.trim()
        },
        notes: {
          businessName: businessName.trim(),
          planId: selectedPlanId,
          tenantId: tenantId,
          displayCurrency: currency,
          displayAmount: calculation.total_due_today.toString(),
          paymentCurrency: 'INR',
          amountChargedINR: totalAmountToCharge.toString(),
          preferred_method: selectedMethod,
          selected_method: selectedMethod
        },
        theme: {
          color: '#2563EB' // AgentDesk Brand Blue
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 6. Server Signature Verification & Tenant Activation
            const verifyRes = await fetch('/api/billing/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId: tenantId,
                businessName: businessName.trim(),
                customerName: fullName.trim(),
                customerEmail: email.trim(),
                customerPhone: phone.trim(),
                provider: 'razorpay',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id || orderId,
                signature: response.razorpay_signature,
                type: 'initial_checkout',
                planId: selectedPlanId,
                currency: 'INR',
                displayCurrency: currency,
                displayAmount: calculation.total_due_today,
                amount: totalAmountToCharge,
                paymentMethodData: {
                  brand: selectedMethod.toUpperCase()
                }
              })
            });

            const verifyData = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok || !verifyData.success || verifyData.status !== 'ACTIVATED') {
              throw new Error(verifyData.error || 'Payment verification is still pending. Please try again or contact support.');
            }

            // Sync newly created business & agent to local store
            if (verifyData.business) {
              await saveBusiness(verifyData.business);
            }
            if (verifyData.agent) {
              await saveAgent(verifyData.agent);
            }

            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 30);
            const nextBillingFormatted = nextDate.toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            const successPayload = {
              tenantId: verifyData.business?.id || tenantId,
              businessName: businessName.trim(),
              customerEmail: email.trim(),
              planName: calculation.planName,
              paymentId: response.razorpay_payment_id,
              amount: totalAmountToCharge,
              currency: 'INR' as CurrencyCode,
              displayCurrency: currency,
              displayAmount: calculation.total_due_today,
              setupFee: currency === 'INR' ? calculation.setup_fee : (inrCalculation?.setup_fee || 0),
              subscriptionFee: currency === 'INR' ? calculation.subscription_fee : (inrCalculation?.subscription_fee || 0),
              gstAmount: currency === 'INR' ? calculation.subscription_tax : (inrCalculation?.subscription_tax || 0),
              nextBillingDate: verifyData.nextBillingDate || nextBillingFormatted
            };

            // Clear session storage on verified purchase
            try {
              sessionStorage.removeItem('ad_checkout_name');
              sessionStorage.removeItem('ad_checkout_biz');
              sessionStorage.removeItem('ad_checkout_email');
              sessionStorage.removeItem('ad_checkout_phone');
              sessionStorage.removeItem('ad_checkout_addr');
              sessionStorage.removeItem('ad_checkout_city');
              sessionStorage.removeItem('ad_checkout_state');
              sessionStorage.removeItem('ad_checkout_gstin');
            } catch {}

            setPaymentFailed(false);
            setSuccessData(successPayload);
            setLoading(false);

            if (onSuccess) {
              onSuccess(successPayload);
            }
          } catch (verifyErr: any) {
            setPaymentFailed(true);
            setError(verifyErr.message || 'Payment verification is still pending. Please try again or contact support.');
            setLoading(false);
          }
        }
      };

      const rzpInstance = new (window as any).Razorpay(rzpOptions);
      rzpInstance.on('payment.failed', (resp: any) => {
        setPaymentFailed(true);
        setError('Payment was declined or could not be completed. Please try another payment method or try again.');
        setLoading(false);
      });
      rzpInstance.open();
    } catch (err: any) {
      setPaymentFailed(true);
      setError(err.message || 'Payment service temporarily unavailable. Please try again.');
      setLoading(false);
    }
  };

  // SUCCESS STATE VIEW
  if (successData) {
    return (
      <div className={`text-slate-100 ${isModal ? 'p-6 sm:p-8' : 'max-w-2xl mx-auto py-12 px-4 sm:px-6'}`}>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              {successData.amount === 0 ? '✓ Promotional Activation Successful' : '✓ Payment Successful'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Welcome to AgentDesk</h2>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mt-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Your AgentDesk workspace is ready.</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Your AI receptionist partition for <span className="text-white font-semibold">{successData.businessName}</span> is active and provisioned.
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-slate-300 font-semibold">
              <span>Receipt Summary</span>
              <span className="text-emerald-400 font-mono text-[11px]">{successData.paymentId}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Plan:</span>
              <span className="text-white font-medium">{successData.planName}</span>
            </div>
            {successData.displayCurrency && successData.displayCurrency !== 'INR' && (
              <div className="flex justify-between text-slate-400">
                <span>Selected Plan Price:</span>
                <span className="text-white font-medium font-mono">
                  {formatCurrencyAmount(successData.displayAmount || 0, successData.displayCurrency)} {successData.displayCurrency}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Checkout Method:</span>
              <span className="text-white font-medium">{successData.amount === 0 ? 'Promotional Activation' : 'Razorpay'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Payment Currency:</span>
              <span className="text-blue-400 font-medium font-mono">INR (₹)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Setup Fee (INR):</span>
              <span className="text-white font-medium">{formatCurrencyAmount(successData.setupFee, 'INR')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Monthly Subscription (INR):</span>
              <span className="text-white font-medium">{formatCurrencyAmount(successData.subscriptionFee, 'INR')}</span>
            </div>
            {successData.gstAmount > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>GST:</span>
                <span className="text-white font-medium">{formatCurrencyAmount(successData.gstAmount, 'INR')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-800 text-slate-200 font-bold">
              <span>{successData.amount === 0 ? 'Amount Paid Today:' : 'Amount Charged via Razorpay:'}</span>
              <span className="text-emerald-400 font-black text-sm">{formatCurrencyAmount(successData.amount, 'INR')}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
              <span>{successData.amount === 0 ? 'Activation Reference:' : 'Payment ID:'}</span>
              <span className="text-slate-300 font-mono">{successData.paymentId}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Next Renewal Date:</span>
              <span className="text-slate-300">{successData.nextBillingDate}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            {onNavigateLogin ? (
              <button
                onClick={onNavigateLogin}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Business Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : isModal && onClose ? (
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                Go to Business Dashboard
              </button>
            ) : (
              <button
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Business Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MAIN CHECKOUT VIEW
  return (
    <div className={`text-slate-100 font-sans ${isModal ? '' : 'min-h-screen bg-slate-950 py-10 px-4 sm:px-6 lg:px-8'}`}>
      <div className={`${isModal ? 'w-full' : 'max-w-2xl mx-auto'}`}>
        
        {/* Navigation bar if standalone page */}
        {!isModal && (
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight">AgentDesk</span>
                <span className="text-xs text-blue-400 font-semibold ml-2">Checkout</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {onNavigateHome && (
                <button
                  onClick={onNavigateHome}
                  className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Pricing</span>
                </button>
              )}
              {onNavigateLogin && (
                <button
                  onClick={onNavigateLogin}
                  className="text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}

        {/* Checkout Card Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>AgentDesk Checkout</span>
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>Secure payment powered by Razorpay</span>
                </p>
              </div>
            </div>

            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Checkout"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handlePaySecurely} className="p-6 sm:p-8 space-y-6">
            
            {/* Global Error Banner or Payment Failure Card */}
            {paymentFailed ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-white space-y-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-rose-200">Payment not completed</h3>
                    <p className="text-xs text-rose-300">Your AgentDesk workspace has NOT been activated.</p>
                  </div>
                </div>
                {error && (
                  <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono">
                    {error}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async (e) => {
                      setPaymentFailed(false);
                      setError(null);
                      setRetryingPayment(true);
                      try {
                        await handlePaySecurely(e);
                      } finally {
                        setRetryingPayment(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{retryingPayment ? 'Retrying...' : 'Try Payment Again'}</span>
                  </button>
                  {onNavigateHome && (
                    <button
                      type="button"
                      onClick={onNavigateHome}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Return to Plans
                    </button>
                  )}
                </div>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            ) : null}

            {/* Plan Selector Header & Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              
              {/* Plan Switcher Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Plan</span>
                  
                  {/* Currency Switcher */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
                    {(['INR', 'USD', 'GBP'] as CurrencyCode[]).map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => {
                          setCurrency(cur);
                          setPayInINROptIn(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          currency === cur
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cur === 'INR' ? '₹ INR' : cur === 'USD' ? '$ USD' : '£ GBP'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const curPrices = DEFAULT_PLAN_PRICES[currency] || DEFAULT_PLAN_PRICES.INR;
                    const planPrice = curPrices[plan.id] || curPrices.starter;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white block">{plan.name.split(' ')[0]}</span>
                          {plan.isPopular && (
                            <span className="hidden sm:inline text-[9px] font-black uppercase text-blue-300 bg-blue-500/20 px-1 rounded">Popular</span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-300 mt-0.5 block">
                          {formatCurrencyAmount(planPrice.monthly, currency)}
                          <span className="text-[9px] text-slate-400 font-sans">/mo</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* International Currency Notice & Pay in INR Option */}
              {currency !== 'INR' && !payInINROptIn && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-xs">
                        International payment in {currency} is not currently available.
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Razorpay is currently configured for domestic & international cards settled in <strong>INR (₹)</strong>. If you wish to proceed with an international card through Razorpay, you can choose the <strong>Pay in INR</strong> option.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-300 space-y-0.5">
                      <div>
                        Your selected plan:{' '}
                        <strong className="text-white font-mono">
                          {formatCurrencyAmount(calculation.total_due_today, currency)} {currency}
                        </strong>
                      </div>
                      <div>
                        Razorpay payment currency: <strong className="text-blue-400">INR (₹)</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        The final INR amount will be shown before payment.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayInINROptIn(true)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>Pay in INR</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {currency !== 'INR' && payInINROptIn && (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-700/50 text-xs flex items-center justify-between gap-2.5 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-[11px] text-slate-300">
                      <strong>Pay in INR</strong> selected. Payment will be processed via Razorpay in <strong>INR (₹)</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayInINROptIn(false)}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Exact Line Item Breakdown */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs">
                
                {/* One-Time Setup Fee */}
                <div className="flex items-start justify-between">
                  <div className="text-slate-300 font-medium">One-Time Setup Fee</div>
                  <div className="text-right font-mono font-bold text-white">
                    {formatCurrencyAmount(calculation.setup_fee, currency)}
                  </div>
                </div>

                {/* Monthly Subscription */}
                <div className="flex items-start justify-between">
                  <div className="text-slate-300 font-medium">
                    Monthly Subscription
                  </div>
                  <div className="text-right font-mono font-bold text-white">
                    {formatCurrencyAmount(calculation.subscription_fee, currency)}/month
                  </div>
                </div>

                {/* GST on Monthly Subscription (only displayed if tax collection is enabled) */}
                {Boolean(calculation.tax_enabled && calculation.subscription_tax > 0) && (
                  <div className="flex items-start justify-between">
                    <div className="text-slate-400">
                      GST on Monthly Subscription
                    </div>
                    <div className="text-right font-mono text-slate-300">
                      {formatCurrencyAmount(calculation.subscription_tax, currency)}
                    </div>
                  </div>
                )}

                {/* Promotional Discount (if applied) */}
                {calculation.discount > 0 && (
                  <div className="flex items-start justify-between text-emerald-400">
                    <span>Promotional Discount ({appliedCoupon})</span>
                    <span className="font-mono font-bold">-{formatCurrencyAmount(calculation.discount, currency)}</span>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-slate-800 my-2" />

                {/* Total Due Today */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-sm font-black text-white">Total Due Today</div>
                    <div className="text-[10px] text-slate-400">Setup fee + 1st month subscription</div>
                  </div>
                  <div className="text-right font-mono font-black text-lg sm:text-xl text-white">
                    {calculating ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                      </span>
                    ) : (
                      formatCurrencyAmount(calculation.total_due_today, currency)
                    )}
                  </div>
                </div>

                {/* Next billing cycle */}
                <div className="flex items-center justify-between text-slate-400 text-[11px] pt-0.5">
                  <span>Next billing cycle</span>
                  <span className="font-mono text-slate-300">
                    {formatCurrencyAmount(calculation.recurring_total, currency)}/month
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Customer & Organization Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer & Organization Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Business / Company Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Health Clinic"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Work Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="rahul@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Billing Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Billing Information
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street address, suite or unit"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      disabled
                      value={country}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {calculation.tax_enabled && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      GSTIN <span className="text-slate-500 text-[10px]">(optional where applicable)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="27AAAAA0000A1Z5"
                      value={gstin}
                      onChange={e => setGstin(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: Promotional Code */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Promotional Code
              </h3>

              {appliedCoupon ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span className="font-bold">Code {appliedCoupon} applied</span>
                    <span className="text-emerald-300">
                      (-{formatCurrencyAmount(calculation.discount, 'INR')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 uppercase font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponApplying || !couponInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {couponApplying && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Apply</span>
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-400 mt-1">{couponError}</p>
              )}
            </div>

            {/* SECTION 4: Payment */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Payment
                </h3>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Payment provider: Razorpay
                </span>
              </div>

              {/* International Payment Unavailable Notice (when user hasn't opted in to Pay in INR) */}
              {currency !== 'INR' && !payInINROptIn && (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-2.5 animate-fadeIn">
                  <div className="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>International payment in {currency} is not currently available</span>
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-md mx-auto leading-relaxed">
                    Automated direct gateway checkout in {currency} is currently not supported. To pay using your card via Razorpay settled in Indian Rupees, select <strong>Pay in INR</strong> below.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPayInINROptIn(true)}
                    className="mt-1 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Pay in INR</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Transparent Payment Summary (when paying in INR for international plans) */}
              {currency !== 'INR' && payInINROptIn && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-blue-500/40 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                        Payment Summary
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayInINROptIn(false)}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel Pay in INR
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Plan:</span>
                      <span className="text-white font-bold text-sm block">{calculation.planName}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Plan Price:</span>
                      <span className="text-white font-mono font-bold text-sm block">
                        {formatCurrencyAmount(calculation.total_due_today, currency)} {currency}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Payment Currency:</span>
                      <span className="text-blue-400 font-mono font-bold text-sm block">INR (₹)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-700/50 space-y-0.5">
                      <span className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold block">Amount charged through Razorpay:</span>
                      <span className="text-emerald-400 font-mono font-black text-base block">
                        {formatCurrencyAmount(inrCalculation?.total_due_today || 0, 'INR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                    <span>Payment provider:</span>
                    <span className="text-white font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      Razorpay
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    The payment order is processed through Razorpay in Indian Rupees (INR ₹). If paying with an international card, your bank or card issuer will convert this on your card statement according to their applicable exchange rates. Bank conversion rates are not guaranteed by AgentDesk.
                  </p>
                </div>
              )}

              {/* Functional Payment Methods Selection */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Payment Method (via Razorpay):</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    Instant Activation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(currency === 'INR'
                    ? [
                        { id: 'upi', name: 'UPI', description: 'Google Pay, PhonePe, Paytm & any UPI app', icon: Smartphone, popular: true },
                        { id: 'cards', name: 'Cards', description: 'Credit & Debit Cards (Visa, Mastercard, RuPay)', icon: CreditCard, popular: true },
                        { id: 'qr', name: 'QR Code', description: 'Dynamic BharatQR / Instant UPI QR', icon: QrCode },
                        { id: 'netbanking', name: 'Net Banking', description: '50+ Major Indian Banks', icon: Building2 },
                        { id: 'wallets', name: 'Wallets', description: 'Paytm, PhonePe & Wallets', icon: Wallet }
                      ]
                    : [
                        { id: 'cards', name: 'International Cards', description: 'Visa, Mastercard, Amex (processed in INR)', icon: CreditCard, popular: true }
                      ]
                  ).map((method) => {
                    const MethodIcon = method.icon;
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        id={`payment-method-${method.id}`}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                            <MethodIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                              <span>{method.name}</span>
                              {method.popular && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Popular
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {method.description}
                            </div>
                          </div>
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full border shrink-0 ml-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-700'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Method Guidance Note */}
                <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    {selectedMethod === 'upi' && 'Enter your UPI ID or open Google Pay, PhonePe, or Paytm inside the Razorpay modal for 1-click mobile verification.'}
                    {selectedMethod === 'cards' && 'Enter card number, expiry, and CVV in the Razorpay gateway with 3D Secure bank OTP verification.'}
                    {selectedMethod === 'qr' && 'A dynamic QR code will be generated. Open any UPI camera scanner or banking app to pay immediately.'}
                    {selectedMethod === 'netbanking' && 'Select your bank inside Razorpay to be routed directly to your secure net banking login portal.'}
                    {selectedMethod === 'wallets' && 'Authenticate with your mobile wallet account to pay securely using your available wallet balance.'}
                  </span>
                </div>
              </div>

              {/* Pay Button */}
              {currency !== 'INR' && !payInINROptIn ? (
                <button
                  type="button"
                  onClick={() => setPayInINROptIn(true)}
                  className="w-full py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Payment in {currency} Unavailable — Choose Pay in INR to Proceed</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || (currency !== 'INR' && !inrCalculation)}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to Razorpay...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        Pay {formatCurrencyAmount(
                          currency === 'INR' ? calculation.total_due_today : (inrCalculation?.total_due_today || 0),
                          'INR'
                        )} securely with Razorpay
                      </span>
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Razorpay Verified Checkout
                </span>
                <span>•</span>
                <span>Instant Workspace Provisioning</span>
                <span>•</span>
                <span>Cancel Anytime</span>
              </div>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export const AgentDeskCheckout: React.FC<AgentDeskCheckoutProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackTitle="Something went wrong"
      fallbackMessage="Your entered information has not been lost. Please try reloading or submit again."
      onReset={() => {
        window.location.reload();
      }}
    >
      <AgentDeskCheckoutInner {...props} />
    </ErrorBoundary>
  );
};
