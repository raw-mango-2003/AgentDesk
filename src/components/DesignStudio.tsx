import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ChevronDown, Eye,
  Image as ImageIcon, Layers3, Monitor, MousePointer2, Palette, Plus, Redo2,
  RotateCcw, Save, Smartphone, Square, Tablet, Trash2, Type, Undo2, Upload,
  LayoutTemplate, Move, Settings2
} from 'lucide-react';
import { safeFetchJson } from '../lib/apiClient';

type Design = any;
type Target = { kind: 'section' | 'element'; id: string };

const DEFAULT: Design = {
  version: 2,
  site: { name: 'AgentDesk', publicDomain: '', logoUrl: '', faviconUrl: '', pageTitle: 'AgentDesk', pageDescription: '' },
  brand: { primaryColor: '#FF2F86', secondaryColor: '#0B0B0E', accentColor: '#FF5AA5', backgroundColor: '#070709', surfaceColor: '#101014', textColor: '#F7F3F7', mutedTextColor: '#9A97A1', borderColor: '#26232B', successColor: '#4ADE80', dangerColor: '#FB7185' },
  typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: 16, headingWeight: 700, letterSpacing: -0.02, lineHeight: 1.5 },
  appearance: { theme: 'dark', radius: 14, shadow: 'medium', material: 'elevated', glassBlur: 16, glassOpacity: 0.82, glassSaturation: 130, animationSpeed: 1, enableMotion: true },
  background: { mode: 'gradient', imageUrl: '', videoUrl: '', overlayColor: '#070709', overlayOpacity: 0.55, gradientStart: '#0B0B0E', gradientEnd: '#1A0A14', gradientAngle: 135 },
  navigation: { style: 'solid', sticky: true, showLogin: true, showGetStarted: true, showDemo: true, blur: 16 },
  buttons: { style: 'solid', radius: 12, shadow: true, hoverLift: true, uppercase: false },
  icons: { style: 'outline', size: 20, strokeWidth: 1.8, color: '#FF5AA5', opacity: 1, container: true, containerRadius: 10 },
  homepage: {
    heroHeadline: 'Your AI employee for every customer conversation.',
    heroSubheadline: 'Let AgentDesk handle the first response, capture the enquiry, qualify the lead, and keep follow-up moving.',
    showPosterProcess: true, showBenefits: true, showIntegrations: true, showPricing: true, showFaq: true,
    showDashboardPreview: true, showProblem: true, showTrustBar: true,
    sectionOrder: ['hero', 'problem', 'poster', 'dashboard', 'benefits', 'pricing', 'cta', 'faq', 'footer'],
    heroAlignment: 'left', heroMinHeight: 720, heroBackgroundMode: 'gradient'
  },
  pages: {
    dashboard: { backgroundColor: '#070709', surfaceColor: '#101014', radius: 14, density: 'comfortable' },
    login: { backgroundColor: '#070709', surfaceColor: '#101014', showLogo: true },
    pricing: { backgroundColor: '#070709', surfaceColor: '#101014', cardRadius: 18, highlightColor: '#FF2F86' },
    public: { maxWidth: 1200, pagePadding: 24 }
  }
};

const clone = (v: any) => JSON.parse(JSON.stringify(v));
const uid = (prefix: string) => prefix + '_' + Math.random().toString(36).slice(2, 9);

const PAGE_DEFS = [
  ['home', 'Homepage'], ['pricing', 'Pricing'], ['login', 'Login'], ['dashboard', 'Dashboard'],
  ['voice', 'Voice Receptionist'], ['missed-call', 'Missed Call Text Back'], ['leads', 'Leads'],
  ['crm', 'CRM'], ['follow-up', 'Follow Up'], ['re-engagement', 'Re-engagement'], ['reviews', 'Reviews'],
  ['appointments', 'Appointments'], ['estimates', 'Estimates'], ['cold-outreach', 'Cold Outreach'],
  ['integrations', 'Integrations'], ['knowledge-base', 'Knowledge Base'], ['conversations', 'Conversations'],
  ['billing', 'Billing & Usage'], ['localization', 'Localization'], ['embed', 'Deploy & Embed'], ['account-credentials', 'Account & Credentials'],
  ['platform-admin', 'Platform Admin']
] as const;

