import React, { useEffect, useState } from 'react';
import {
  Eye, RotateCcw, Save, Sparkles, Monitor, Smartphone, Tablet,
  ChevronUp, ChevronDown, Palette, Type, Layers, Image as ImageIcon,
  MousePointer2, Navigation, LayoutTemplate
} from 'lucide-react';
import { safeFetchJson } from '../lib/apiClient';

type Design = any;

const DEFAULT: Design = {
  version: 2,
  site: { name: 'AgentDesk', publicDomain: '', logoUrl: '', faviconUrl: '', pageTitle: 'AgentDesk', pageDescription: '' },
  brand: {
    primaryColor: '#2563EB', secondaryColor: '#0F172A', accentColor: '#7C3AED',
    backgroundColor: '#020617', surfaceColor: '#0F172A', textColor: '#F8FAFC',
    mutedTextColor: '#94A3B8', borderColor: '#1E293B', successColor: '#22C55E', dangerColor: '#EF4444'
  },
  typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: 16, headingWeight: 700, letterSpacing: -0.02, lineHeight: 1.5 },
  appearance: { theme: 'dark', radius: 18, shadow: 'medium', material: 'glass', glassBlur: 18, glassOpacity: 0.62, glassSaturation: 150, animationSpeed: 1, enableMotion: true },
  background: { mode: 'aurora', imageUrl: '', videoUrl: '', overlayColor: '#020617', overlayOpacity: 0.32, gradientStart: '#2563EB', gradientEnd: '#7C3AED', gradientAngle: 135 },
  navigation: { style: 'glass', sticky: true, showLogin: true, showGetStarted: true, showDemo: true, blur: 18 },
  buttons: { style: 'gradient', radius: 16, shadow: true, hoverLift: true, uppercase: false },
  icons: { style: 'outline', size: 20, strokeWidth: 1.8, color: '#60A5FA', opacity: 1, container: true, containerRadius: 12 },
  homepage: {
    heroHeadline: 'Your AI employee for every customer conversation.',
    heroSubheadline: 'Let AgentDesk handle the first response, capture the enquiry, qualify the lead, and keep follow-up moving.',
    showPosterProcess: true, showBenefits: true, showIntegrations: true, showPricing: true, showFaq: true,
    showDashboardPreview: true, showProblem: true, showTrustBar: true,
    sectionOrder: ['hero', 'problem', 'poster', 'dashboard', 'benefits', 'integrations', 'pricing', 'faq'],
    heroAlignment: 'center', heroMinHeight: 720, heroBackgroundMode: 'aurora'
  },
  pages: {
    dashboard: { backgroundColor: '#020617', surfaceColor: '#0F172A', radius: 18, density: 'comfortable' },
    login: { backgroundColor: '#020617', surfaceColor: '#0F172A', showLogo: true },
    pricing: { backgroundColor: '#020617', surfaceColor: '#0F172A', cardRadius: 22, highlightColor: '#2563EB' },
    public: { maxWidth: 1200, pagePadding: 24 }
  }
};

const FONTS = ['Inter', 'system-ui', 'Arial', 'Helvetica', 'Georgia', 'Trebuchet MS', 'Verdana'];
const TABS: Array<[string, any, string]> = [
  ['theme', Palette, 'Theme'], ['background', ImageIcon, 'Background'],
  ['type', Type, 'Typography'], ['nav', Navigation, 'Navigation'],
  ['buttons', MousePointer2, 'Buttons'], ['icons', Sparkles, 'Icons'],
  ['pages', LayoutTemplate, 'Pages'], ['homepage', Layers, 'Homepage']
];

const clone = (value: any) => JSON.parse(JSON.stringify(value));

const normalizeAssetUrl = (raw: string) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    const host = url.hostname.toLowerCase();
    const drive = url.pathname.match(/^\/file\/d\/([^/]+)/);
    if ((host === 'drive.google.com' || host === 'docs.google.com') && drive?.[1]) {
      return 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(drive[1]);
    }
    if (host === 'dropbox.com' || host.endsWith('.dropbox.com')) {
      url.searchParams.set('raw', '1');
      return url.toString();
    }
    if (host === 'github.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      const index = parts.indexOf('blob');
      if (index === 2 && parts.length >= 5) {
        return 'https://raw.githubusercontent.com/' + parts[0] + '/' + parts[1] + '/' + parts[3] + '/' + parts.slice(4).join('/');
      }
    }
    return url.toString();
  } catch {
    return value;
  }
};

