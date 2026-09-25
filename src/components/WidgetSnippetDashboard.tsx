import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  Globe, 
  Sparkles, 
  ExternalLink, 
  Terminal, 
  Layers,
  Bot,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ShieldCheck,
  Palette,
  Play
} from 'lucide-react';
import { Business, AIAgent } from '../types';
import { getAllAgents, getAgentById } from '../lib/dbService';
import { PLATFORM_ADMIN_AGENT_ID, PLATFORM_ADMIN_TENANT_ID } from '../data/platformAdminData';
import { PUBLIC_DEMO_AGENT_ID } from '../data/demoBusiness';

interface WidgetSnippetDashboardProps {
  business?: Business | null;
  onOpenLiveDemo?: () => void;
}

export const WidgetSnippetDashboard: React.FC<WidgetSnippetDashboardProps> = ({
  business,
  onOpenLiveDemo
}) => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    business?.primaryAgentId || business?.id || 'platform-admin-agent'
  );
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  
  // Customization
  const [themeColor, setThemeColor] = useState<string>(business?.primaryColor || '#2563eb');
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [autoOpenDelay, setAutoOpenDelay] = useState<number>(0);
  
  // Tabs & Copy state
  const [activeFramework, setActiveFramework] = useState<'html' | 'react' | 'wordpress' | 'shopify' | 'webflow'>('html');
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string>('');

  // Deployment Health Ping
  const [pingStatus, setPingStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [pingLatency, setPingLatency] = useState<number>(0);
  const [resolvedConfig, setResolvedConfig] = useState<any>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agentdesk.ai';

  useEffect(() => {
    let cancelled = false;

    async function loadAgentsList() {
      const list = await getAllAgents();
      const validList = Array.isArray(list) ? list.filter(a => a && a.id) : [];
      const tenantId = String(business?.id || '').trim().toLowerCase();
      const tenantAgents = tenantId
        ? validList.filter(a => String(a.tenantId || '').trim().toLowerCase() === tenantId)
        : [];
      const configuredPrimary = String(business?.primaryAgentId || '').trim().toLowerCase();

      const current =
        validList.find(a =>
          String(a.id || '').trim().toLowerCase() === configuredPrimary &&
          (!tenantId || String(a.tenantId || '').trim().toLowerCase() === tenantId)
        ) ||
        tenantAgents.find(a =>
          String(a.id || '').trim().toLowerCase() === String(selectedAgentId || '').trim().toLowerCase()
        ) ||
        tenantAgents[0] ||
        validList.find(a =>
          String(a.id || '').trim().toLowerCase() === String(selectedAgentId || '').trim().toLowerCase()
        );

      if (cancelled) return;
      setAgents(validList);

      if (current) {
        setSelectedAgentId(current.id);
        setSelectedAgent(current);
        if (current.primaryColor) setThemeColor(current.primaryColor);
      } else if (tenantId === 'agentdesk-public-demo') {
        setSelectedAgentId(PUBLIC_DEMO_AGENT_ID);
        const publicAgent = await getAgentById(PUBLIC_DEMO_AGENT_ID);
        if (!cancelled && publicAgent) {
          setSelectedAgent(publicAgent);
          if (publicAgent.primaryColor) setThemeColor(publicAgent.primaryColor);
        }
      }
    }

    loadAgentsList();
    return () => { cancelled = true; };
  }, [business?.id, business?.primaryAgentId]);

  const verifyDeploymentStatus = async () => {
    setPingStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch(`/api/widget/config?agentId=${encodeURIComponent(selectedAgentId)}`);
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
      if (res.ok) {
        const data = await res.json();
        setResolvedConfig(data);
        setPingStatus('online');
      } else {
        setPingStatus('error');
      }
    } catch (e) {
      setPingStatus('error');
    }
  };

  useEffect(() => {
    verifyDeploymentStatus();
  }, [selectedAgentId]);

  // Generate dynamic embed snippets
  const htmlSnippet = `<!-- AgentDesk AI Conversational Agent Embed -->
<script 
  src="${origin}/widget.js" 
  data-agent-id="${selectedAgentId}"
  data-position="${position}"
  data-theme="${themeColor}"
  data-delay="${autoOpenDelay}"
  async>
</script>`;

  const reactSnippet = `import { useEffect } from 'react';

export default function AgentDeskEmbed() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${origin}/widget.js';
    script.setAttribute('data-agent-id', '${selectedAgentId}');
    script.setAttribute('data-position', '${position}');
    script.setAttribute('data-theme', '${themeColor}');
    script.setAttribute('data-delay', '${autoOpenDelay}');
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up on unmount if needed
      const el = document.getElementById('agentdesk-container');
      if (el) el.remove();
    };
  }, []);

  return null;
}`;

  const wordpressGuide = `1. In WordPress Admin, navigate to Plugins > Add New.
2. Search and install "Insert Headers and Footers" (or "WPCode").
3. Go to Code Snippets > Header & Footer.
4. Paste the following snippet into the Footer section:

${htmlSnippet}

5. Click "Save Changes". The 24/7 AI agent will immediately appear on your website.`;

  const shopifyGuide = `1. In Shopify Admin, navigate to Online Store > Themes.
2. Click the "..." button on your current theme and choose "Edit code".
3. Open the "theme.liquid" file located in the Layout folder.
4. Scroll down to the bottom and paste the following snippet directly before </body>:

${htmlSnippet}

5. Click "Save". Your store will now automatically qualify leads and answer product questions.`;

  const webflowGuide = `1. In Webflow, open your Project Settings.
2. Navigate to the "Custom Code" tab.
3. In the "Footer Code" (Before </body> tag) box, paste:

${htmlSnippet}

4. Save changes and click "Publish" to production.`;

  const getActiveCode = () => {
    switch (activeFramework) {
      case 'html': return htmlSnippet;
      case 'react': return reactSnippet;
      case 'wordpress': return wordpressGuide;
      case 'shopify': return shopifyGuide;
      case 'webflow': return webflowGuide;
    }
  };

  const handleCopy = (text: string, label: string = 'Snippet') => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setCopyFeedback(`${label} copied to clipboard!`);
        setTimeout(() => { setCopied(false); setCopyFeedback(''); }, 3000);
      }).catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  };

  const fallbackCopy = (text: string, label: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setCopyFeedback(`${label} copied to clipboard!`);
      setTimeout(() => { setCopied(false); setCopyFeedback(''); }, 3000);
    } catch (e) {
      setCopyFeedback('Failed to copy. Please manually select and copy.');
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Universal Embed Engine
            </span>
            <span className="text-xs text-slate-500">• Standalone JS Widget</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Code className="w-6 h-6 text-blue-600" />
            Deploy & Embed AI Agent
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Deploy your 24/7 AI Receptionist & Sales Agent onto any external website in seconds with a single line of JavaScript.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/embed-test.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span>Open Embed Sandbox Test</span>
          </a>

          {onOpenLiveDemo && (
            <button
              onClick={onOpenLiveDemo}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fullscreen Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* Deployment Verification & Live Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${
            pingStatus === 'online' ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' :
            pingStatus === 'checking' ? 'bg-amber-400 ring-4 ring-amber-100 animate-spin' :
            'bg-rose-500 ring-4 ring-rose-100'
          }`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">Deployment Endpoint:</span>
              <code className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                {origin}/widget.js
              </code>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pingStatus === 'online' ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready for live traffic ({pingLatency}ms) • Resolves to {resolvedConfig?.agent?.name || 'Agent'} ({resolvedConfig?.business?.name})
                </span>
              ) : pingStatus === 'checking' ? (
                'Verifying deployment configuration & agent endpoint...'
              ) : (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Configuration error. Check agent ID.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={verifyDeploymentStatus}
            title="Re-verify Status"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pingStatus === 'checking' ? 'animate-spin' : ''}`} />
            <span>Check Ping</span>
          </button>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Controls, Customization & Code Snippets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Selection & Customizer Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Select AI Agent to Embed</h3>
                  <p className="text-[11px] text-slate-500">Choose which agent personality, knowledge base, and voice is served</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Target AI Agent</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="platform-admin-agent">Platform Admin Agent (AgentDesk Platform)</option>
                  <option value="agentdesk-public-demo-agent">Public Demo Agent (AgentDesk Public Demo)</option>
                  {business && (
                    <option value={business.primaryAgentId || business.id}>
                      {business.name} Agent ({business.id})
                    </option>
                  )}
                  {agents
                    .filter(a => a && a.id && a.id !== 'platform-admin-agent' && a.id !== 'agentdesk-public-demo-agent' && (!business || a.id !== business.primaryAgentId))
                    .map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name || ag.id} ({ag.tenantId || 'Tenant'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Widget Theme Color</span>
                  <span className="font-mono text-[10px] text-slate-400">{themeColor}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                    {['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0f172a'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setThemeColor(c)}
                        className="w-6 h-6 rounded-full border border-white shadow-xs shrink-0 transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Launcher Button Position</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPosition('right')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      position === 'right' ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Bottom Right (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('left')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      position === 'left' ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Bottom Left
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Auto-Open Delay</label>
                <select
                  value={autoOpenDelay}
                  onChange={(e) => setAutoOpenDelay(parseInt(e.target.value, 10))}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value={0}>Disabled (User Clicks to Open)</option>
                  <option value={3}>Open after 3 seconds</option>
                  <option value={5}>Open after 5 seconds</option>
                  <option value={10}>Open after 10 seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Multi-Platform Code Generator */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setActiveFramework('html')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeFramework === 'html' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  HTML / Universal JS
                </button>
                <button
                  onClick={() => setActiveFramework('react')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeFramework === 'react' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  React / Next.js
                </button>
                <button
                  onClick={() => setActiveFramework('wordpress')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeFramework === 'wordpress' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  WordPress
                </button>
                <button
                  onClick={() => setActiveFramework('shopify')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeFramework === 'shopify' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shopify
                </button>
                <button
                  onClick={() => setActiveFramework('webflow')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeFramework === 'webflow' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Webflow
                </button>
              </div>

              <button
                onClick={() => handleCopy(getActiveCode(), activeFramework.toUpperCase())}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Embed Code'}</span>
              </button>
            </div>

            {copyFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{copyFeedback}</span>
              </div>
            )}

            <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-80 select-all">
              <code>{getActiveCode()}</code>
            </pre>
          </div>
        </div>

        {/* Right 1 Col: Live Sandbox Simulator & Quick Test */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Real-World Sandbox</h3>
                <p className="text-[11px] text-slate-500">Test the widget exactly as an external visitor sees it</p>
              </div>
            </div>

            {/* Simulated Website Window */}
            <div className="bg-slate-900 rounded-2xl p-4 text-white text-xs space-y-3 relative overflow-hidden border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                </span>
                <span className="font-mono truncate">https://your-client-site.com</span>
              </div>

              <div className="py-6 px-2 text-center space-y-2">
                <h4 className="font-bold text-sm text-slate-200">Customer Landing Page</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  The embed script dynamically hooks into this page and renders the floating launcher.
                </p>
              </div>

              {/* Floating Widget Simulation Icon */}
              <div 
                className={`absolute bottom-3 ${position === 'left' ? 'left-3' : 'right-3'} w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transition-transform hover:scale-110`}
                style={{ backgroundColor: themeColor }}
                title="Simulated Launcher"
              >
                <Bot className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2 text-xs">
              <h4 className="font-bold text-purple-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Zero-Leakage Security Guarantee
              </h4>
              <p className="text-purple-900 text-[11px] leading-relaxed">
                The public embed endpoint strictly resolves only the designated agent's grounded knowledge. Platform secrets, API keys, audit logs, and other tenants' conversations are completely isolated.
              </p>
            </div>
          </div>

          <a
            href="/embed-test.html"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Standalone Test Webpage</span>
          </a>
        </div>
      </div>
    </div>
  );
};