const SECTION_COPY: Record<string, { title: string; body: string }> = {
  hero: { title: 'Make every customer enquiry count.', body: 'Give your team a single operating layer for conversations, leads and follow-up.' },
  problem: { title: 'Stop losing enquiries.', body: 'Turn missed calls, slow replies and scattered conversations into a consistent customer experience.' },
  poster: { title: 'From first contact to booked work.', body: 'Capture the enquiry, qualify the opportunity and keep the next action moving.' },
  dashboard: { title: 'See customer operations clearly.', body: 'Bring calls, leads, follow-ups and outcomes into one workspace.' },
  benefits: { title: 'Built around the work that matters.', body: 'Automate repetitive customer operations while keeping your team in control.' },
  pricing: { title: 'Choose the right operating layer.', body: 'Start simple and scale AgentDesk as customer volume grows.' },
  cta: { title: 'Ready to make customer operations easier?', body: 'Start with AgentDesk and give every enquiry a clear next step.' },
  faq: { title: 'Frequently asked questions.', body: 'Answers to the most common questions about AgentDesk.' },
  footer: { title: 'AgentDesk', body: 'AI customer operations for growing businesses.' },
  header: { title: 'Manage your workspace.', body: 'Configure this area of AgentDesk from one place.' },
  plans: { title: 'Plans and usage.', body: 'Review available plans, limits and included capabilities.' },
  auth: { title: 'Sign in securely.', body: 'Access your AgentDesk workspace.' },
  sidebar: { title: 'Your workspace.', body: 'Move between customer operations tools.' },
  content: { title: 'Customer operations.', body: 'Review activity, performance and next actions.' },
  usage: { title: 'Usage overview.', body: 'Track the activity included in your current plan.' },
  plan: { title: 'Current plan.', body: 'Manage your subscription and available upgrades.' },
  settings: { title: 'Regional settings.', body: 'Configure localization preferences for your workspace.' },
  snippet: { title: 'Deploy AgentDesk.', body: 'Use the deployment options to bring AgentDesk into your customer experience.' },
  security: { title: 'Account security.', body: 'Manage credentials and access for your workspace.' }
};

const PAGE_COPY: Record<string, { title: string; subtitle: string; sections: string[] }> = {
  home: { title: 'Your AI employee for every customer conversation.', subtitle: 'Turn enquiries into conversations, leads and booked work.', sections: ['hero', 'problem', 'poster', 'dashboard', 'benefits', 'pricing', 'cta', 'faq', 'footer'] },
  pricing: { title: 'Simple pricing that scales with your business.', subtitle: 'Choose the plan that fits your customer operations.', sections: ['header', 'plans', 'faq', 'cta', 'footer'] },
  login: { title: 'Welcome back.', subtitle: 'Sign in to your AgentDesk workspace.', sections: ['auth'] },
  dashboard: { title: 'Your workspace.', subtitle: 'Everything your team needs in one place.', sections: ['sidebar', 'header', 'content'] },
  billing: { title: 'Billing & usage.', subtitle: 'Manage plan, usage and upgrades.', sections: ['header', 'usage', 'plan'] },
  localization: { title: 'Localization.', subtitle: 'Configure market, currency and regional settings.', sections: ['header', 'settings'] },
  embed: { title: 'Deploy & embed.', subtitle: 'Deploy AgentDesk into the customer experience.', sections: ['header', 'snippet'] },
  'account-credentials': { title: 'Account & credentials.', subtitle: 'Manage account access and credentials.', sections: ['header', 'security'] }
};

const buildPage = (design: Design, id: string) => {
  const copy = PAGE_COPY[id] || { title: PAGE_DEFS.find(p => p[0] === id)?.[1] || id, subtitle: 'Edit this page visually.', sections: ['header', 'content'] };
  design.editor = design.editor || { pages: {} };
  design.editor.pages[id] = {
    title: copy.title,
    subtitle: copy.subtitle,
    sections: copy.sections.map((name, i) => {
      const sectionCopy = SECTION_COPY[name] || { title: name.replace(/[-_]/g, ' ').replace(/\\b\\w/g, (m: string) => m.toUpperCase()), body: 'Edit this section directly in the canvas.' };
      const hero = name === 'hero';
      return {
        id: id + '_' + name,
        name,
        label: name.replace(/[-_]/g, ' '),
        visible: true,
        height: hero ? 600 : name === 'footer' ? 180 : 300,
        background: hero ? '#0A0A0D' : i % 2 ? '#101014' : '#08080A',
        padding: hero ? 56 : 44,
        align: hero ? 'left' : 'center',
        elements: [
          { id: id + '_' + name + '_heading', type: 'heading', text: hero ? copy.title : sectionCopy.title, x: hero ? 36 : 50, y: hero ? 34 : 32, width: hero ? 68 : 74, fontSize: hero ? 54 : 32, weight: 700, color: '#F7F3F7' },
          { id: id + '_' + name + '_body', type: 'text', text: hero ? copy.subtitle : sectionCopy.body, x: hero ? 36 : 50, y: hero ? 55 : 53, width: hero ? 58 : 64, fontSize: hero ? 18 : 16, weight: 400, color: '#9A97A1' },
          ...(hero ? [{ id: id + '_' + name + '_button', type: 'button', text: 'Get Started', x: 36, y: 72, width: 22, fontSize: 14, weight: 700, color: '#080808' }] : [])
        ]
      };
    })
  };
  return design.editor.pages[id];
};

const getPage = (design: Design, id: string) => {
  if (!design.editor?.pages?.[id]) return buildPage(design, id);
  return design.editor.pages[id];
};

