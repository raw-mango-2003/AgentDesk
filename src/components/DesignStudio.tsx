import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, RotateCcw, Save, Sparkles } from 'lucide-react';
import { safeFetchJson } from '../lib/apiClient';

type Design = {
  version: 1;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: number;
    headingWeight: number;
  };
  homepage: {
    heroHeadline: string;
    heroSubheadline: string;
    showPosterProcess: boolean;
    showBenefits: boolean;
    showIntegrations: boolean;
    showPricing: boolean;
    showFaq: boolean;
    sectionOrder: string[];
  };
};

const DEFAULT_DESIGN: Design = {
  version: 1,
  brand: {
    primaryColor: '#2563EB',
    secondaryColor: '#0F172A',
    accentColor: '#7C3AED',
    backgroundColor: '#020617',
    textColor: '#F8FAFC'
  },
  typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: 16, headingWeight: 700 },
  homepage: {
    heroHeadline: 'Your AI employee for the moments that matter.',
    heroSubheadline: 'Respond, qualify, follow up and hand off customer conversations without adding another full-time employee.',
    showPosterProcess: false,
    showBenefits: true,
    showIntegrations: true,
    showPricing: true,
    showFaq: true,
    sectionOrder: ['hero', 'benefits', 'integrations', 'pricing', 'faq']
  }
};

const FONT_OPTIONS = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Trebuchet MS', 'Verdana', 'system-ui'];

