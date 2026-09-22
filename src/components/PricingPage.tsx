import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Bot, 
  Building2, 
  Phone, 
  MessageSquare, 
  Database, 
  Calendar, 
  Repeat, 
  FileText, 
  RotateCcw, 
  TrendingUp, 
  Lock, 
  HelpCircle,
  Zap,
  Users,
  Check,
  X,
  Layers,
  BarChart3
} from 'lucide-react';
import { 
  CurrencyCode, 
  CURRENCIES, 
  formatPrice, 
  PRICING_PLANS, 
  IMPLEMENTATION_EXPLANATION, 
  PLATFORM_MANAGED_OPERATIONS, 
  COMMUNICATION_USAGE_DISCLOSURE,
  ENTERPRISE_CONSOLIDATION_VALUE,
  PLAN_COMPARISON_TABLE,
  getRecommendedCurrency,
  getPlanPricing,
  PlanConfig
} from '../data/pricing';
import { ROICalculator } from './ROICalculator';
import { ContactSalesModal } from './ContactSalesModal';
import { AgentDeskCheckoutModal } from './AgentDeskCheckoutModal';

interface PricingPageProps {
  onOpenDashboard?: (tenantId?: string) => void;
  onOpenDemo?: () => void;
  onWorkspaceCreated?: (tenantId: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  onOpenDashboard,
  onOpenDemo,
  onWorkspaceCreated
}) => {
  const [currency, setCurrency] = useState<CurrencyCode>(() => getRecommendedCurrency());
  
  // Checkout Modal State for Starter, Growth, Scale
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    planId: string;
  }>({
    isOpen: false,
    planId: 'starter'
  });

  // Contact Sales Modal State for Enterprise
  const [salesModal, setSalesModal] = useState<{
    isOpen: boolean;
    planId: string;
    ctaType: 'demo' | 'book_demo' | 'sales' | 'enterprise_sales';
  }>({
    isOpen: false,
    planId: 'enterprise',
    ctaType: 'sales'
  });

  const [expandedImplementation, setExpandedImplementation] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleOpenPlanModal = (plan: PlanConfig) => {
    if (plan.id === 'enterprise' || plan.ctaType === 'sales' || plan.ctaType === 'enterprise_sales') {
      setSalesModal({
        isOpen: true,
        planId: plan.id,
        ctaType: 'sales'
      });
      return;
    }

    // Starter, Growth, Scale -> Open AgentDesk Checkout Modal
    setCheckoutModal({
      isOpen: true,
      planId: plan.id
    });
  };

  const handleWorkspaceActivated = (tenantId: string) => {
    if (onWorkspaceCreated) {
      onWorkspaceCreated(tenantId);
    } else if (onOpenDashboard) {
      onOpenDashboard(tenantId);
    }
  };

  const categories = ['All', 'Websites & Agents', 'Usage Allowance', 'Lead Conversion', 'Knowledge & AI', 'Automation', 'Integrations', 'Analytics', 'Operations', 'Support'];

  const filteredComparisonRows = selectedCategory === 'All'
    ? PLAN_COMPARISON_TABLE
    : PLAN_COMPARISON_TABLE.filter(r => r.category === selectedCategory);

  const POPULAR_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'GBP'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-24 w-full overflow-x-clip">
      {/* 1. Hero Section */}
      <section className="relative pt-12 sm:pt-16 pb-8 px-4 sm:px-6 lg:px-8 text-center w-full max-w-7xl mx-auto overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[700px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-blue-400 text-xs font-bold mb-6 shadow-md max-w-full">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">AgentDesk Technologies • Enterprise Pricing & System Plans</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-5 break-words">
            Turn every customer interaction into{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              revenue.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-6 font-normal">
            The complete AI Revenue & Customer Operations Platform. Consolidate your answering service, CRM, follow-up, appointments, and reviews into one intelligent system.
          </p>

          {/* Currency Indicator */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-30 mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-slate-900/90 border border-slate-800 shadow-xl max-w-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <span>All plans priced in Indian Rupee (INR ₹)</span>
                <span className="text-slate-500">•</span>
                <span className="text-blue-400">Razorpay Checkout</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Four Plan Cards Matrix */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch w-full">
          {PRICING_PLANS.map((plan: PlanConfig) => {
            const planPricing = getPlanPricing(plan, currency);
            const monthlyFormatted = plan.isCustomPrice
              ? 'Custom Pricing'
              : formatPrice(planPricing.monthlyPrice, currency);
            const setupFormatted = plan.isCustomPrice
              ? 'Custom Pricing'
              : formatPrice(planPricing.setupPrice, currency);

            const isGrowth = plan.id === 'growth' || plan.isPopular;
            const isScale = plan.id === 'scale';
            const isEnterprise = plan.id === 'enterprise';

            return (
              <div
                key={plan.id}
                className={`w-full min-w-0 rounded-3xl border transition-all flex flex-col justify-between p-5 sm:p-6 xl:p-6 2xl:p-7 relative ${
                  isGrowth
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950/50 border-blue-500 shadow-2xl shadow-blue-500/20 ring-2 ring-blue-500/40'
                    : isScale
                    ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-indigo-500/50 shadow-xl'
                    : isEnterprise
                    ? 'bg-slate-900/80 border-purple-500/40 shadow-xl'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Most Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/30 border border-blue-400/30 whitespace-nowrap z-10">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-white mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-400 min-h-[32px] leading-relaxed">{plan.positioning}</p>
                  </div>

                  {/* Pricing Box - Delineated Two-Part Model */}
                  <div className="mb-6 pb-6 border-b border-slate-800 space-y-3">
                    {/* 1. Monthly Recurring Subscription */}
                    <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-900/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                        MONTHLY SUBSCRIPTION
                      </div>
                      <div className="flex items-baseline gap-1 mt-1 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight break-words">{monthlyFormatted}</span>
                        {!plan.isCustomPrice && <span className="text-xs text-slate-400">/month</span>}
                      </div>
                      <div className="text-[11px] text-blue-300/80 mt-0.5 font-medium">
                        Recurring monthly platform license
                      </div>
                    </div>

                    {/* 2. One-Time Deployment */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        ONE-TIME DEPLOYMENT
                      </div>
                      <div className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 break-words">
                        {setupFormatted}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        One-time onboarding & AI setup fee
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded-xl border border-slate-800/60 leading-snug">
                      <span className="text-slate-300 font-semibold">Billing Policy:</span> Deployment is a single one-time setup fee. Monthly pricing is recurring. Deployment is never charged monthly.
                    </div>
                  </div>

                  {/* Included AI Conversations & Key Allowances */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6 text-[11px] space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Included Monthly Quotas:
                    </div>
                    <div className="flex justify-between items-center text-slate-300 bg-slate-900/70 p-2 rounded-lg border border-slate-800/50 gap-2">
                      <span className="font-semibold text-blue-300 shrink-0">AI Conversations:</span>
                      <span className="font-black text-white text-right truncate">
                        {typeof plan.usageLimits.aiUsage === 'number'
                          ? `${plan.usageLimits.aiUsage.toLocaleString()}/month`
                          : plan.usageLimits.aiUsage}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 px-1 gap-2">
                      <span className="shrink-0">Websites & Agents:</span>
                      <span className="font-bold text-white text-right truncate">
                        {typeof plan.usageLimits.websites === 'number' 
                          ? `${plan.usageLimits.websites} Site • ${plan.usageLimits.agents} Agent${Number(plan.usageLimits.agents || 1) > 1 ? 's' : ''}` 
                          : 'Unlimited / Custom'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 px-1 gap-2">
                      <span className="shrink-0">Voice Allowance:</span>
                      <span className="font-bold text-white text-right truncate">
                        {typeof plan.usageLimits.voiceMinutes === 'number' 
                          ? `${plan.usageLimits.voiceMinutes.toLocaleString()} mins/mo`
                          : 'Custom Volume'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 px-1 gap-2">
                      <span className="shrink-0">SMS & WhatsApp:</span>
                      <span className="font-bold text-white text-right truncate">
                        {typeof plan.usageLimits.smsMessages === 'number'
                          ? `${plan.usageLimits.smsMessages.toLocaleString()} / mo`
                          : 'Custom'}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="mb-6">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Includes:
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feat, fidx) => (
                        <li key={fidx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenPlanModal(plan)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      isGrowth
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
                        : isScale
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : isEnterprise
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Implementation Fee Transparency (12 Steps) */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mb-20">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>White-Glove Deployment Guarantee</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {IMPLEMENTATION_EXPLANATION.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                {IMPLEMENTATION_EXPLANATION.summary}
              </p>
            </div>

            <button
              onClick={() => setExpandedImplementation(!expandedImplementation)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>{expandedImplementation ? 'Collapse Steps' : 'Expand 12-Step Architecture'}</span>
              {expandedImplementation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {expandedImplementation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
              {IMPLEMENTATION_EXPLANATION.steps.map(step => (
                <div
                  key={step.step}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black text-xs flex items-center justify-center">
                        {step.step}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Phase {Math.ceil(step.step / 3)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">{step.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Platform & Managed AI Operations */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mb-20">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-blue-950/30 via-slate-900 to-indigo-950/30 border border-slate-800 shadow-2xl">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {PLATFORM_MANAGED_OPERATIONS.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {PLATFORM_MANAGED_OPERATIONS.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PLATFORM_MANAGED_OPERATIONS.includedItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Interactive ROI Simulator */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mb-20">
        <ROICalculator
          currency={currency}
          onBookDemo={() => {
            setSalesModal({
              isOpen: true,
              planId: 'enterprise',
              ctaType: 'book_demo'
            });
          }}
        />
      </section>

      {/* 6. Why AI RevenueOS Enterprise? (Consolidation & Autonomous Flow) */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mb-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Software Consolidation & Cost Reduction</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {ENTERPRISE_CONSOLIDATION_VALUE.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            {ENTERPRISE_CONSOLIDATION_VALUE.subtitle}
          </p>
        </div>

        {/* 10 Tool Replaces Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-12">
          {ENTERPRISE_CONSOLIDATION_VALUE.categories.map((cat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
            >
              <div className="font-bold text-xs text-white mb-1.5">{cat.name}</div>
              <div className="text-[11px] text-slate-400">
                <span className="text-rose-400 font-semibold">Replaces: </span>
                <span>{cat.replaces}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Autonomous Revenue Flow Diagram */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="text-center mb-6">
            <h3 className="text-base font-bold text-white">
              Autonomous Revenue Loop: From Inbound Signal to Cash in Bank
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              One unified AI pipeline eliminates lead leakage and human delay.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ENTERPRISE_CONSOLIDATION_VALUE.revenueFlow.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900/40">
                      0{idx + 1}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{step.stage}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Comprehensive 26-Feature Comparison Matrix */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mb-20">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Detailed Capability Comparison
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Compare granular architectural specifications and module capabilities across all 4 plans.
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-6">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-6 w-2/5">Capability / Architecture</th>
                  <th className="py-4 px-4 text-center">Starter</th>
                  <th className="py-4 px-4 text-center bg-blue-950/40 text-blue-300 border-x border-blue-900/50">
                    Growth (Most Popular)
                  </th>
                  <th className="py-4 px-4 text-center">Scale</th>
                  <th className="py-4 px-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredComparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {row.category}
                        </span>
                        <span>{row.feature}</span>
                      </div>
                    </td>

                    {/* Starter */}
                    <td className="py-3.5 px-4 text-center">
                      {typeof row.starter === 'boolean' ? (
                        row.starter ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-slate-400 font-semibold">{row.starter}</span>
                      )}
                    </td>

                    {/* Growth */}
                    <td className="py-3.5 px-4 text-center bg-blue-950/20 border-x border-blue-900/30 font-bold text-white">
                      {typeof row.growth === 'boolean' ? (
                        row.growth ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-blue-300 font-bold">{row.growth}</span>
                      )}
                    </td>

                    {/* Scale */}
                    <td className="py-3.5 px-4 text-center">
                      {typeof row.scale === 'boolean' ? (
                        row.scale ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-slate-200 font-semibold">{row.scale}</span>
                      )}
                    </td>

                    {/* Enterprise */}
                    <td className="py-3.5 px-4 text-center">
                      {typeof row.enterprise === 'boolean' ? (
                        row.enterprise ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-purple-300 font-bold">{row.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 8. Communication & Usage Disclosure Notice */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mb-20">
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {COMMUNICATION_USAGE_DISCLOSURE.sectionTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                {COMMUNICATION_USAGE_DISCLOSURE.headline} {COMMUNICATION_USAGE_DISCLOSURE.subtext}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMMUNICATION_USAGE_DISCLOSURE.categories.map((cat, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="font-bold text-xs text-white mb-1">{cat.name}</div>
                <div className="text-[11px] text-slate-400 mb-2 leading-relaxed">{cat.description}</div>
                <div className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50 inline-block">
                  Enterprise Included: {cat.includedEnterprise}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Bottom Enterprise CTA */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto text-center">
        <div className="p-10 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-700/50 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Ready to deploy AI RevenueOS for your business?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Speak with an AgentDesk solutions architect to audit your call volume, design your conversational voice agent, and schedule full onboarding.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setSalesModal({
                  isOpen: true,
                  planId: 'enterprise',
                  ctaType: 'sales'
                });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Talk to Enterprise Sales</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onOpenDemo && (
              <button
                onClick={onOpenDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>Test Live AI Receptionist</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 mt-12 py-8 px-4 sm:px-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>AgentDesk Technologies • © {new Date().getFullYear()}</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px]">
            <a href="/terms" className="hover:text-white underline underline-offset-4">Terms of Use</a>
            <a href="/privacy" className="hover:text-white underline underline-offset-4">Privacy Policy</a>
            <a href="/refund-policy" className="hover:text-white underline underline-offset-4">Refund & Cancellation</a>
            <a href="/acceptable-use" className="hover:text-white underline underline-offset-4">Acceptable Use</a>
            <a href="/cookie-policy" className="hover:text-white underline underline-offset-4">Cookie Policy</a>
          </nav>
        </div>
      </footer>

      {/* AgentDesk Checkout Modal (Starter, Growth, Scale) */}
      <AgentDeskCheckoutModal
        isOpen={checkoutModal.isOpen}
        onClose={() => setCheckoutModal(prev => ({ ...prev, isOpen: false }))}
        planId={checkoutModal.planId}
        initialCurrency={currency}
        onWorkspaceCreatedAndActivated={handleWorkspaceActivated}
      />

      {/* Contact Sales / Demo Modal (Enterprise) */}
      <ContactSalesModal
        isOpen={salesModal.isOpen}
        onClose={() => setSalesModal(prev => ({ ...prev, isOpen: false }))}
        planId={salesModal.planId}
        currency={currency}
        ctaType={salesModal.ctaType}
      />
    </div>
  );
};