const ensureEditor = (source: Design) => {
  const next = clone(source || DEFAULT);
  next.editor = next.editor || { pages: {} };
  for (const [id] of PAGE_DEFS) {
    const page = next.editor.pages?.[id];
    const isPlaceholder = page && page.sections?.length <= 3 && page.sections?.some((s: any) =>
      s.elements?.some((e: any) => e.text === 'Click any element to edit it directly.' || e.text === 'header' || e.text === 'content')
    );
    if (!page || isPlaceholder) buildPage(next, id);
    else getPage(next, id);
  }
  next.editor.activePage = next.editor.activePage || 'home';
  return next;
};

export const DesignStudio: React.FC = () => {
  const [design, setDesign] = useState<Design>(() => ensureEditor(DEFAULT));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [pageId, setPageId] = useState('home');
  const [target, setTarget] = useState<Target | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [tool, setTool] = useState<'elements' | 'pages' | 'layers' | 'style' | 'templates'>('elements');
  const [history, setHistory] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const [previewNonce, setPreviewNonce] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const dragSnapshotRef = useRef<Design | null>(null);

  useEffect(() => {
    safeFetchJson('/api/site-design', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then((r: any) => {
        const next = ensureEditor(r?.success && r.design ? r.design : DEFAULT);
        setDesign(next);
        setPageId(next.editor.activePage || 'home');
      })
      .catch((e: any) => setError(e?.message || 'Could not load Visual Studio.'))
      .finally(() => setLoading(false));
  }, []);

  const commit = (mutate: (next: Design) => void) => {
    setDesign(current => {
      const next = clone(current);
      mutate(next);
      setHistory(h => [...h.slice(-39), current]);
      setFuture([]);
      return next;
    });
    setSaved(false);
  };

  const updatePath = (path: string[], value: any) => commit(next => {
    let obj = next;
    path.slice(0, -1).forEach(k => { obj[k] = obj[k] || {}; obj = obj[k]; });
    obj[path[path.length - 1]] = value;
  });

  const currentPage = useMemo(() => getPage(design, pageId), [design, pageId]);

  const sendDraftToPreview = () => {
    const frame = previewFrameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({
      type: 'agentdesk-visual-editor-sync',
      selectedId: target?.kind === 'element' ? target.id : '',
      payload: {
        pageId,
        sections: currentPage.sections,
        brand: design.brand,
        typography: design.typography
      }
    }, window.location.origin);
  };

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      const frame = previewFrameRef.current;
      if (event.origin !== window.location.origin || !frame?.contentWindow || event.source !== frame.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'agentdesk-visual-editor-ready') {
        window.requestAnimationFrame(sendDraftToPreview);
        return;
      }
      if (event.data.type === 'agentdesk-visual-editor-select') {
        const id = String(event.data.selectedId || '');
        if (id) setTarget({ kind: 'element', id });
        return;
      }
      if (event.data.type === 'agentdesk-visual-editor-drag') {
        const id = String(event.data.selectedId || '');
        const x = Number(event.data.x);
        const y = Number(event.data.y);
        if (!id || !Number.isFinite(x) || !Number.isFinite(y)) return;
        if (!dragSnapshotRef.current) dragSnapshotRef.current = clone(design);
        setDesign((current: Design) => {
          const next = clone(current);
          const page = getPage(next, pageId);
          const element = page.sections.flatMap((section: any) => section.elements).find((item: any) => item.id === id);
          if (element) {
            element.x = Math.max(0, Math.min(100, x));
            element.y = Math.max(0, Math.min(100, y));
          }
          return next;
        });
        setSaved(false);
        return;
      }
      if (event.data.type === 'agentdesk-visual-editor-drag-end') {
        if (dragSnapshotRef.current) {
          setHistory(history => [...history.slice(-39), dragSnapshotRef.current as Design]);
          dragSnapshotRef.current = null;
          setFuture([]);
        }
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, [design, pageId]);

  useEffect(() => {
    sendDraftToPreview();
  }, [design, pageId, target]);


  const publish = async () => {
    setBusy(true); setError('');
    try {
      const r: any = await safeFetchJson('/api/site-design', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(design) });
      if (!r.success) throw new Error(r.error?.message || r.message || 'Publish failed.');
      setDesign(ensureEditor(r.design || design)); setSaved(true); setPreviewNonce(n => n + 1);
    } catch (e: any) { setError(e?.message || 'Publish failed.'); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!window.confirm('Reset the Visual Studio design?')) return;
    setBusy(true);
    try {
      const r: any = await safeFetchJson('/api/site-design/reset', { method: 'POST' });
      if (!r.success) throw new Error(r.error?.message || r.message || 'Reset failed.');
      setDesign(ensureEditor(r.design || DEFAULT)); setHistory([]); setFuture([]); setTarget(null);
    } catch (e: any) { setError(e?.message || 'Reset failed.'); }
    finally { setBusy(false); }
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture(f => [design, ...f.slice(0, 39)]);
    setHistory(h => h.slice(0, -1));
    setDesign(previous);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory(h => [...h.slice(-39), design]);
    setFuture(f => f.slice(1));
    setDesign(next);
  };

  const addElement = (type: 'heading' | 'text' | 'button' | 'image' | 'shape') => {
    const section = currentPage.sections[0];
    if (!section) return;
    const defaults: Record<string, any> = {
      heading: { text: 'New heading', fontSize: 34, weight: 700, width: 70 },
      text: { text: 'New text block', fontSize: 16, weight: 400, width: 60 },
      button: { text: 'Button', fontSize: 14, weight: 700, width: 28 },
      image: { text: '', fontSize: 14, weight: 400, width: 40, imageUrl: '' },
      shape: { text: '', fontSize: 14, weight: 400, width: 30 }
    };
    const element = { id: uid('el'), type, x: 50, y: 70, ...defaults[type] };
    commit(next => { const p = getPage(next, pageId); p.sections[0].elements.push(element); });
    setTarget({ kind: 'element', id: element.id });
  };

  const applyTemplate = (preset: any) => {
    commit(next => {
      next.brand.primaryColor = preset.primary;
      next.brand.backgroundColor = preset.background;
      next.brand.surfaceColor = preset.surface;
      next.appearance.radius = preset.radius;
      next.pages = next.pages || {};
      next.pages.public = { ...(next.pages.public || {}), maxWidth: 1240, pagePadding: 24 };
      const page = getPage(next, pageId);
      page.sections.forEach((section: any, index: number) => {
        section.background = index === 0 ? preset.background : index % 2 ? preset.surface : preset.background;
        section.elements.forEach((element: any) => {
          if (element.type !== 'button') element.color = element.type === 'heading' ? '#f4f1e9' : '#b8b2a7';
        });
      });
    });
  };

  const openLivePreview = () => {
    const paths: Record<string, string> = { home: '/', pricing: '/pricing', login: '/login' };
    const path = paths[pageId];
    if (path) window.open(path, '_blank', 'noopener,noreferrer');
    else window.open('/dashboard', '_blank', 'noopener,noreferrer');
  };

  const addSection = () => {
    const section = { id: uid('section'), name: 'section', label: 'New section', visible: true, height: 300, background: '', padding: 40, align: 'center', elements: [{ id: uid('el'), type: 'heading', text: 'New section', x: 50, y: 35, width: 70, fontSize: 32, weight: 700, color: '' }] };
    commit(next => getPage(next, pageId).sections.push(section));
    setTarget({ kind: 'section', id: section.id });
  };

  const moveSection = (index: number, direction: number) => commit(next => {
    const sections = getPage(next, pageId).sections;
    const ni = index + direction;
    if (ni >= 0 && ni < sections.length) [sections[index], sections[ni]] = [sections[ni], sections[index]];
  });

  const selectedSection = currentPage.sections.find((s: any) => s.id === (target?.kind === 'section' ? target.id : currentPage.sections.find((s: any) => s.elements.some((e: any) => e.id === target?.id))?.id));
  const selectedElement = currentPage.sections.flatMap((s: any) => s.elements).find((e: any) => e.id === (target?.kind === 'element' ? target.id : ''));
  const canvasWidth = device === 'desktop' ? 1180 : device === 'tablet' ? 768 : 390;

  const dragElement = (event: React.PointerEvent, element: any) => {
    event.stopPropagation();
    const startX = event.clientX, startY = event.clientY;
    const startLeft = element.x, startTop = element.y;
    const section = currentPage.sections.find((s: any) => s.elements.some((e: any) => e.id === element.id));
    const rect = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
    if (!rect || !section) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const move = (ev: PointerEvent) => {
      const x = Math.max(2, Math.min(98, startLeft + ((ev.clientX - startX) / rect.width) * 100));
      const y = Math.max(2, Math.min(96, startTop + ((ev.clientY - startY) / rect.height) * 100));
      setDesign((current: Design) => {
        const next = clone(current);
        const p = getPage(next, pageId);
        const el = p.sections.flatMap((s: any) => s.elements).find((e: any) => e.id === element.id);
        if (el) { el.x = Number(x.toFixed(2)); el.y = Number(y.toFixed(2)); }
        return next;
      });
      setSaved(false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setHistory(h => [...h.slice(-39), design]);
      setFuture([]);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const uploadImage = (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) { setError('Choose an image smaller than 12 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1600 / image.width, 1000 / image.height);
        const c = document.createElement('canvas'); c.width = Math.max(1, image.width * scale); c.height = Math.max(1, image.height * scale);
        const ctx = c.getContext('2d'); if (!ctx) return;
        ctx.drawImage(image, 0, 0, c.width, c.height);
        const compressed = c.toDataURL('image/webp', .82);
        if (selectedElement) updateSelected({ imageUrl: compressed });
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  };

  function updateSelected(patch: any) {
    if (!target) return;
    commit(next => {
      const p = getPage(next, pageId);
      if (target.kind === 'section') {
        const s = p.sections.find((x: any) => x.id === target.id);
        if (s) Object.assign(s, patch);
      } else {
        const e = p.sections.flatMap((s: any) => s.elements).find((x: any) => x.id === target.id);
        if (e) Object.assign(e, patch);
      }
    });
  }

  const removeSelected = () => {
    if (!target) return;
    commit(next => {
      const p = getPage(next, pageId);
      if (target.kind === 'section') p.sections = p.sections.filter((s: any) => s.id !== target.id);
      else p.sections.forEach((s: any) => { s.elements = s.elements.filter((e: any) => e.id !== target.id); });
    });
    setTarget(null);
  };

  if (loading) return <div className="p-8 text-slate-400">Loading Visual Studio...</div>;

  return (
    <div className="min-h-full h-full bg-[#070809] text-white flex flex-col overflow-hidden">
      <header className="h-14 shrink-0 border-b border-white/10 bg-[#0b0c0f] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-black tracking-tight">Website Builder</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Edit the real AgentDesk experience</div>
          </div>
          <div className="text-[10px] text-slate-500 border border-white/10 rounded px-2 py-1">SITE-WIDE</div>
          <div className="flex items-center gap-1 ml-2">
            <IconButton label="Undo" onClick={undo} disabled={!history.length}><Undo2 /></IconButton>
            <IconButton label="Redo" onClick={redo} disabled={!future.length}><Redo2 /></IconButton>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <Device active={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor /></Device>
          <Device active={device === 'tablet'} onClick={() => setDevice('tablet')}><Tablet /></Device>
          <Device active={device === 'mobile'} onClick={() => setDevice('mobile')}><Smartphone /></Device>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openLivePreview} className="px-3 py-2 rounded-lg border border-white/10 text-xs font-semibold flex gap-2 items-center"><Eye className="w-4 h-4" />Live preview</button>
          <button type="button" onClick={reset} className="p-2 rounded-lg border border-white/10"><RotateCcw className="w-4 h-4" /></button>
          <button type="button" onClick={publish} disabled={busy} className="px-4 py-2 rounded-lg bg-[#b8a47e] text-xs font-bold flex gap-2 items-center"><Save className="w-4 h-4" />{busy ? 'Saving...' : saved ? 'Published' : 'Publish'}</button>
        </div>
      </header>
      {error && <div className="px-4 py-2 bg-red-950/80 text-xs text-red-200 border-b border-red-500/20">{error}</div>}

      <div className="flex flex-1 min-h-0">
        <aside className="w-16 shrink-0 border-r border-white/10 bg-[#0b0c0f] flex flex-col items-center py-3 gap-2">
          <Tool active={tool === 'elements'} onClick={() => setTool('elements')}><Plus /></Tool>
          <Tool active={tool === 'pages'} onClick={() => setTool('pages')}><LayoutTemplate /></Tool>
          <Tool active={tool === 'layers'} onClick={() => setTool('layers')}><Layers3 /></Tool>
          <Tool active={tool === 'style'} onClick={() => setTool('style')}><Palette /></Tool>
          <Tool active={tool === 'templates'} onClick={() => setTool('templates')}><LayoutTemplate /></Tool>
        </aside>

        <aside className="w-64 shrink-0 border-r border-white/10 bg-[#101114] p-3 overflow-y-auto">
          {tool === 'elements' && <Panel title="Add to canvas">
            <AddButton onClick={() => addElement('heading')}><Type /> Heading</AddButton>
            <AddButton onClick={() => addElement('text')}><Type /> Text</AddButton>
            <AddButton onClick={() => addElement('button')}><MousePointer2 /> Button</AddButton>
            <AddButton onClick={() => addElement('image')}><ImageIcon /> Image</AddButton>
            <AddButton onClick={() => addElement('shape')}><Square /> Shape</AddButton>
            <AddButton onClick={addSection}><Plus /> Section</AddButton>
          </Panel>}
          {tool === 'pages' && <Panel title="Pages">
            {PAGE_DEFS.map(([id, label]) => <button key={id} type="button" onClick={() => { setPageId(id); setTarget(null); }} className={'w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 ' + (pageId === id ? 'bg-[#b8a47e]/20 text-[#d8c49a]' : 'text-slate-400 hover:bg-white/5')}>{label}</button>)}
          </Panel>}
          {tool === 'layers' && <Panel title="Layers">
            {currentPage.sections.map((section: any, index: number) => <div key={section.id} className="mb-2">
              <button type="button" onClick={() => setTarget({kind:'section',id:section.id})} className={'w-full text-left px-2 py-2 rounded bg-white/5 text-xs ' + (target?.id === section.id ? 'ring-1 ring-[#b8a47e]' : '')}>{section.label || section.name}</button>
              <div className="pl-3 pt-1">{section.elements.map((e: any) => <button key={e.id} type="button" onClick={() => setTarget({kind:'element',id:e.id})} className={'block w-full text-left px-2 py-1.5 text-[11px] text-slate-400 rounded ' + (target?.id === e.id ? 'bg-[#b8a47e]/20 text-[#d8c49a]' : '')}>{e.type}: {e.text || 'media'}</button>)}</div>
              <div className="flex gap-1 mt-1">
                <SmallButton onClick={() => moveSection(index, -1)}><ArrowUp /></SmallButton>
                <SmallButton onClick={() => moveSection(index, 1)}><ArrowDown /></SmallButton>
              </div>
            </div>)}
          </Panel>}
          {tool === 'templates' && <Panel title="Templates">
            <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xs font-semibold text-white mb-1">Start from a real direction</div>
              <div className="text-[11px] leading-4 text-slate-500">These are AgentDesk visual directions. The connected Figma workspace is now available for template research and design handoff.</div>
            </div>
            {TEMPLATE_PRESETS.map((preset: any) => <button key={preset.id} type="button" onClick={() => applyTemplate(preset)} className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] mb-2">
              <div className="h-16 rounded-lg mb-3" style={{background:preset.background,border:'1px solid rgba(255,255,255,.08)'}}>
                <div className="h-2 w-20 rounded-full m-3" style={{background:preset.primary}} />
                <div className="h-2 w-32 rounded-full mx-3 bg-white/15" />
              </div>
              <div className="text-xs font-semibold text-white">{preset.name}</div>
              <div className="text-[10px] leading-4 text-slate-500 mt-1">{preset.description}</div>
            </button>)}
            <a href="https://www.figma.com/templates/web-design-inspiration/" target="_blank" rel="noreferrer" className="block text-center text-xs text-[#d8c49a] hover:text-[#d8c49a] mt-3">Browse free Figma website templates ↗</a>
          </Panel>}
          {tool === 'style' && <Panel title="Global style">
            <Color label="Primary" value={design.brand.primaryColor} onChange={v => updatePath(['brand','primaryColor'],v)} />
            <Color label="Background" value={design.brand.backgroundColor} onChange={v => updatePath(['brand','backgroundColor'],v)} />
            <Color label="Text" value={design.brand.textColor} onChange={v => updatePath(['brand','textColor'],v)} />
            <Range label="Radius" value={design.appearance.radius} min={0} max={40} onChange={v => updatePath(['appearance','radius'],v)} />
            <Select label="Heading font" value={design.typography.headingFont} options={['Inter','system-ui','Arial','Helvetica','Georgia','Trebuchet MS','Verdana']} onChange={v => updatePath(['typography','headingFont'],v)} />
            <Select label="Body font" value={design.typography.bodyFont} options={['Inter','system-ui','Arial','Helvetica','Georgia','Trebuchet MS','Verdana']} onChange={v => updatePath(['typography','bodyFont'],v)} />
          </Panel>}
        </aside>

        <main className="flex-1 min-w-0 bg-[#17181b] overflow-auto" ref={canvasRef}>
          <div className="min-h-full py-6 px-5 flex justify-center">
            <div
              style={{
                width: canvasWidth,
                maxWidth: 'calc(100vw - 410px)',
                minHeight: device === 'mobile' ? 844 : device === 'tablet' ? 900 : 760
              }}
              className="bg-black shadow-2xl rounded-xl overflow-hidden border border-white/10"
            >
              <div className="h-9 px-3 flex items-center justify-between border-b border-white/10 bg-[#0b0c0f] text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>LIVE AGENTDESK PAGE</span>
                  <span className="text-slate-600">•</span>
                  <span>{PAGE_DEFS.find(([id]) => id === pageId)?.[1] || pageId}</span>
                </div>
                <span className="text-slate-600">Publish to apply draft changes</span>
              </div>
              <iframe
                ref={previewFrameRef}
                onLoad={sendDraftToPreview}
                key={pageId + ':' + previewNonce}
                title={'AgentDesk ' + (PAGE_DEFS.find(([id]) => id === pageId)?.[1] || pageId) + ' preview'}
                src={(() => {
                  const paths: Record<string, string> = {
                    home: '/',
                    pricing: '/pricing',
                    login: '/login',
                    dashboard: '/dashboard',
                    voice: '/dashboard/voice-receptionist',
                    'missed-call': '/dashboard/missed-calls',
                    leads: '/dashboard/leads',
                    crm: '/dashboard/crm',
                    'follow-up': '/dashboard/followup',
                    're-engagement': '/dashboard/reengagement',
                    reviews: '/dashboard/reviews',
                    appointments: '/dashboard/appointments',
                    estimates: '/dashboard/estimates',
                    'cold-outreach': '/dashboard/outreach',
                    integrations: '/dashboard/integrations',
                    'knowledge-base': '/dashboard/knowledge',
                    conversations: '/dashboard/conversations',
                    billing: '/billing',
                    localization: '/dashboard/localization',
                    embed: '/embed',
                    'account-credentials': '/admin/account-credentials',
                    'platform-admin': '/admin'
                  };
                  return paths[pageId] || '/dashboard';
                })()}
                className="block w-full border-0 bg-black"
                style={{
                  height: device === 'mobile' ? 844 : device === 'tablet' ? 900 : 900,
                  pointerEvents: 'auto'
                }}
              />
            </div>
          </div>
        </main>

        <aside className="w-72 shrink-0 border-l border-white/10 bg-[#101114] p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4"><div className="font-bold text-sm">Properties</div>{target && <button type="button" onClick={removeSelected} className="p-1.5 rounded border border-red-500/20 text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
          {!target && <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-400">
              <div className="text-white font-semibold mb-1">Nothing selected</div>
              Click any real element in the live page to select it. Drag it directly in the page preview, then use these controls to change its content and visual treatment. Changes are draft-only until Publish.
            </div>}
          {target?.kind === 'section' && selectedSection && <SectionInspector section={selectedSection} onChange={updateSelected} />}
          {target?.kind === 'element' && selectedElement && <ElementInspector element={selectedElement} onChange={updateSelected} onUpload={uploadImage} />}
        </aside>
      </div>
    </div>
  );
};

const CanvasNav = ({design}:{design:Design}) => <div style={{background:'rgba(10,10,10,.82)',backdropFilter:'blur(18px)',borderBottom:'1px solid rgba(255,255,255,.08)'}} className="h-14 px-5 flex items-center justify-between sticky top-0 z-10"><div className="font-black text-sm">{design.site.name}</div><div className="flex gap-2"><span className="text-[10px] text-white/50 px-2 py-1">Products</span><span className="text-[10px] text-white/50 px-2 py-1">Pricing</span><span className="text-[10px] text-white/50 px-2 py-1">Contact</span><button style={{background:design.brand.primaryColor,borderRadius:design.buttons.radius}} className="px-3 py-1.5 text-[10px] font-bold">Get Started</button></div></div>;

const CanvasSection = ({section,design,selected,selectedElementId,onSelect,onSelectElement,onDrag,onDoubleText}:{section:any,design:Design,selected:boolean,selectedElementId:string,onSelect:(id:string)=>void,onSelectElement:(id:string)=>void,onDrag:(e:React.PointerEvent,el:any)=>void,onDoubleText:(id:string,text:string)=>void}) => (
  <section onPointerDown={() => onSelect(section.id)} style={{minHeight:section.height||280,padding:section.padding||40,background:section.background||'transparent',textAlign:section.align||'center'}} className={'relative overflow-hidden border-2 ' + (selected ? 'border-[#b8a47e]/70' : 'border-transparent hover:border-[#b8a47e]/30')}>
    {selected && <div className="absolute left-2 top-2 z-20 px-2 py-1 bg-[#b8a47e] text-[9px] uppercase font-bold rounded">{section.label || section.name}</div>}
    {section.elements.map((e:any)=><CanvasElement key={e.id} element={e} design={design} selected={selectedElementId===e.id} onSelect={(ev)=>{ev.stopPropagation();onSelectElement(e.id)}} onDrag={onDrag} onDoubleText={onDoubleText}/>)}
  </section>
);

const CanvasElement = ({element,design,selected,onSelect,onDrag,onDoubleText}:{element:any,design:Design,selected:boolean,onSelect:(e:React.PointerEvent)=>void,onDrag:(e:React.PointerEvent,el:any)=>void,onDoubleText:(id:string,text:string)=>void}) => {
  const common:any={position:'absolute',left:(element.x||50)+'%',top:(element.y||50)+'%',width:(element.width||50)+'%',transform:'translate(-50%,-50%)',fontSize:element.fontSize||16,fontWeight:element.weight||400,color:element.color||design.brand.textColor,cursor:'move',outline:selected?'2px solid #3b82f6':'none',outlineOffset:4};
  const textStyle:any={fontFamily:element.type==='heading'?design.typography.headingFont:design.typography.bodyFont};
  const begin=(e:React.PointerEvent)=>{onSelect(e);onDrag(e,element)};
  if(element.type==='image') return <div style={common} onPointerDown={begin}>{element.imageUrl?<img src={element.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg"/>:<div className="h-32 rounded-lg bg-white/10 flex items-center justify-center"><ImageIcon className="w-8 h-8 opacity-30"/></div>}</div>;
  if(element.type==='button') return <button type="button" style={{...common,background:design.brand.primaryColor,borderRadius:design.buttons.radius}} onPointerDown={begin} onDoubleClick={()=>onDoubleText(element.id,prompt('Button label',element.text||'Button')||element.text)}>{element.text||'Button'}</button>;
  if(element.type==='shape') return <div style={{...common,height:100,background:element.color||design.brand.primaryColor,borderRadius:design.appearance.radius}} onPointerDown={begin}/>;
  return <div style={{...common,...textStyle}} onPointerDown={begin} onDoubleClick={()=>onDoubleText(element.id,prompt('Edit text',element.text||'')||element.text)}>{element.text}</div>;
};

const SectionInspector=({section,onChange}:{section:any,onChange:(p:any)=>void})=><div className="space-y-3"><Input label="Section name" value={section.label||''} onChange={v=>onChange({label:v})}/><Range label="Height" value={section.height||300} min={120} max={1000} onChange={v=>onChange({height:v})}/><Range label="Padding" value={section.padding||40} min={0} max={160} onChange={v=>onChange({padding:v})}/><Select label="Alignment" value={section.align||'center'} options={['left','center','right']} onChange={v=>onChange({align:v})}/><Color label="Background" value={section.background||'#000000'} onChange={v=>onChange({background:v})}/><Toggle label="Visible" value={section.visible!==false} onChange={v=>onChange({visible:v})}/></div>;

const ElementInspector=({element,onChange,onUpload}:{element:any,onChange:(p:any)=>void,onUpload:(f:File)=>void})=><div className="space-y-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">{element.type}</div><Input label="Text" value={element.text||''} onChange={v=>onChange({text:v})}/><Range label="Width" value={element.width||50} min={5} max={95} onChange={v=>onChange({width:v})}/><Range label="Font size" value={element.fontSize||16} min={8} max={100} onChange={v=>onChange({fontSize:v})}/><Range label="Weight" value={element.weight||400} min={100} max={900} step={100} onChange={v=>onChange({weight:v})}/><Color label="Color" value={element.color||'#ffffff'} onChange={v=>onChange({color:v})}/>{element.type==='image'&&<label className="block text-xs text-slate-400">Image<input type="file" accept="image/*" className="block w-full mt-2 text-xs" onChange={e=>{const f=e.target.files?.[0];if(f)onUpload(f)}}/></label>}</div>;

const Panel=({title,children}:{title:string,children:React.ReactNode})=><><div className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-3">{title}</div>{children}</>;
const AddButton=({children,onClick}:{children:React.ReactNode,onClick:()=>void})=><button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm mb-2"><span className="w-5 h-5 flex items-center justify-center">{children && React.Children.toArray(children)[0]}</span>{React.Children.toArray(children)[1]}</button>;
const Tool=({active,onClick,children}:{active:boolean,onClick:()=>void,children:React.ReactNode})=><button type="button" onClick={onClick} className={'p-3 rounded-xl '+(active?'bg-[#b8a47e]/20 text-[#d8c49a]':'text-slate-500 hover:text-white')} title="Tool">{children}</button>;
const IconButton=({onClick,disabled,children,label}:{onClick:()=>void,disabled?:boolean,children:React.ReactNode,label:string})=><button type="button" title={label} disabled={disabled} onClick={onClick} className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-30">{children}</button>;
const Device=({active,onClick,children}:{active:boolean,onClick:()=>void,children:React.ReactNode})=><button type="button" onClick={onClick} className={'p-1.5 rounded '+(active?'bg-white/10 text-white':'text-slate-500')}>{children}</button>;
const SmallButton=({onClick,children}:{onClick:()=>void,children:React.ReactNode})=><button type="button" onClick={onClick} className="p-1 rounded bg-white/5 text-slate-500"><span className="w-3 h-3 block">{children}</span></button>;
const Input=({label,value,onChange}:{label:string,value:string,onChange:(v:string)=>void})=><label className="block text-xs text-slate-400">{label}<input value={value||''} onChange={e=>onChange(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"/></label>;
const Color=({label,value,onChange}:{label:string,value:string,onChange:(v:string)=>void})=><label className="flex items-center justify-between text-xs text-slate-400">{label}<input type="color" value={value||'#000000'} onChange={e=>onChange(e.target.value)} className="w-9 h-7 bg-transparent"/></label>;
const Select=({label,value,options,onChange}:{label:string,value:string,options:string[],onChange:(v:string)=>void})=><label className="block text-xs text-slate-400">{label}<select value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full bg-[#181a1f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;
const Range=({label,value,min,max,step=1,onChange}:{label:string,value:number,min:number,max:number,step?:number,onChange:(v:number)=>void})=><label className="block text-xs text-slate-400">{label}<div className="flex gap-2 items-center mt-1"><input className="w-full" type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><span className="w-10 text-right text-white text-[11px]">{Number(value).toFixed(step<1?1:0)}</span></div></label>;
const Toggle=({label,value,onChange}:{label:string,value:boolean,onChange:(v:boolean)=>void})=><label className="flex items-center justify-between text-xs text-slate-400">{label}<button type="button" onClick={()=>onChange(!value)} className={'w-9 h-5 rounded-full p-0.5 '+(value?'bg-[#b8a47e]':'bg-white/10')}><span className={'block w-4 h-4 rounded-full bg-white '+(value?'translate-x-4':'')}/></button></label>;
