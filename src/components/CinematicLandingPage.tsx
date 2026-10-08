import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  Globe2,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap
} from 'lucide-react';
import { safeFetchJson } from '../lib/apiClient';

interface CinematicLandingPageProps {
  onOpenDemo: () => void;
  onOpenAuth: () => void;
  onOpenDashboard: (tenantId?: string) => void;
  onOpenPricing?: () => void;
  onWorkspaceCreated?: (tenantId: string) => void;
  onNavigateGetStarted?: () => void;
  onNavigateLogin?: () => void;
  onNavigatePlatformLogin?: () => void;
}

const FALLBACK_DESIGN = {
  site: { name: 'AgentDesk', pageTitle: 'AgentDesk | AI Employee' },
  brand: {
    primaryColor: '#b8a47e',
    secondaryColor: '#0b0b0b',
    accentColor: '#d8c49a',
    backgroundColor: '#080808',
    surfaceColor: '#121212',
    textColor: '#f4f1e9',
    mutedTextColor: '#aaa59a',
    borderColor: '#2a2926'
  },
  typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: 16, headingWeight: 600, letterSpacing: -0.02, lineHeight: 1.5 },
  appearance: { enableMotion: true, radius: 18 },
  background: { mode: 'solid', imageUrl: '', videoUrl: '', overlayColor: '#080808', overlayOpacity: 0.34 },
  navigation: { sticky: true, showLogin: true, showGetStarted: true, showDemo: true, blur: 18 },
  buttons: { radius: 999, shadow: true, hoverLift: true, uppercase: false },
  homepage: {
    heroHeadline: 'Your AI receptionist for every customer enquiry.',
    heroSubheadline: 'AgentDesk responds instantly, captures and qualifies leads, follows up, books appointments, and hands conversations to your team when a human is needed.',
    heroMinHeight: 760,
    heroAlignment: 'left'
  }
};

const images = {
  hero: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=88',
  story: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=86',
  detail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=86',
  people: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1800&q=86'
};

const normalizeAssetUrl = (raw: string) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const u = new URL(value, window.location.origin);
    const host = u.hostname.toLowerCase();
    const drive = u.pathname.match(/^\/file\/d\/([^/]+)/);
    if ((host === 'drive.google.com' || host === 'docs.google.com') && drive?.[1]) {
      return 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(drive[1]);
    }
    if (host === 'dropbox.com' || host.endsWith('.dropbox.com')) {
      u.searchParams.set('raw', '1');
      return u.toString();
    }
    if (host === 'github.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      const i = parts.indexOf('blob');
      if (i === 2 && parts.length >= 5) {
        return 'https://raw.githubusercontent.com/' + parts[0] + '/' + parts[1] + '/' + parts[3] + '/' + parts.slice(4).join('/');
      }
    }
    return u.toString();
  } catch {
    return value;
  }
};