export const DesignStudio: React.FC = () => {
  const [design, setDesign] = useState<Design>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('theme');
  const [device, setDevice] = useState('desktop');

  useEffect(() => {
    safeFetchJson('/api/site-design')
      .then((result: any) => {
        if (result.success && result.design) setDesign(result.design);
      })
      .catch((e: any) => setError(e?.message || 'Could not load design.'))
      .finally(() => setLoading(false));
  }, []);

  const update = (path: string[], value: any) => {
    setDesign((current: Design) => {
      const next = clone(current);
      let target = next;
      path.slice(0, -1).forEach((key) => { target = target[key]; });
      target[path[path.length - 1]] = value;
      return next;
    });
    setSaved(false);
  };

  const publish = async () => {
    setBusy(true);
    setError('');
    try {
      const result: any = await safeFetchJson('/api/site-design', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design)
      });
      if (!result.success) throw new Error(result.error?.message || result.message || 'Publish failed.');
      setDesign(result.design || design);
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Publish failed.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset the Visual Studio design?')) return;
    setBusy(true);
    setError('');
    try {
      const result: any = await safeFetchJson('/api/site-design/reset', { method: 'POST' });
      if (!result.success) throw new Error(result.error?.message || result.message || 'Reset failed.');
      setDesign(result.design || DEFAULT);
    } catch (e: any) {
      setError(e?.message || 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Image must be smaller than 12 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || '');
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1600 / image.width, 1000 / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          setError('Could not prepare image.');
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/webp', 0.82);
        if (compressed.length > 1200000) {
          setError('Image is still too large. Choose a smaller image.');
          return;
        }
        update(['background', 'imageUrl'], compressed);
        update(['background', 'mode'], 'image');
      };
      image.onerror = () => setError('Could not read image.');
      image.src = source;
    };
    reader.onerror = () => setError('Could not read image.');
    reader.readAsDataURL(file);
  };

  const moveSection = (index: number, direction: number) => {
    const sections = [...design.homepage.sectionOrder];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    [sections[index], sections[nextIndex]] = [sections[nextIndex], sections[index]];
    update(['homepage', 'sectionOrder'], sections);
  };

  if (loading) return <div className="p-8 text-slate-400">Loading Visual Studio...</div>;

  const background = design.background.mode === 'gradient'
    ? 'linear-gradient(' + design.background.gradientAngle + 'deg,' + design.background.gradientStart + ',' + design.background.gradientEnd + ')'
    : design.background.mode === 'glass'
      ? 'radial-gradient(circle at 20% 10%,rgba(37,99,235,.35),transparent 40%),radial-gradient(circle at 80% 20%,rgba(124,58,237,.3),transparent 40%)'
      : design.background.mode === 'aurora'
        ? 'radial-gradient(circle at 20% 20%,rgba(37,99,235,.42),transparent 35%),radial-gradient(circle at 80% 10%,rgba(124,58,237,.35),transparent 38%),' + design.brand.backgroundColor
        : design.brand.backgroundColor;

  return (
    <div className="min-h-full bg-[#05070c] text-white flex flex-col">
      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between px-5 sticky top-0 z-30">
        <div>
          <div className="text-[10px] tracking-[.25em] font-black text-blue-400">AGENTDESK CONTROL CENTER</div>
          <div className="font-black text-lg">Visual Studio</div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          <DeviceButton active={device === 'desktop'} onClick={() => setDevice('desktop')} icon={<Monitor className="w-4 h-4" />} />
          <DeviceButton active={device === 'tablet'} onClick={() => setDevice('tablet')} icon={<Tablet className="w-4 h-4" />} />
          <DeviceButton active={device === 'mobile'} onClick={() => setDevice('mobile')} icon={<Smartphone className="w-4 h-4" />} />
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={reset} disabled={busy} className="p-2 rounded-xl border border-white/10 disabled:opacity-40">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" onClick={publish} disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex gap-2 items-center">
            <Save className="w-4 h-4" />
            {busy ? 'Saving...' : saved ? 'Published' : 'Publish'}
          </button>
        </div>
      </header>

      {error ? <div className="mx-5 mt-3 rounded-xl border border-red-500/30 bg-red-950/70 px-4 py-3 text-xs text-red-200">{error}</div> : null}

      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 border-r border-white/10 bg-[#090b11] p-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-2 mb-2">Design system</div>
          {TABS.map(([id, Icon, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              className={'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm mb-1 ' + (tab === id ? 'bg-blue-600/15 text-blue-300 border border-blue-500/20' : 'text-slate-400 hover:bg-white/5')}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </aside>

        <section className="w-[360px] shrink-0 border-r border-white/10 bg-[#0b0e15] p-4 overflow-y-auto">
          <h2 className="font-black text-lg mb-4">{tab === 'theme' ? 'Theme & Material' : tab === 'background' ? 'Background & Motion' : tab === 'type' ? 'Typography' : tab === 'nav' ? 'Navigation' : tab === 'buttons' ? 'Buttons' : tab === 'icons' ? 'Icon System' : tab === 'pages' ? 'All Pages' : 'Homepage Builder'}</h2>

          {tab === 'theme' && (
            <>
              {Object.keys(design.brand).map((key) => (
                <ColorControl key={key} label={key.replace(/([A-Z])/g, ' $1')} value={design.brand[key]} onChange={(value) => update(['brand', key], value)} />
              ))}
              <SelectControl label="Material" value={design.appearance.material} options={['solid', 'glass', 'soft-glass', 'frosted', 'transparent', 'elevated']} onChange={(value) => update(['appearance', 'material'], value)} />
              <RangeControl label="Corner radius" value={design.appearance.radius} min={0} max={40} onChange={(value) => update(['appearance', 'radius'], value)} />
              <RangeControl label="Glass blur" value={design.appearance.glassBlur} min={0} max={40} onChange={(value) => update(['appearance', 'glassBlur'], value)} />
              <ToggleControl label="Motion & animations" value={design.appearance.enableMotion} onChange={(value) => update(['appearance', 'enableMotion'], value)} />
            </>
          )}

          {tab === 'background' && (
            <>
              <SelectControl label="Background mode" value={design.background.mode} options={['solid', 'gradient', 'image', 'video', 'aurora', 'particles', 'shapes', 'glass']} onChange={(value) => update(['background', 'mode'], value)} />
              <label className="block text-xs text-slate-400 mb-3">
                Background image
                <label className="mt-1 flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl border border-dashed border-white/15 bg-white/5 hover:bg-white/10 cursor-pointer text-xs text-slate-300">
                  <ImageIcon className="w-4 h-4" />
                  Upload image
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file); event.currentTarget.value = ''; }} />
                </label>
              </label>
              <InputControl label="Image URL" value={design.background.imageUrl?.startsWith('data:image/') ? '' : design.background.imageUrl} onChange={(value) => update(['background', 'imageUrl'], value)} />
              <InputControl label="Video URL" value={design.background.videoUrl} onChange={(value) => update(['background', 'videoUrl'], value)} />
              <ColorControl label="Gradient start" value={design.background.gradientStart} onChange={(value) => update(['background', 'gradientStart'], value)} />
              <ColorControl label="Gradient end" value={design.background.gradientEnd} onChange={(value) => update(['background', 'gradientEnd'], value)} />
              <RangeControl label="Overlay opacity" value={design.background.overlayOpacity} min={0} max={1} step={0.05} onChange={(value) => update(['background', 'overlayOpacity'], value)} />
            </>
          )}

          {tab === 'type' && (
            <>
              <SelectControl label="Heading font" value={design.typography.headingFont} options={FONTS} onChange={(value) => update(['typography', 'headingFont'], value)} />
              <SelectControl label="Body font" value={design.typography.bodyFont} options={FONTS} onChange={(value) => update(['typography', 'bodyFont'], value)} />
              <RangeControl label="Base size" value={design.typography.baseSize} min={12} max={24} onChange={(value) => update(['typography', 'baseSize'], value)} />
              <RangeControl label="Heading weight" value={design.typography.headingWeight} min={400} max={900} step={100} onChange={(value) => update(['typography', 'headingWeight'], value)} />
              <RangeControl label="Line height" value={design.typography.lineHeight} min={1} max={2.2} step={0.1} onChange={(value) => update(['typography', 'lineHeight'], value)} />
            </>
          )}

          {tab === 'nav' && (
            <>
              <SelectControl label="Navigation style" value={design.navigation.style} options={['minimal', 'floating', 'glass', 'solid']} onChange={(value) => update(['navigation', 'style'], value)} />
              <ToggleControl label="Sticky navigation" value={design.navigation.sticky} onChange={(value) => update(['navigation', 'sticky'], value)} />
              <ToggleControl label="Show Sign In" value={design.navigation.showLogin} onChange={(value) => update(['navigation', 'showLogin'], value)} />
              <ToggleControl label="Show Get Started" value={design.navigation.showGetStarted} onChange={(value) => update(['navigation', 'showGetStarted'], value)} />
              <ToggleControl label="Show Demo" value={design.navigation.showDemo} onChange={(value) => update(['navigation', 'showDemo'], value)} />
            </>
          )}

          {tab === 'buttons' && (
            <>
              <SelectControl label="Button style" value={design.buttons.style} options={['solid', 'gradient', 'glass', 'outline', 'ghost', 'pill']} onChange={(value) => update(['buttons', 'style'], value)} />
              <RangeControl label="Button radius" value={design.buttons.radius} min={0} max={40} onChange={(value) => update(['buttons', 'radius'], value)} />
              <ToggleControl label="Button shadow" value={design.buttons.shadow} onChange={(value) => update(['buttons', 'shadow'], value)} />
              <ToggleControl label="Hover lift" value={design.buttons.hoverLift} onChange={(value) => update(['buttons', 'hoverLift'], value)} />
              <ToggleControl label="Uppercase labels" value={design.buttons.uppercase} onChange={(value) => update(['buttons', 'uppercase'], value)} />
            </>
          )}

          {tab === 'icons' && (
            <>
              <SelectControl label="Icon theme" value={design.icons.style} options={['filled', 'outline', 'duotone', 'minimal']} onChange={(value) => update(['icons', 'style'], value)} />
              <RangeControl label="Icon size" value={design.icons.size} min={12} max={64} onChange={(value) => update(['icons', 'size'], value)} />
              <RangeControl label="Stroke width" value={design.icons.strokeWidth} min={0.5} max={4} step={0.1} onChange={(value) => update(['icons', 'strokeWidth'], value)} />
              <ColorControl label="Icon color" value={design.icons.color} onChange={(value) => update(['icons', 'color'], value)} />
            </>
          )}

          {tab === 'pages' && (
            <>
              <ColorControl label="Dashboard background" value={design.pages.dashboard.backgroundColor} onChange={(value) => update(['pages', 'dashboard', 'backgroundColor'], value)} />
              <ColorControl label="Dashboard surface" value={design.pages.dashboard.surfaceColor} onChange={(value) => update(['pages', 'dashboard', 'surfaceColor'], value)} />
              <SelectControl label="Dashboard density" value={design.pages.dashboard.density} options={['compact', 'comfortable', 'spacious']} onChange={(value) => update(['pages', 'dashboard', 'density'], value)} />
              <ColorControl label="Login background" value={design.pages.login.backgroundColor} onChange={(value) => update(['pages', 'login', 'backgroundColor'], value)} />
              <ColorControl label="Login surface" value={design.pages.login.surfaceColor} onChange={(value) => update(['pages', 'login', 'surfaceColor'], value)} />
              <ColorControl label="Pricing highlight" value={design.pages.pricing.highlightColor} onChange={(value) => update(['pages', 'pricing', 'highlightColor'], value)} />
            </>
          )}

          {tab === 'homepage' && (
            <>
              <InputControl label="Hero headline" value={design.homepage.heroHeadline} onChange={(value) => update(['homepage', 'heroHeadline'], value)} />
              <InputControl label="Hero subheadline" value={design.homepage.heroSubheadline} onChange={(value) => update(['homepage', 'heroSubheadline'], value)} />
              <SelectControl label="Hero alignment" value={design.homepage.heroAlignment} options={['left', 'center', 'right']} onChange={(value) => update(['homepage', 'heroAlignment'], value)} />
              <RangeControl label="Hero height" value={design.homepage.heroMinHeight} min={420} max={1000} onChange={(value) => update(['homepage', 'heroMinHeight'], value)} />
              <div className="text-xs font-bold mt-5 mb-2">Section order</div>
              {design.homepage.sectionOrder.map((section: string, index: number) => (
                <div key={section} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 mb-1">
                  <span className="text-xs flex-1 capitalize">{section}</span>
                  <button type="button" onClick={() => moveSection(index, -1)} className="p-1"><ChevronUp className="w-3 h-3" /></button>
                  <button type="button" onClick={() => moveSection(index, 1)} className="p-1"><ChevronDown className="w-3 h-3" /></button>
                </div>
              ))}
              <ToggleControl label="Show problem" value={design.homepage.showProblem} onChange={(value) => update(['homepage', 'showProblem'], value)} />
              <ToggleControl label="Show process" value={design.homepage.showPosterProcess} onChange={(value) => update(['homepage', 'showPosterProcess'], value)} />
              <ToggleControl label="Show benefits" value={design.homepage.showBenefits} onChange={(value) => update(['homepage', 'showBenefits'], value)} />
              <ToggleControl label="Show integrations" value={design.homepage.showIntegrations} onChange={(value) => update(['homepage', 'showIntegrations'], value)} />
              <ToggleControl label="Show pricing" value={design.homepage.showPricing} onChange={(value) => update(['homepage', 'showPricing'], value)} />
              <ToggleControl label="Show FAQ" value={design.homepage.showFaq} onChange={(value) => update(['homepage', 'showFaq'], value)} />
            </>
          )}
        </section>

        <main className="flex-1 p-5 overflow-auto bg-[#11141b]">
          <div className="flex justify-center">
            <div className={device === 'desktop' ? 'w-full max-w-[1200px]' : device === 'tablet' ? 'w-[768px] max-w-full' : 'w-[390px] max-w-full'}>
              <div
                style={{ background, borderRadius: design.appearance.radius, minHeight: design.homepage.heroMinHeight, color: design.brand.textColor, fontFamily: design.typography.bodyFont }}
                className="relative overflow-hidden shadow-2xl"
              >
                {design.background.mode === 'image' && design.background.imageUrl ? (
                  <img src={normalizeAssetUrl(design.background.imageUrl)} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
                ) : null}
                {design.background.mode === 'video' && design.background.videoUrl ? (
                  <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-70">
                    <source src={normalizeAssetUrl(design.background.videoUrl)} />
                  </video>
                ) : null}
                <div className="relative z-10 p-5">
                  <div style={{ backdropFilter: 'blur(' + design.navigation.blur + 'px)', background: 'rgba(255,255,255,.07)', borderRadius: design.appearance.radius }} className="h-14 px-4 flex items-center justify-between border border-white/10">
                    <div className="font-black">{design.site.name}</div>
                    <button type="button" style={{ background: design.brand.primaryColor, borderRadius: design.buttons.radius }} className="px-3 py-2 text-white text-xs">Get Started</button>
                  </div>
                  <section style={{ minHeight: Math.min(design.homepage.heroMinHeight, 650), textAlign: design.homepage.heroAlignment }} className="flex flex-col justify-center py-16 px-6">
                    <div className="inline-flex self-center gap-2 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                      <Sparkles style={{ color: design.icons.color }} className="w-3 h-3" /> AI EMPLOYEE PLATFORM
                    </div>
                    <h1 style={{ fontFamily: design.typography.headingFont, fontWeight: design.typography.headingWeight, letterSpacing: design.typography.letterSpacing + 'em' }} className="text-5xl md:text-7xl mt-6 leading-tight">
                      {design.homepage.heroHeadline}
                    </h1>
                    <p style={{ fontSize: design.typography.baseSize, lineHeight: design.typography.lineHeight }} className="max-w-2xl mt-5 text-white/65 mx-auto">
                      {design.homepage.heroSubheadline}
                    </p>
                    <div className="flex justify-center gap-3 mt-8">
                      <button type="button" style={{ background: design.brand.primaryColor, borderRadius: design.buttons.radius }} className="px-5 py-3 text-sm font-bold text-white">Get Started</button>
                      <button type="button" style={{ borderRadius: design.buttons.radius }} className="px-5 py-3 text-sm font-bold border border-white/15 bg-white/5">View Demo</button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const DeviceButton = ({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) => (
  <button type="button" onClick={onClick} className={'p-2 rounded-lg ' + (active ? 'bg-white/10 text-white' : 'text-slate-500')}>
    {icon}
  </button>
);

const InputControl = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="block text-xs text-slate-400 mb-3">
    {label}
    <input value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
  </label>
);

const ColorControl = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="flex items-center justify-between text-xs text-slate-400 mb-3">
    {label}
    <input type="color" value={value || '#000000'} onChange={(event) => onChange(event.target.value)} className="w-10 h-8 bg-transparent" />
  </label>
);

const SelectControl = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) => (
  <label className="block text-xs text-slate-400 mb-3">
    {label}
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const RangeControl = ({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) => (
  <label className="block text-xs text-slate-400 mb-3">
    {label}
    <div className="flex gap-2 items-center">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full" />
      <span className="w-12 text-right text-white">{Number(value).toFixed(step < 1 ? 2 : 0)}</span>
    </div>
  </label>
);

const ToggleControl = ({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center justify-between py-2 text-xs text-slate-300">
    {label}
    <button type="button" onClick={() => onChange(!value)} className={'w-10 h-6 rounded-full p-1 transition ' + (value ? 'bg-blue-600' : 'bg-white/10')}>
      <span className={'block w-4 h-4 rounded-full bg-white transition ' + (value ? 'translate-x-4' : '')} />
    </button>
  </label>
);
