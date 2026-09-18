import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  MessageSquare, 
  Mic, 
  Database, 
  UserCheck, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  Globe, 
  Star, 
  Check, 
  PhoneCall, 
  Clock, 
  Briefcase, 
  PhoneMissed, 
  Repeat, 
  RotateCcw, 
  Calendar, 
  FileText, 
  Send, 
  Lock, 
  Layers,
  HelpCircle
} from 'lucide-react';
import { 
  CURRENCIES, 
  CurrencyCode, 
  PRICING_PLANS, 
  IMPLEMENTATION_EXPLANATION, 
  PLATFORM_MANAGED_OPERATIONS, 
  COMMUNICATION_USAGE_DISCLOSURE,
  ENTERPRISE_CONSOLIDATION_VALUE,
  getRecommendedCurrency, 
  formatPrice,
  PlanConfig
} from '../data/pricing';
import { ContactSalesModal } from './ContactSalesModal';
import { AgentDeskCheckoutModal } from './AgentDeskCheckoutModal';
import { ROICalculator } from './ROICalculator';
import { LogIn } from 'lucide-react';

interface LandingPageProps {
  onOpenDemo: () => void;
  onOpenAuth: () => void;
  onOpenDashboard: (tenantId?: string) => void;
  onOpenPricing?: () => void;
  onWorkspaceCreated?: (tenantId: string) => void;
  onNavigateGetStarted?: () => void;
  onNavigateLogin?: () => void;
  onNavigatePlatformLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenDemo,
  onOpenAuth,
  onOpenDashboard,
  onOpenPricing,
  onWorkspaceCreated,
  onNavigateGetStarted,
  onNavigateLogin,
  onNavigatePlatformLogin
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [currency, setCurrency] = useState<CurrencyCode>(getRecommendedCurrency());
  
