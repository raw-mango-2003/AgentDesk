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
      icon: <MessageSquare className="w-5 h-5 text-blue-400" />,
      title: 'Respond',
      desc: 'Answer supported customer questions using your business knowledge and keep conversations moving when your team is unavailable.'
    },
    {
      icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
      title: 'Capture & Qualify',
      desc: 'Collect enquiry details, organize leads, and give your team the context they need to decide what happens next.'
    },
    {
      icon: <Repeat className="w-5 h-5 text-purple-400" />,
      title: 'Follow Up',
      desc: 'Keep customer follow-up organized across supported channels so interested prospects do not get forgotten.'
    },
    {
      icon: <Calendar className="w-5 h-5 text-cyan-400" />,
      title: 'Book',
      desc: 'Help customers move from conversation to appointment with scheduling workflows and calendar integrations where configured.'
    },
    {
      icon: <PhoneCall className="w-5 h-5 text-amber-400" />,
      title: 'Voice',
      desc: 'Handle supported inbound phone conversations with an AI receptionist and route interactions when human help is needed.'
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-indigo-400" />,
      title: 'Show What Matters',
      desc: 'See conversations, leads, pipeline activity, and follow-up from one workspace instead of piecing together multiple tools.'
    }
  ];

  const faqs = [
    {
      q: 'How is AgentDesk different from a generic chatbot or virtual receptionist?',
      a: 'AgentDesk combines an AI receptionist with lead capture, qualification, follow-up, booking, and a workspace for your team. The goal is simple: handle routine customer conversations automatically and give your team the right context when human attention is needed.'
    },
    {
      q: 'What is included in the one-time implementation fee?',
      a: 'Implementation includes 12 comprehensive phases: business discovery, AI voice persona engineering, semantic knowledge-base ingestion, CRM pipeline setup, lead scoring weights, multi-touch follow-up workflow design, telephony/WhatsApp integration, rigorous boundary testing, live deployment, staff training, and dedicated launch monitoring.'
    },
    {
      q: 'What is the monthly AgentDesk platform & managed AI operations fee?',
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
            <span>AgentDesk • AI Employee for customer conversations</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-4 sm:mb-6">
            Your AI employee for{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              every customer conversation.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-10 font-normal">
            Let AgentDesk handle the first response, capture the enquiry, qualify the lead, and keep follow-up moving. Your team steps in when human attention is needed.
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
              <span>Managed setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>AI receptionist + workspace</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-400 shrink-0" />
              <span>USD • INR • GBP</span>
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
          <div className="relative rounded-3xl bg-slate-950/80 border border-slate-800 p-5 sm:p-7">
            <div className="hidden lg:block absolute top-1/2 left-10 right-10 h-px bg-slate-800" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
              {[
                ['01', 'Customer enquiry', 'A customer asks a question on your website or through a connected channel.', MessageSquare],
                ['02', 'AI responds', 'AgentDesk answers from your configured business knowledge and keeps the conversation moving.', Bot],
                ['03', 'Lead captured', 'Useful enquiry details are organized so your team can see who needs attention.', UserCheck],
                ['04', 'Follow-up', 'Follow-up activity can be scheduled and managed instead of relying on memory.', Repeat],
                ['05', 'Book or hand off', 'Move the customer toward an appointment, or bring in a team member when human help is needed.', Calendar]
              ].map(([number, title, desc, Icon]) => (
                <div key={number} className="relative p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-blue-400">{number}</span>
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{title}</h3>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold text-slate-500">
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">Customer</span>
              <ArrowRight className="w-3 h-3" />
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">AI employee</span>
              <ArrowRight className="w-3 h-3" />
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">Team</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Dashboard Preview */}
      <section className="py-16 px-4 sm:px-8 border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">Workspace preview</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Your AI employee, at a glance</h2>
            <p className="text-sm text-slate-400 mt-2">See what your AI employee is handling and what your team needs to act on.</p>
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
              One AI employee. Four jobs.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              AgentDesk turns customer conversations into organized follow-up, without asking your team to manage another complicated workflow.
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
            <span>Plans for your AI employee</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight break-words">
            Choose the AI employee setup that fits your team
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Start with the core customer workflow and add managed capabilities as your needs grow.
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

        {/* 5. Managed AI Employee Setup */}
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
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Ready to give your team an AI employee?</h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-3 leading-relaxed">Start with AgentDesk, test the AI receptionist, and see how customer conversations can move from first response to follow-up.</p>
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
            Simple answers about how AgentDesk works and what you can configure.
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
            <span>AgentDesk</span>
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