export const DesignStudio: React.FC = () => {
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeFetchJson('/api/site-design').then((res: any) => {
      if (res.success && res.design) setDesign(res.design);
    }).finally(() => setLoading(false));
  }, []);

  const update = (path: string[], value: any) => {
    setDesign(prev => {
      const next: any = structuredClone(prev);
      let cursor = next;
      for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]];
      cursor[path[path.length - 1]] = value;
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    const res: any = await safeFetchJson('/api/site-design', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(design)
    });
    if (res.success) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    }
  };

  const reset = async () => {
    const res: any = await safeFetchJson('/api/site-design/reset', { method: 'POST' });
    if (res.success) setDesign(res.design || DEFAULT_DESIGN);
  };

  const previewStyle = useMemo(() => ({
    background: design.brand.backgroundColor,
    color: design.brand.textColor,
    fontFamily: design.typography.bodyFont,
    '--ad-primary': design.brand.primaryColor,
    '--ad-accent': design.brand.accentColor
  } as React.CSSProperties), [design]);

  if (loading) return <div className="p-8 text-slate-400">Loading Design Studio...</div>;

  return (
    <div className="min-h-full bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto grid xl:grid-cols-[360px_1fr] gap-6">
        <aside className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-5 h-fit sticky top-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-black">UI / UX CONTROL</div>
            <h1 className="text-2xl font-black mt-2">Homepage Studio</h1>
            <p className="text-xs text-slate-400 mt-2">Edit the public homepage without touching React components. Changes are stored as design data and applied at runtime.</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Brand</h2>
            {(['primaryColor','secondaryColor','accentColor','backgroundColor','textColor'] as const).map(key => (
              <label key={key} className="flex items-center justify-between gap-3 text-xs text-slate-300">
                <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                <input type="color" value={design.brand[key]} onChange={e => update(['brand', key], e.target.value)} className="w-10 h-8 rounded border border-slate-700 bg-transparent cursor-pointer" />
              </label>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Typography</h2>
            <select value={design.typography.headingFont} onChange={e => update(['typography','headingFont'],e.target.value)} className="w-full rounded-xl bg-slate-800 border-slate-700 text-white text-sm">
              {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
            </select>
            <select value={design.typography.bodyFont} onChange={e => update(['typography','bodyFont'],e.target.value)} className="w-full rounded-xl bg-slate-800 border-slate-700 text-white text-sm">
              {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
            </select>
            <label className="text-xs text-slate-400 block">Base size
              <input type="range" min="12" max="24" value={design.typography.baseSize} onChange={e => update(['typography','baseSize'],Number(e.target.value))} className="w-full mt-2" />
            </label>
            <label className="text-xs text-slate-400 block">Heading weight
              <input type="range" min="400" max="900" step="100" value={design.typography.headingWeight} onChange={e => update(['typography','headingWeight'],Number(e.target.value))} className="w-full mt-2" />
            </label>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Hero copy</h2>
            <input value={design.homepage.heroHeadline} onChange={e => update(['homepage','heroHeadline'],e.target.value)} className="w-full rounded-xl bg-slate-800 border-slate-700 text-white text-sm" />
            <textarea value={design.homepage.heroSubheadline} onChange={e => update(['homepage','heroSubheadline'],e.target.value)} rows={4} className="w-full rounded-xl bg-slate-800 border-slate-700 text-white text-sm" />
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Sections</h2>
            {([
              ['showPosterProcess','Poster process'],
              ['showBenefits','Benefits'],
              ['showIntegrations','Integrations'],
              ['showPricing','Pricing'],
              ['showFaq','FAQ']
            ] as const).map(([key,label]) => (
              <label key={key} className="flex items-center justify-between py-1.5 text-sm text-slate-300">
                {label}
                <input type="checkbox" checked={design.homepage[key]} onChange={e => update(['homepage',key],e.target.checked)} />
              </label>
            ))}
          </section>

          <div className="flex gap-2 pt-2">
            <button onClick={save} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-bold flex items-center justify-center gap-2">
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saved ? 'Saved' : 'Publish'}
            </button>
            <button onClick={reset} title="Reset" className="rounded-xl border border-slate-700 px-3 hover:bg-slate-800"><RotateCcw className="w-4 h-4" /></button>
          </div>
        </aside>

        <main className="space-y-4">
          <div className="flex items-center justify-between">
            <div><div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Live canvas</div><div className="text-lg font-bold">Homepage preview</div></div>
            <div className="flex items-center gap-2 text-xs text-slate-400"><Eye className="w-4 h-4" /> Runtime preview</div>
          </div>

          <div style={previewStyle} className="min-h-[680px] rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl">
            <div className="px-8 py-7 flex items-center justify-between border-b border-white/10">
              <div className="font-black tracking-tight">AGENTDESK</div>
              <div className="text-xs opacity-70">AI EMPLOYEE PLATFORM</div>
            </div>
            <section className="px-8 md:px-16 py-20 text-center">
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border border-white/15" style={{color:'var(--ad-primary)'}}>
                <Sparkles className="w-3 h-3" /> BUILT FOR BUSINESS
              </div>
              <h2 style={{fontFamily: design.typography.headingFont, fontWeight: design.typography.headingWeight}} className="text-5xl md:text-7xl tracking-tight mt-7">
                {design.homepage.heroHeadline}
              </h2>
              <p className="max-w-2xl mx-auto mt-6 opacity-75" style={{fontSize: design.typography.baseSize}}>
                {design.homepage.heroSubheadline}
              </p>
              <button className="mt-8 px-6 py-3 rounded-2xl font-bold text-white" style={{background: design.brand.primaryColor}}>See AgentDesk</button>
            </section>

            {design.homepage.showPosterProcess && (
              <section className="mx-8 mb-8 p-8 rounded-3xl border border-white/10 bg-white/5">
                <div className="text-xs uppercase tracking-wider opacity-60">Process</div>
                <div className="grid grid-cols-4 gap-3 mt-4 text-center text-sm"><div>Lead</div><div>AI Employee</div><div>Qualify</div><div>Human</div></div>
              </section>
            )}

            {design.homepage.showBenefits && (
              <section className="grid md:grid-cols-3 gap-3 px-8 pb-8">
                {['Faster response','Less repetition','Smarter handoff'].map(x => <div key={x} className="p-5 rounded-2xl border border-white/10 bg-white/5"><div className="font-bold">{x}</div><div className="text-xs opacity-60 mt-2">Designed around your workflow.</div></div>)}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