export const CinematicLandingPage: React.FC<CinematicLandingPageProps> = ({
  onOpenDemo,
  onOpenAuth,
  onOpenDashboard,
  onOpenPricing,
  onWorkspaceCreated,
  onNavigateGetStarted,
  onNavigateLogin,
  onNavigatePlatformLogin
}) => {
  const [design, setDesign] = useState<any>(FALLBACK_DESIGN);
  const [designReady, setDesignReady] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    safeFetchJson<any>('/api/site-design', { cache: 'no-store' })
      .then((data) => {
        if (active && data?.success && data.design) setDesign(data.design);
        if (active) setDesignReady(true);
      })
      .catch(() => {
        if (active) setDesignReady(true);
      });
    return () => { active = false; };
  }, []);

  const primary = design.brand?.primaryColor || FALLBACK_DESIGN.brand.primaryColor;
  const background = design.brand?.backgroundColor || FALLBACK_DESIGN.brand.backgroundColor;
  const text = design.brand?.textColor || FALLBACK_DESIGN.brand.textColor;
  const muted = design.brand?.mutedTextColor || FALLBACK_DESIGN.brand.mutedTextColor;
  const border = design.brand?.borderColor || FALLBACK_DESIGN.brand.borderColor;
  const accent = design.brand?.accentColor || FALLBACK_DESIGN.brand.accentColor;
  const motion = design.appearance?.enableMotion !== false;
  const radius = Number(design.appearance?.radius || 18);
  const configuredImage = normalizeAssetUrl(design.background?.imageUrl || '');
  const configuredVideo = normalizeAssetUrl(design.background?.videoUrl || '');
  const heroImage = configuredImage || images.hero;

  const cssVars = useMemo(() => ({
    '--lux-primary': primary,
    '--lux-accent': accent,
    '--lux-bg': background,
    '--lux-text': text,
    '--lux-muted': muted,
    '--lux-border': border,
    '--lux-radius': `${radius}px`
  }) as React.CSSProperties, [primary, accent, background, text, muted, border, radius]);

  const faqs = [
    ['What exactly does AgentDesk handle?', 'AgentDesk can respond to customer enquiries, capture and qualify leads, organize follow-up, help with bookings, and route conversations to your team when human attention is needed.'],
    ['Is AgentDesk a chatbot?', 'It is broader than a website chatbot. The platform is designed around an AI employee workflow that connects conversations with lead management, follow-up, appointments and your business workspace.'],
    ['Can I use my own business knowledge?', 'Yes. AgentDesk is designed to use your configured business information and knowledge so responses can be grounded in the way your company actually operates.'],
    ['Can I start with a demo?', 'Yes. Use the AI Receptionist demo from this page, or contact the team for a guided walkthrough of the full workspace.']
  ];

  const handleGetStarted = () => {
    if (onNavigateGetStarted) onNavigateGetStarted();
    else onOpenAuth();
  };

  return (
    <main
      className={`min-h-screen overflow-x-hidden bg-[#080808] text-white transition-opacity duration-200 ${designReady ? 'opacity-100' : 'opacity-0'} ${motion ? '' : '[&_*]:!transition-none'}`}
      style={{ ...cssVars, backgroundColor: background, color: text }}
    >
      <style>{`
        .lux-display { font-family: var(--lux-heading-font, Inter, ui-sans-serif, system-ui); letter-spacing: -0.045em; }
        .lux-body { font-family: var(--lux-body-font, Inter, ui-sans-serif, system-ui); }
        .lux-rule { border-color: var(--lux-border); }
        .lux-reveal { animation: luxReveal .9s cubic-bezier(.2,.75,.25,1) both; }
        .lux-float { animation: luxFloat 7s ease-in-out infinite; }
        @keyframes luxReveal { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes luxFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @media (prefers-reduced-motion: reduce) {
          .lux-reveal, .lux-float { animation: none !important; }
          html { scroll-behavior: auto !important; }
        }
      `}</style>

      {design.background?.mode === 'video' && configuredVideo ? (
        <video autoPlay muted loop playsInline aria-hidden="true" className="fixed inset-0 z-0 h-full w-full object-cover opacity-35">
          <source src={configuredVideo} />
        </video>
      ) : null}
      {design.background?.mode === 'image' && configuredImage ? (
        <img src={heroImage} alt="" aria-hidden="true" className="fixed inset-0 z-0 h-full w-full object-cover opacity-20" />
      ) : null}

      <div className="relative z-10 lux-body">
        <nav className="fixed inset-x-0 top-0 z-50 px-4 sm:px-8 pt-4">
          <div
            className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full border px-4 sm:px-6 backdrop-blur-xl"
            style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(8,8,8,.66)' }}
          >
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 cursor-pointer">
              <span className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: primary }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
              </span>
              <span className="text-sm font-semibold tracking-[.18em] uppercase">{design.site?.name || 'AgentDesk'}</span>
            </button>
            <div className="hidden md:flex items-center gap-7 text-[11px] uppercase tracking-[.18em] text-white/60">
              <a href="#experience" className="hover:text-white transition-colors">Experience</a>
              <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
              <a href="#plans" className="hover:text-white transition-colors">Plans</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-2">
              {design.navigation?.showLogin !== false && (
                <button onClick={onNavigateLogin || onOpenAuth} className="hidden sm:inline-flex rounded-full px-4 py-2 text-[11px] uppercase tracking-[.16em] text-white/70 hover:text-white transition-colors cursor-pointer">
                  Sign in
                </button>
              )}
              {design.navigation?.showGetStarted !== false && (
                <button onClick={handleGetStarted} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[.14em] text-black transition-transform hover:-translate-y-0.5 cursor-pointer" style={{ backgroundColor: primary }}>
                  Begin <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </nav>

        <section className="relative min-h-[760px] md:min-h-[88svh] flex items-end pt-28 pb-12 sm:pb-16">
          <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/55 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(255,255,255,.12),transparent_30%)]" />
          <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="max-w-4xl lux-reveal">
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.32em]" style={{ color: primary }}>AI customer operations platform</p>
              <h1 className="lux-display max-w-4xl text-5xl leading-[.94] sm:text-7xl lg:text-[7.5rem] font-semibold">
                {design.homepage?.heroHeadline || FALLBACK_DESIGN.homepage.heroHeadline}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                {design.homepage?.heroSubheadline || FALLBACK_DESIGN.homepage.heroSubheadline}
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <button onClick={handleGetStarted} className="group inline-flex items-center justify-center gap-3 rounded-full px-7 py-4 text-xs font-semibold uppercase tracking-[.18em] text-black cursor-pointer transition-transform hover:-translate-y-1" style={{ backgroundColor: primary }}>
                  Build your AI receptionist
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={onOpenDemo} className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-xs font-semibold uppercase tracking-[.18em] text-white backdrop-blur-md hover:bg-white/10 cursor-pointer">
                  <CirclePlay className="h-4 w-4" /> Experience the receptionist
                </button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[10px] uppercase tracking-[.18em] text-white/50">
                <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Managed AI operations</span>
                <span className="flex items-center gap-2"><Globe2 className="h-3.5 w-3.5" /> Multi-tenant</span>
                <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> Built for response speed</span>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="border-y py-20 sm:py-28" style={{ borderColor: border, backgroundColor: background }}>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-12 lg:gap-24 items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[.32em]" style={{ color: primary }}>The AgentDesk experience</p>
                <h2 className="lux-display mt-5 text-4xl sm:text-6xl font-medium leading-[.98]">Respond to every enquiry, without adding another person to your team.</h2>
              </div>
              <p className="max-w-xl text-sm sm:text-base leading-7" style={{ color: muted }}>
                AgentDesk turns the first moments of a customer conversation into a structured workflow. Respond. Understand intent. Capture the lead. Move the customer forward. Bring in your team when the moment calls for a human.
              </p>
            </div>

            <div className="mt-14 grid lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 relative min-h-[440px] overflow-hidden rounded-[28px]">
                <img src={images.story} alt="Modern workspace" className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-7 sm:p-9 max-w-xl">
                  <span className="text-[10px] uppercase tracking-[.25em] text-white/55">01 / Respond</span>
                  <h3 className="lux-display mt-3 text-3xl sm:text-5xl font-medium">A first impression, every time.</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">Give customers a useful answer before a missed enquiry becomes a missed opportunity.</p>
                </div>
              </div>
              <div className="lg:col-span-5 grid gap-4">
                <div className="rounded-[28px] border p-7 sm:p-9" style={{ borderColor: border, backgroundColor: 'rgba(255,255,255,.035)' }}>
                  <MessageSquare className="h-6 w-6 mb-14" style={{ color: primary }} />
                  <p className="text-[10px] uppercase tracking-[.25em] text-white/40">02 / Qualify</p>
                  <h3 className="lux-display mt-3 text-3xl sm:text-4xl">Turn conversation into context.</h3>
                  <p className="mt-3 text-sm leading-6" style={{ color: muted }}>Capture the details your team needs without forcing every visitor through a form.</p>
                </div>
                <div className="rounded-[28px] border p-7 sm:p-9" style={{ borderColor: border, background: `linear-gradient(135deg, ${primary}22, rgba(255,255,255,.025))` }}>
                  <PhoneCall className="h-6 w-6 mb-14" style={{ color: accent }} />
                  <p className="text-[10px] uppercase tracking-[.25em] text-white/40">03 / Handoff</p>
                  <h3 className="lux-display mt-3 text-3xl sm:text-4xl">Human when it matters.</h3>
                  <p className="mt-3 text-sm leading-6" style={{ color: muted }}>Escalate conversations with the context already captured, instead of starting again from zero.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="py-20 sm:py-28" style={{ backgroundColor: '#0b0b0b' }}>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[.32em]" style={{ color: primary }}>Capabilities</p>
                <h2 className="lux-display mt-4 text-4xl sm:text-6xl font-medium">One system for every customer conversation.</h2>
              </div>
              <button onClick={onOpenDemo} className="inline-flex items-center gap-3 self-start md:self-auto text-[11px] uppercase tracking-[.2em] text-white/65 hover:text-white cursor-pointer">
                See it in action <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-[28px] border" style={{ borderColor: border, backgroundColor: border }}>
              {[
                [Bot, 'AI Receptionist', 'Answer customer questions and keep the conversation moving when your team is busy.'],
                [Users, 'Lead Capture', 'Collect useful customer context and organize it for the people who will close the opportunity.'],
                [Workflow, 'Follow-up', 'Create a consistent path from first enquiry to the next touchpoint.'],
                [Calendar, 'Appointments', 'Help customers move from conversation to scheduled action where calendar workflows are configured.'],
                [PhoneCall, 'Voice', 'Extend the AI employee into supported phone workflows and route to humans when needed.'],
                [ShieldCheck, 'Controlled Operations', 'Keep customer work, tenant data and business configuration separated inside the platform.']
              ].map(([Icon, title, desc], index) => {
                const IconComponent = Icon as React.ElementType;
                return (
                  <div key={String(title)} className="group min-h-[250px] p-7 sm:p-9 transition-colors hover:bg-white/[.045]" style={{ backgroundColor: '#0b0b0b' }}>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] tracking-[.2em] text-white/25">0{index + 1}</span>
                      <IconComponent className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: primary }} />
                    </div>
                    <h3 className="lux-display mt-16 text-2xl font-medium">{String(title)}</h3>
                    <p className="mt-3 text-sm leading-6" style={{ color: muted }}>{String(desc)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y py-20 sm:py-28" style={{ borderColor: border }}>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">
              <div className="relative min-h-[480px] overflow-hidden rounded-[28px]">
                <img src={images.people} alt="Team collaborating" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute left-6 bottom-6 right-6 rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/10"><Sparkles className="h-4 w-4" style={{ color: primary }} /></span>
                    <div>
                      <p className="text-xs font-semibold">AgentDesk workspace</p>
                      <p className="text-[10px] text-white/45">Conversation → lead → follow-up → outcome</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[.32em]" style={{ color: primary }}>Designed around the team</p>
                <h2 className="lux-display mt-5 text-4xl sm:text-6xl font-medium leading-[.98]">Automation should make people better, not invisible.</h2>
                <p className="mt-6 max-w-xl text-sm sm:text-base leading-7" style={{ color: muted }}>
                  AgentDesk is built to take repetitive customer work off the team's plate while preserving a clear human handoff. The goal is not more software. It is a calmer operating rhythm.
                </p>
                <div className="mt-9 grid sm:grid-cols-2 gap-3">
                  {['Always-on first response', 'Structured lead context', 'Consistent follow-up', 'Human escalation paths'].map(item => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs text-white/70" style={{ borderColor: border }}>
                      <Check className="h-4 w-4 shrink-0" style={{ color: primary }} /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="plans" className="py-20 sm:py-28" style={{ backgroundColor: '#0b0b0b' }}>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="text-[10px] uppercase tracking-[.32em]" style={{ color: primary }}>Plans</p>
              <h2 className="lux-display mt-4 text-4xl sm:text-6xl font-medium">Choose the level of attention your operation needs.</h2>
              <p className="mt-5 text-sm leading-6" style={{ color: muted }}>Start with a managed AI employee and expand as your conversation volume and workflows grow.</p>
            </div>
            <div className="mt-12 grid lg:grid-cols-3 gap-4">
              {[
                ['Starter', '₹14,999', '2,000 AI conversations', '250 voice minutes', '500 SMS / WhatsApp'],
                ['Growth', '₹29,999', '7,500 AI conversations', '1,000 voice minutes', '2,500 SMS / WhatsApp'],
                ['Scale', '₹59,999', '20,000 AI conversations', '3,000 voice minutes', '5,000 SMS / WhatsApp']
              ].map(([name, price, a, b, c], index) => (
                <div key={name} className={`rounded-[28px] border p-7 sm:p-9 ${index === 1 ? 'lg:-translate-y-3' : ''}`} style={{ borderColor: index === 1 ? primary : border, background: index === 1 ? `linear-gradient(160deg, ${primary}15, rgba(255,255,255,.025))` : 'rgba(255,255,255,.02)' }}>
                  <p className="text-[10px] uppercase tracking-[.24em] text-white/45">{name}</p>
                  <p className="lux-display mt-6 text-4xl font-medium">{price}<span className="text-sm text-white/35"> / mo</span></p>
                  <div className="mt-7 space-y-3 text-sm text-white/65">
                    {[a, b, c, 'Managed platform operations'].map(item => <div key={item} className="flex gap-3"><Check className="h-4 w-4 shrink-0" style={{ color: primary }} />{item}</div>)}
                  </div>
                  <button onClick={handleGetStarted} className="mt-9 w-full rounded-full border px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[.18em] hover:bg-white/10 cursor-pointer transition-colors" style={{ borderColor: index === 1 ? primary : border }}>
                    Start with {name}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[28px] border p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ borderColor: border }}>
              <div>
                <p className="text-[10px] uppercase tracking-[.24em]" style={{ color: primary }}>Enterprise</p>
                <h3 className="lux-display mt-2 text-2xl sm:text-3xl">Need a tailored operating model?</h3>
                <p className="mt-2 text-sm" style={{ color: muted }}>Custom usage, workflows and deployment requirements.</p>
              </div>
              <button onClick={onOpenPricing || handleGetStarted} className="inline-flex items-center justify-center gap-3 rounded-full px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.18em] text-black cursor-pointer" style={{ backgroundColor: primary }}>
                Explore plans <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t py-20 sm:py-28" style={{ borderColor: border }}>
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[.32em]" style={{ color: primary }}>FAQ</p>
              <h2 className="lux-display mt-4 text-4xl sm:text-6xl font-medium">Before you begin.</h2>
            </div>
            <div className="mt-12 border-t" style={{ borderColor: border }}>
              {faqs.map(([q, a], index) => (
                <div key={q} className="border-b" style={{ borderColor: border }}>
                  <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-6 py-6 text-left cursor-pointer">
                    <span className="text-sm sm:text-base font-medium">{q}</span>
                    {openFaq === index ? <ChevronUp className="h-4 w-4 shrink-0 text-white/45" /> : <ChevronDown className="h-4 w-4 shrink-0 text-white/45" />}
                  </button>
                  {openFaq === index ? <div className="pb-6 pr-8 text-sm leading-6" style={{ color: muted }}>{a}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y py-24 sm:py-36" style={{ borderColor: border }}>
          <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at 50% 45%, ${primary}, transparent 35%)` }} />
          <div className="relative mx-auto max-w-5xl px-5 sm:px-8 text-center">
            <p className="text-[10px] uppercase tracking-[.35em]" style={{ color: primary }}>The next conversation</p>
            <h2 className="lux-display mt-5 text-5xl sm:text-7xl lg:text-[7rem] leading-[.9] font-medium">Let the desk answer first.</h2>
            <p className="mx-auto mt-7 max-w-2xl text-sm sm:text-base leading-7" style={{ color: muted }}>Build an AI employee that fits your business, your workflow and your standards.</p>
            <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
              <button onClick={handleGetStarted} className="inline-flex items-center justify-center gap-3 rounded-full px-7 py-4 text-xs font-semibold uppercase tracking-[.18em] text-black cursor-pointer hover:-translate-y-1 transition-transform" style={{ backgroundColor: primary }}>
                Begin with AgentDesk <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={onOpenDemo} className="inline-flex items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-xs font-semibold uppercase tracking-[.18em] cursor-pointer hover:bg-white/10">
                <CirclePlay className="h-4 w-4" /> Try the demo
              </button>
            </div>
          </div>
        </section>

        <footer className="px-5 sm:px-8 py-10" style={{ backgroundColor: '#050505' }}>
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border" style={{ borderColor: primary }}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} /></span>
                <span className="text-sm font-semibold tracking-[.18em] uppercase">{design.site?.name || 'AgentDesk'}</span>
              </div>
              <p className="mt-3 text-xs text-white/35">AI employee platform for customer conversations.</p>
            </div>
            <div className="flex flex-wrap gap-5 text-[10px] uppercase tracking-[.18em] text-white/35">
              <button onClick={onNavigatePlatformLogin || onOpenAuth} className="hover:text-white cursor-pointer">Platform</button>
              <button onClick={onOpenPricing || handleGetStarted} className="hover:text-white cursor-pointer">Pricing</button>
              <button onClick={onOpenDemo} className="hover:text-white cursor-pointer">Demo</button>
              <span>© {new Date().getFullYear()} AgentDesk</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default CinematicLandingPage;
