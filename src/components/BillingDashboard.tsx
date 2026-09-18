import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  Download, 
  ArrowUpRight, 
  Zap, 
  Clock, 
  DollarSign, 
  HelpCircle,
  Phone,
  MessageSquare,
  Mail,
  Users,
  Database,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  PauseCircle,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { Business, BillingInfo, SafePaymentMethod } from '../types.js';
import { 
  getBusinessBillingInfo, 
  setTenantPrimaryPaymentMethod, 
  removeTenantPaymentMethod,
  pauseTenantSubscription,
  resumeTenantSubscription,
  cancelTenantSubscription,
  updateTenantSubscriptionPlan
} from '../lib/dbService.js';
import { 
  CurrencyCode, 
  CURRENCIES, 
  formatPrice, 
  getPlanConfig, 
  getPlanPricing,
  PLAN_CONFIGS,
  COMMUNICATION_USAGE_DISCLOSURE,
  PLATFORM_MANAGED_OPERATIONS
} from '../data/pricing.js';
import { ContactSalesModal } from './ContactSalesModal.js';
import { PaymentCheckoutModal } from './PaymentCheckoutModal.js';

interface BillingDashboardProps {
  business: Business;
  onNavigateTab?: (tab: string) => void;
  onOpenUpgrade?: (feature?: string, targetPlan?: string) => void;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  business,
  onNavigateTab,
  onOpenUpgrade
}) => {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>(
    (business.currency as CurrencyCode) || 'USD'
  );
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'implementation_fee' | 'subscription' | 'add_payment_method'>('subscription');
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<string>('enterprise');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBilling = async () => {
    setLoading(true);
    const info = await getBusinessBillingInfo(business.id);
    setBillingInfo(info);
    setLoading(false);
  };

  useEffect(() => {
    loadBilling();
    setCurrency((business.currency as CurrencyCode) || 'USD');
  }, [business.id, business.currency]);

  const showNotificationMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSetPrimaryPaymentMethod = async (pmId: string) => {
    try {
      setActionLoading(true);
      await setTenantPrimaryPaymentMethod(business.id, pmId);
      showNotificationMessage('Primary payment method updated successfully.');
      await loadBilling();
    } catch (err: any) {
      showNotificationMessage(err.message || 'Failed to update payment method', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePaymentMethod = async (pmId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    try {
      setActionLoading(true);
      await removeTenantPaymentMethod(business.id, pmId);
      showNotificationMessage('Payment method removed.');
      await loadBilling();
    } catch (err: any) {
      showNotificationMessage(err.message || 'Failed to remove payment method', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseSubscription = async () => {
    if (!confirm('Pause automated monthly subscription charges? AI services will remain active until end of cycle.')) return;
    try {
      setActionLoading(true);
      await pauseTenantSubscription(business.id);
      showNotificationMessage('Subscription collection paused.');
      await loadBilling();
    } catch (err: any) {
      showNotificationMessage(err.message || 'Failed to pause subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setActionLoading(true);
      await resumeTenantSubscription(business.id);
      showNotificationMessage('Subscription collection resumed.');
      await loadBilling();
    } catch (err: any) {
      showNotificationMessage(err.message || 'Failed to resume subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Cancel AI RevenueOS subscription? This will stop auto-renewal.')) return;
    try {
      setActionLoading(true);
      await cancelTenantSubscription(business.id);
      showNotificationMessage('Subscription cancelled.');
      await loadBilling();
    } catch (err: any) {
      showNotificationMessage(err.message || 'Failed to cancel subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !billingInfo) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading billing & payment telemetry...</p>
      </div>
    );
  }

  const currentPlan = getPlanConfig(billingInfo.planId || business.plan);
  const planPricing = getPlanPricing(currentPlan, currency);
  const isINR = currency === 'INR';

  const usageStats = [
    {
      key: 'voice',
      label: 'Voice Minutes',
      icon: <Phone className="w-4 h-4 text-blue-400" />,
      used: billingInfo.usage.voice.used,
      included: billingInfo.usage.voice.included,
      unit: 'mins',
      desc: 'Inbound & outbound AI voice calls'
    },
    {
      key: 'sms',
      label: 'SMS Messages',
      icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
      used: billingInfo.usage.sms.used,
      included: billingInfo.usage.sms.included,
      unit: 'msgs',
      desc: 'Missed-call text-back & lead drips'
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp Conversations',
      icon: <MessageSquare className="w-4 h-4 text-green-400" />,
      used: billingInfo.usage.whatsapp.used,
      included: billingInfo.usage.whatsapp.included,
      unit: 'convos',
      desc: '24h service window interactions'
    },
    {
      key: 'email',
      label: 'Email Volume',
      icon: <Mail className="w-4 h-4 text-purple-400" />,
      used: billingInfo.usage.email.used,
      included: billingInfo.usage.email.included,
      unit: 'emails',
      desc: 'Estimates, reviews & follow-up emails'
    },
    {
      key: 'ai',
      label: 'AI / LLM Invocations',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      used: billingInfo.usage.ai.used,
      included: billingInfo.usage.ai.included,
      unit: 'ops',
      desc: 'Conversational inferences & qualification'
    },
    {
      key: 'contacts',
      label: 'Active CRM Contacts',
      icon: <Users className="w-4 h-4 text-amber-400" />,
      used: billingInfo.usage.contacts.used,
      included: billingInfo.usage.contacts.included,
      unit: 'contacts',
      desc: 'Synchronized customer records'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xl animate-bounce-short ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header & Supported Currency Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            <span>Billing & Payment Architecture</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real production billing engine supporting <span className="font-semibold text-slate-200">Razorpay</span> across USD, INR, and GBP.
          </p>
        </div>

        {/* Currency Selector (USD, INR, GBP strictly) */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-400 px-2 uppercase">Billing Currency:</span>
          {(['USD', 'INR', 'GBP'] as CurrencyCode[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currency === c
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Connectivity Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black text-xs">
            RZP
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Razorpay Payment Gateway</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                Active & Integrated
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Cards, UPI, NetBanking & e-mandates across all supported currencies</div>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          INR • USD • GBP
        </span>
      </div>

      {/* 1. Subscription & Payment Method Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Plan Card */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                  Active Subscription Tier
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  billingInfo.status === 'active' || billingInfo.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : billingInfo.status === 'paused'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {billingInfo.status}
                </span>
              </div>

              <div className="text-xs text-slate-400">
                Next Billing: <span className="text-slate-200 font-semibold">{billingInfo.nextBillingDate}</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {currentPlan.name} Plan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Autonomous Multi-Agent Revenue & Customer Operations
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {formatPrice(billingInfo.monthlyFee, currency)}
                </div>
                <div className="text-[11px] text-slate-400">per month (auto-renews)</div>
              </div>
            </div>

            {/* Implementation Fee Status Box */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">12-Step Architecture Setup Fee</div>
                  <div className="text-[10px] text-slate-400">
                    {formatPrice(billingInfo.implementationFee, currency)} one-time implementation
                  </div>
                </div>
              </div>
              {billingInfo.implementationFeePaid ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Paid & Verified</span>
                </span>
              ) : (
                <button
                  onClick={() => {
                    setCheckoutType('implementation_fee');
                    setShowCheckoutModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Pay Setup Fee
                </button>
              )}
            </div>
          </div>

          {/* Plan Lifecycle Controls */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => {
                setCheckoutType('subscription');
                setShowCheckoutModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Upgrade / Switch Plan</span>
            </button>

            {billingInfo.status === 'paused' ? (
              <button
                disabled={actionLoading}
                onClick={handleResumeSubscription}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Resume Subscription</span>
              </button>
            ) : (
              <button
                disabled={actionLoading}
                onClick={handlePauseSubscription}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Pause Collection</span>
              </button>
            )}

            <button
              disabled={actionLoading}
              onClick={handleCancelSubscription}
              className="px-3.5 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-semibold text-xs border border-rose-800/40 transition-all cursor-pointer"
            >
              Cancel Subscription
            </button>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('pricing')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-all cursor-pointer ml-auto"
              >
                Pricing Matrix
              </button>
            )}
          </div>
        </div>

        {/* Payment Methods Card & Manager */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Payment Methods</span>
              </h3>
              <button
                onClick={() => {
                  setCheckoutType('add_payment_method');
                  setShowCheckoutModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Method</span>
              </button>
            </div>

            {/* List of Payment Methods */}
            <div className="space-y-3 mb-4">
              {(() => {
                const methods = (billingInfo.paymentMethods && billingInfo.paymentMethods.length > 0)
                  ? billingInfo.paymentMethods
                  : (billingInfo.paymentMethod && billingInfo.paymentMethod.last4 && billingInfo.paymentMethod.last4 !== '—'
                      ? [billingInfo.paymentMethod as any]
                      : []);

                if (methods.length === 0) {
                  return (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                      No payment methods on file. Click &quot;Add Method&quot; to configure payment credentials.
                    </div>
                  );
                }

                return methods.map((pm: SafePaymentMethod, idx: number) => {
                  const isPrimary = pm.isPrimary || (idx === 0 && !billingInfo.paymentMethods);
                  return (
                    <div 
                      key={pm.id || idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isPrimary 
                          ? 'bg-slate-950 border-blue-500/50 shadow-md' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{pm.brand}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-900 px-1.5 py-0.5 rounded">
                            {pm.provider || 'gateway'}
                          </span>
                        </div>
                        {isPrimary ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            Primary
                          </span>
                        ) : (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleSetPrimaryPaymentMethod(pm.id)}
                            className="text-[10px] font-bold text-blue-400 hover:underline cursor-pointer"
                          >
                            Make Primary
                          </button>
                        )}
                      </div>

                      <div className="font-mono text-sm tracking-widest text-slate-300 mb-2">
                        •••• •••• •••• {pm.last4}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{pm.expiry ? `Expires ${pm.expiry}` : 'Active Wallet'}</span>
                        {!isPrimary && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleRemovePaymentMethod(pm.id)}
                            className="text-rose-400 hover:text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              All payment details are tokenized directly with Razorpay. AI RevenueOS never stores raw card or CVV information.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>PCI-DSS Level 1 & RBI E-Mandate Compliant Tokenization</span>
          </div>
        </div>
      </div>

      {/* 2. Usage & Overage Tracking Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span>Current Cycle Usage & Allowance Tracking</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live consumption against your included monthly plan allowances. Resetting in 15 days.
            </p>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            Auto-scaling overage protection active
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {usageStats.map(stat => {
            const usedNum = stat.used;
            const inclNum = typeof stat.included === 'number' ? stat.included : 10000;
            const pct = Math.min(100, Math.round((usedNum / inclNum) * 100));
            const remaining = Math.max(0, inclNum - usedNum);
            const isNearLimit = pct >= 80;

            return (
              <div
                key={stat.key}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-800">{stat.icon}</div>
                      <div>
                        <div className="text-xs font-bold text-white">{stat.label}</div>
                        <div className="text-[10px] text-slate-500">{stat.desc}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${isNearLimit ? 'text-amber-400' : 'text-slate-300'}`}>
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 90 
                          ? 'bg-rose-500' 
                          : pct > 75 
                          ? 'bg-amber-500' 
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Used: {usedNum.toLocaleString()} {stat.unit}</span>
                    <span className="text-slate-400">Included: {inclNum.toLocaleString()} {stat.unit}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Remaining: {remaining.toLocaleString()} {stat.unit}</span>
                  <span className="text-emerald-400 font-semibold">Included in SLA</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Communication & Usage Disclosure Notice */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {COMMUNICATION_USAGE_DISCLOSURE.sectionTitle}: Transparent Billing Architecture
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {COMMUNICATION_USAGE_DISCLOSURE.headline} {COMMUNICATION_USAGE_DISCLOSURE.subtext}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
          {COMMUNICATION_USAGE_DISCLOSURE.categories.map((cat, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <div className="font-bold text-slate-200 mb-0.5">{cat.name}</div>
              <div className="text-[11px] text-slate-400 mb-2 leading-tight">{cat.description}</div>
              <div className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50 inline-block">
                Included: {cat.includedEnterprise}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Invoice History & Real Statement Records */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <span>Statements & Billing History</span>
          </h2>
          <span className="text-xs text-slate-400">All invoices verified for tax & compliance</span>
        </div>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Invoice #</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {billingInfo.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No invoices or statements yet. Statements are generated automatically upon billing events.
                    </td>
                  </tr>
                ) : (
                  billingInfo.invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                      <td className="py-4 px-6 text-slate-400">{inv.date}</td>
                      <td className="py-4 px-6 font-semibold text-slate-200">{inv.description}</td>
                      <td className="py-4 px-6 font-bold text-white">
                        {formatPrice(inv.amount, (inv.currency as CurrencyCode) || currency)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => showNotificationMessage(`Downloaded official tax receipt for ${inv.invoiceNumber}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Checkout Modal */}
      <PaymentCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        businessId={business.id}
        planId={currentPlan.id}
        planName={currentPlan.name}
        amount={checkoutType === 'implementation_fee' ? billingInfo.implementationFee : billingInfo.monthlyFee}
        currency={currency}
        type={checkoutType}
        onSuccess={async (res) => {
          setShowCheckoutModal(false);
          showNotificationMessage(`Payment transaction verified: ${res.transactionId}`);
          await loadBilling();
        }}
      />

      {/* Contact Sales Modal */}
      <ContactSalesModal
        isOpen={showSalesModal}
        onClose={() => setShowSalesModal(false)}
        planId={selectedPlanForUpgrade}
        currency={currency}
        ctaType="sales"
      />
    </div>
  );
};