  // Checkout Modal State for Starter, Growth, Scale
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    planId: string;
  }>({
    isOpen: false,
    planId: 'starter'
  });

  // Sales Modal State for Enterprise
  const [salesModal, setSalesModal] = useState<{
    isOpen: boolean;
    planId: string;
    ctaType: 'demo' | 'book_demo' | 'sales' | 'enterprise_sales';
  }>({
    isOpen: false,
    planId: 'enterprise',
    ctaType: 'sales'
  });

  const handleOpenPlanAction = (plan: PlanConfig) => {
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
    } else {
      onOpenDashboard(tenantId);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const pillars = [
    {
      icon: <Bot className="w-5 h-5 text-blue-400" />,
      title: 'AI Website Chat Receptionist',
      desc: 'Answers questions from business knowledge base, captures leads, and books appointments 24/7 without hallucination.'
    },
    {
      icon: <PhoneCall className="w-5 h-5 text-emerald-400" />,
      title: 'AI Voice Receptionist',
      desc: 'Handles inbound phone calls with natural human-quality conversational voice synthesis, call recording, and intent routing.'
    },
    {
      icon: <PhoneMissed className="w-5 h-5 text-amber-400" />,
      title: 'Missed Call Text Back',
      desc: 'Instantly sends an automated SMS or WhatsApp when a call is missed, recovering 75%+ of leads before they call a competitor.'
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      title: 'AI Lead Qualification & Scoring',
      desc: 'Evaluates budget, timeline, decision authority, and urgent need on a 1-100 scale with automated tagging (HOT, WARM, COLD).'
    },
    {
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
      title: '360° CRM & Deals Pipeline',
      desc: 'Complete contact timeline, multi-stage drag-and-drop Kanban pipeline, deal values, and real-time conversion metrics.'
    },
    {
      icon: <Repeat className="w-5 h-5 text-emerald-400" />,
      title: 'Automated Follow-Up Sequences',
      desc: 'Multi-touch omni-channel sequences across Day 0, Day 1, Day 3, and Day 7 via SMS, Email, and WhatsApp.'
    },
    {
      icon: <RotateCcw className="w-5 h-5 text-purple-400" />,
      title: 'Customer Re-Engagement',
      desc: 'Reactivates stale contacts and past customers with seasonal promotions, maintenance reminders, and VIP discounts.'
    },
    {
      icon: <Star className="w-5 h-5 text-amber-400" />,
      title: 'Review Management & Sentiment Hub',
      desc: 'Automates Google and Yelp review generation, analyzes customer sentiment, and drafts AI-assisted responses.'
    },
    {
      icon: <Calendar className="w-5 h-5 text-blue-400" />,
      title: 'Appointment Booking & Reminders',
      desc: 'Two-way calendar sync, timezone conversion, buffer management, and automated 24h/2h show-up reminders.'
    },
    {
      icon: <FileText className="w-5 h-5 text-indigo-400" />,
      title: 'Estimate & Quote Follow-Up',
      desc: 'Tracks sent proposals, dispatches automated check-ins before expiry, and alerts staff when a quote is viewed.'
    },
    {
      icon: <Send className="w-5 h-5 text-blue-400" />,
      title: 'Compliant Cold Outreach',
      desc: 'Personalized cold email & LinkedIn sequences with domain warmup, unsubscribe headers, and anti-spam rate throttling.'
    },
    {
      icon: <Globe className="w-5 h-5 text-emerald-400" />,
      title: 'Global Multi-Currency & Regional Engine',
      desc: 'Native formatting for USD ($), INR (₹), and GBP (£), multi-timezone support, Twilio SMS & WhatsApp Business API.'
    }
  ];

  const faqs = [
    {
      q: 'How is AI RevenueOS different from a generic chatbot or virtual receptionist?',
      a: 'AI RevenueOS is not just a chatbot or answering service. It is a comprehensive, autonomous revenue operating system combining 24/7 AI Voice reception, website chat, instant missed-call recovery, automated lead qualification, integrated CRM, multi-touch follow-up sequences, and database reactivation in one unified platform.'
    },
    {
      q: 'What is included in the one-time implementation fee?',
      a: 'Implementation includes 12 comprehensive phases: business discovery, AI voice persona engineering, semantic knowledge-base ingestion, CRM pipeline setup, lead scoring weights, multi-touch follow-up workflow design, telephony/WhatsApp integration, rigorous boundary testing, live deployment, staff training, and dedicated launch monitoring.'
    },
    {
      q: 'What is the monthly Platform & Managed AI Operations fee?',
      a: 'The monthly platform fee covers software licensing, autonomous multi-agent orchestration, CRM hosting, custom dashboards, platform monitoring, ongoing prompt fine-tuning, and security updates, and standard monthly usage allowances for voice minutes, messaging, and AI computations.'
    },
    {
      q: 'How does multi-currency and regional localization work?',
      a: 'Each business workspace supports its operating market with native currency formatting across USD ($), INR (₹), and GBP (£), regional timezones, telephone formatting, and messaging channels (SMS/Twilio and WhatsApp Business).'
    },
    {
      q: 'Can I integrate my existing CRM or calendar?',
      a: 'Yes. AI RevenueOS provides webhooks, REST API endpoints, Google Calendar sync, Twilio telephony hooks, and CSV export capabilities.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-14 sm:pt-20 sm:pb-20 px-4 sm:px-8 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/15 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-blue-400 text-xs font-bold mb-4 sm:mb-6 shadow-md">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>AgentDesk Technologies • AI RevenueOS Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-4 sm:mb-6">
            One AI system for{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              every customer interaction.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-10 font-normal">
            Turn every customer interaction into revenue. AI RevenueOS is the complete AI-powered customer revenue and operations platform: 
            <span className="text-white font-semibold"> AI Receptionist + CRM + Follow-Up + Re-Engagement + Revenue Automation</span>.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto">
            <button
              onClick={onNavigateGetStarted || onOpenAuth}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onNavigateLogin || onOpenAuth}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-blue-400" />
              <span>Sign In</span>
            </button>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-6 sm:py-4 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Test AI Receptionist</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>12-Step Full Implementation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Managed AI Operations & SLA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Global Multi-Currency Native (USD • INR • GBP)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem Section */}
      <section className="py-16 px-4 sm:px-8 border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">The problem</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">Customer enquiries do not wait for business hours.</h2>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">Leads can arrive through your website, phone, messages, or follow-up lists while your team is busy or unavailable. AgentDesk brings those customer interactions into one workflow so teams can respond, qualify, follow up, and track outcomes from a single workspace.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ['Missed enquiries', 'Questions arrive when staff are unavailable.'],
              ['Slow follow-up', 'Interested prospects can require several touchpoints.'],
              ['Fragmented tools', 'Customer conversations and pipeline data can live in separate systems.'],
              ['Limited visibility', 'Teams need a clear view of conversations, leads, and revenue activity.']
            ].map(([title, desc]) => (
              <div key={title} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                <h3 className="text-xs font-bold text-white">{title}</h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="py-16 px-4 sm:px-8 bg-slate-900/30 border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">How it works</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">From first enquiry to measurable follow-up</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              ['01', 'Connect', 'Configure the customer channels and business knowledge your workspace will use.'],
              ['02', 'Respond', 'The AI receptionist handles supported customer questions and captures enquiry details.'],
              ['03', 'Qualify', 'Leads can be organized with qualification data, tags, and pipeline stages.'],
              ['04', 'Follow Up', 'Teams can manage follow-up activity and review customer and revenue signals in the workspace.']
            ].map(([number, title, desc]) => (
              <div key={number} className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] font-black text-blue-400">{number}</span>
                <h3 className="text-sm font-bold text-white mt-2">{title}</h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Dashboard Preview */}
      <section className="py-16 px-4 sm:px-8 border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">Workspace preview</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">One place to see customer activity</h2>
            <p className="text-sm text-slate-400 mt-2">A simple operating view for conversations, leads, pipeline activity, and follow-up.</p>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-blue-400" /><span className="text-xs font-bold text-white">AgentDesk Workspace</span></div>
              <span className="text-[10px] text-slate-500">Live workspace view</span>
            </div>
            <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['Conversations', '128', 'Customer interactions'],
                ['New Leads', '34', 'Captured enquiries'],
                ['Qualified', '19', 'Leads needing action'],
                ['Follow-Ups', '27', 'Scheduled activities']
              ].map(([label, value, detail]) => (
                <div key={label} className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="text-2xl font-black text-white mt-1">{value}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{detail}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 grid lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-xs font-bold text-white mb-3">Recent customer activity</p><div className="space-y-2">{['Website enquiry received', 'Lead qualification completed', 'Follow-up activity scheduled'].map(item => <div key={item} className="flex items-center gap-2 text-[11px] text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{item}</div>)}</div></div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-xs font-bold text-white mb-3">Pipeline</p><div className="space-y-2">{['New', 'Qualified', 'Proposal', 'Won'].map((stage, i) => <div key={stage} className="flex justify-between text-[11px]"><span className="text-slate-400">{stage}</span><span className="text-white font-bold">{[12, 8, 5, 3][i]}</span></div>)}</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Omnichannel Pillars Bento Grid */}
      <section className="py-16 px-4 sm:px-8 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              12 Autonomous Engines in One Unified Platform
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Replace fragmented software subscriptions with a single, intelligent revenue operating system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md group"
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  {pillar.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{pillar.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Pricing Matrix Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Transparent, High-ROI Plans</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight break-words">
            Engineered for Modern Revenue Teams
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            From emerging practices to high-volume multi-location enterprises.
          </p>

          {/* Currency Toggle */}
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1 mt-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-full">
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map(code => (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currency === code
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {CURRENCIES[code].flag} {CURRENCIES[code].label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch mb-16 w-full">
          {PRICING_PLANS.map((plan: PlanConfig) => {
            const planPricing = plan.pricing[currency] || plan.pricing.USD;
            const monthlyFormatted = plan.isCustomPrice 
              ? 'Custom' 
              : formatPrice(planPricing.monthlyPrice, currency);
            const setupFormatted = plan.isCustomPrice 
              ? 'Custom Scope' 
              : formatPrice(planPricing.setupPrice, currency);

            const isEnterprise = plan.id === 'enterprise';

            return (
              <div
                key={plan.id}
                className={`w-full min-w-0 p-5 sm:p-6 xl:p-6 2xl:p-7 rounded-3xl border transition-all flex flex-col justify-between relative ${
                  isEnterprise
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950/40 border-blue-500 shadow-2xl shadow-blue-500/20 ring-2 ring-blue-500/30'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isEnterprise && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[10px] uppercase tracking-wider shadow-md whitespace-nowrap z-10">
                    MOST POPULAR
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-6 min-h-[36px] leading-relaxed">{plan.positioning}</p>

                  <div className="mb-6 pb-6 border-b border-slate-800">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-white break-words">{monthlyFormatted}</span>
                      {!plan.isCustomPrice && <span className="text-xs text-slate-400">/ month</span>}
                    </div>
                    <div className="text-[11px] text-slate-300 font-semibold mt-1">
                      {plan.isCustomPrice ? 'Contact for tailored SLA' : `+ ${setupFormatted} setup fee`}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Platform & Managed AI Operations</div>
                  </div>

                  <ul className="space-y-2.5 mb-8">
                    {plan.features.slice(0, 7).map((feat, fidx) => (
                      <li key={fidx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleOpenPlanAction(plan)}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isEnterprise
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {plan.ctaText}
                </button>
              </div>
            );
          })}
        </div>

        {/* 4. Interactive ROI Calculator */}
        <div className="mb-16">
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
        </div>

        {/* 5. 12-Step Implementation Box */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-xl font-bold text-white mb-2">{IMPLEMENTATION_EXPLANATION.title}</h3>
            <p className="text-xs text-slate-400">{IMPLEMENTATION_EXPLANATION.summary}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {IMPLEMENTATION_EXPLANATION.steps.map(s => (
              <div key={s.step} className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold text-[10px] flex items-center justify-center">
                    {s.step}
                  </span>
                  <span className="font-bold text-white">{s.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Final CTA */}
      <section className="py-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-blue-950/80 via-slate-900 to-indigo-950/70 border border-blue-500/20 p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Ready to centralize your customer interactions?</h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-3 leading-relaxed">Start with AgentDesk, explore the AI receptionist, or talk to the team about a managed deployment.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
            <button onClick={onNavigateGetStarted || onOpenAuth} className="px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"><span>Get Started</span><ArrowRight className="w-4 h-4" /></button>
            <button onClick={onOpenDemo} className="px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"><Bot className="w-4 h-4 text-emerald-400" /><span>Test AI Receptionist</span></button>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section className="py-16 px-4 sm:px-8 max-w-4xl mx-auto border-t border-slate-800">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Everything you need to know about AI RevenueOS architecture and deployment.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className="text-sm font-bold text-white">{faq.q}</span>
                {openFaqIndex === idx ? (
                  <ChevronUp className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {openFaqIndex === idx && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-slate-800 py-10 px-4 sm:px-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Bot className="w-4 h-4 text-blue-400" />
            <span>AI RevenueOS</span>
            <span className="text-[10px] text-slate-500 font-normal">by AgentDesk Technologies • © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span>Security controls documented</span>
            <span>Privacy & messaging compliance controls</span>
            {onNavigatePlatformLogin && (
              <button
                onClick={onNavigatePlatformLogin}
                className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline underline-offset-4"
              >
                Platform Admin Sign In
              </button>
            )}
          </div>
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

      {/* Sales Inquiry & Demo Modal (Enterprise) */}
      <ContactSalesModal
        isOpen={salesModal.isOpen}
        onClose={() => setSalesModal({ ...salesModal, isOpen: false })}
        planId={salesModal.planId}
        currency={currency}
        ctaType={salesModal.ctaType}
      />
    </div>
  );
};
