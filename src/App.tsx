import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardOverview } from './components/DashboardOverview';
import { VoiceReceptionistDashboard } from './components/VoiceReceptionistDashboard';
import { MissedCallTextBackDashboard } from './components/MissedCallTextBackDashboard';
import { LeadsDashboard } from './components/LeadsDashboard';
import { CRMDashboard } from './components/CRMDashboard';
import { FollowUpDashboard } from './components/FollowUpDashboard';
import { ReEngagementDashboard } from './components/ReEngagementDashboard';
import { ReviewsDashboard } from './components/ReviewsDashboard';
import { AppointmentsDashboard } from './components/AppointmentsDashboard';
import { EstimatesDashboard } from './components/EstimatesDashboard';
import { ColdOutreachDashboard } from './components/ColdOutreachDashboard';
import { IntegrationsDashboard } from './components/IntegrationsDashboard';
import { KnowledgeBaseDashboard } from './components/KnowledgeBaseDashboard';
import { ConversationsDashboard } from './components/ConversationsDashboard';
import { PlatformAdminDashboard } from './components/PlatformAdminDashboard';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { ChatWidget } from './components/ChatWidget';
import { AuthModal } from './components/AuthModal';
import { PricingPage } from './components/PricingPage';
import { BillingDashboard } from './components/BillingDashboard';
import { PlanUpgradeModal } from './components/PlanUpgradeModal';
import { LocalizationSettings } from './components/LocalizationSettings';
import { WidgetSnippetDashboard } from './components/WidgetSnippetDashboard';
import { Business, AppNotification } from './types';
import { getCountryMetadata } from './lib/localization';
import { 
  getBusinessById, 
  getAllBusinesses, 
  subscribeToTenantRegistry, 
  getNotifications, 
  markNotificationsAsRead 
} from './lib/dbService';
import {
  PUBLIC_AGENTDESK_DEMO_BUSINESS,
  PUBLIC_DEMO_AGENT_ID,
  PUBLIC_DEMO_TENANT_ID,
  PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS
} from './data/demoBusiness';
import { 
  LayoutDashboard, 
  PhoneCall, 
  PhoneMissed, 
  Users, 
  Repeat, 
  RotateCcw, 
  Star, 
  Calendar, 
  FileText, 
  Send, 
  Sliders, 
  Database, 
  MessageSquare, 
  ShieldCheck, 
  ChevronDown, 
  Building2, 
  Sparkles,
  Bot,
  Globe,
  CreditCard,
  Code
} from 'lucide-react';

export type SaaSNavTab = 
  | 'overview'
  | 'voice_receptionist'
  | 'missed_calls'
  | 'leads'
  | 'crm'
  | 'followup'
  | 'reengagement'
  | 'reviews'
  | 'appointments'
  | 'estimates'
  | 'outreach'
  | 'knowledge'
  | 'conversations'
  | 'integrations'
  | 'billing'
  | 'localization'
  | 'embed'
  | 'admin';

export default function App() {
  const { currentUser, activeBusinessId, setActiveBusinessId } = useAuth();
  
  // Initialize view from URL if /pricing, /billing, /admin, or /embed
  const getInitialView = (): 'landing' | 'pricing' | 'dashboard' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/pricing' || hash === '#pricing') return 'pricing';
      if (path === '/billing' || hash === '#billing' || path.startsWith('/dashboard') || path.startsWith('/admin') || hash.startsWith('#admin') || path === '/embed' || hash === '#embed') return 'dashboard';
    }
    return 'landing';
  };

  const getInitialTab = (): SaaSNavTab => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/billing' || hash === '#billing') return 'billing';
      if (path === '/embed' || hash === '#embed') return 'embed';
      if (path.startsWith('/admin') || hash.startsWith('#admin')) return 'admin';
    }
    return 'overview';
  };

  const getInitialAdminSubTab = (): 'workspaces' | 'my_agent' | 'agents' | 'isolation_tests' | 'webhooks' | 'pricing_plans' | 'audit_logs' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin/agent' || path === '/admin/my-agent' || path === '/admin/my_agent' || hash === '#admin-agent' || hash === '#admin/agent') {
        return 'my_agent';
      }
    }
    return 'workspaces';
  };

  const [currentView, setCurrentView] = useState<'landing' | 'pricing' | 'dashboard'>(getInitialView);
  const [activeTab, setActiveTab] = useState<SaaSNavTab>(getInitialTab);
  const [adminSubTab, setAdminSubTab] = useState<'workspaces' | 'my_agent' | 'agents' | 'isolation_tests' | 'webhooks' | 'pricing_plans' | 'audit_logs'>(getInitialAdminSubTab);
  
  // Active business workspace state
  const [business, setBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  // Drawers & Modals
  const [showCopilot, setShowCopilot] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDemoWidget, setShowDemoWidget] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState<string | undefined>();
  const [upgradeFeatureReason, setUpgradeFeatureReason] = useState<string | undefined>();

  const handleOpenUpgradeModal = (feature?: string, targetPlan?: string) => {
    setUpgradeFeatureReason(feature);
    setUpgradeTargetPlan(targetPlan);
    setShowUpgradeModal(true);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/pricing' || hash === '#pricing') {
        setCurrentView('pricing');
      } else if (path === '/billing' || hash === '#billing') {
        setCurrentView('dashboard');
        setActiveTab('billing');
      } else if (path === '/embed' || hash === '#embed') {
        setCurrentView('dashboard');
        setActiveTab('embed');
      } else if (path === '/admin/agent' || path === '/admin/my-agent' || path === '/admin/my_agent' || hash === '#admin-agent' || hash === '#admin/agent') {
        setCurrentView('dashboard');
        setActiveTab('admin');
        setAdminSubTab('my_agent');
      } else if (path.startsWith('/admin') || hash.startsWith('#admin')) {
        setCurrentView('dashboard');
        setActiveTab('admin');
      } else if (path === '/' || path === '') {
        // preserve current or default to landing
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // For Business Admin: strictly enforce active workspace matches authenticated tenantId
    if (currentUser?.role === 'BUSINESS_ADMIN' && currentUser.businessId) {
      if (activeBusinessId !== currentUser.businessId) {
        setActiveBusinessId(currentUser.businessId);
        return;
      }
    }

    let isMounted = true;
    async function loadWorkspaceData() {
      if (!activeBusinessId) return;
      const biz = await getBusinessById(activeBusinessId);
      if (isMounted) setBusiness(biz);
      const list = await getAllBusinesses();
      if (isMounted) setAllBusinesses(list);
      const notifs = await getNotifications(activeBusinessId);
      if (isMounted) setNotifications(notifs);
    }
    loadWorkspaceData();

    const unsubscribe = subscribeToTenantRegistry(() => {
      loadWorkspaceData();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeBusinessId, currentUser]);

  const handleNavigate = (view: string) => {
    if (view === 'landing' || view === 'dashboard' || view === 'pricing') {
      setCurrentView(view as 'landing' | 'pricing' | 'dashboard');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        const newPath = view === 'pricing' ? '/pricing' : view === 'landing' ? '/' : '/dashboard';
        window.history.pushState(null, '', newPath);
      }
    }
  };

  const handleSelectWorkspace = (bizId: string) => {
    if (currentUser?.role === 'PLATFORM_ADMIN') {
      setActiveBusinessId(bizId);
    }
    setShowWorkspaceDropdown(false);
  };

  const handleMarkAllRead = async () => {
    if (business) {
      await markNotificationsAsRead(business.id);
      const updated = await getNotifications(business.id);
      setNotifications(updated);
    }
  };

  const isPlatformAdmin = currentUser?.role === 'PLATFORM_ADMIN';
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenDemoWidget={() => setShowDemoWidget(true)}
        onOpenCopilot={() => setShowCopilot(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        unreadNotificationsCount={unreadCount}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'landing' ? (
          <LandingPage
            onOpenDemo={() => setShowDemoWidget(true)}
            onOpenAuth={() => setShowAuthModal(true)}
            onOpenDashboard={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'pricing' ? (
          <PricingPage
            onOpenDashboard={() => setCurrentView('dashboard')}
            onOpenDemo={() => setShowDemoWidget(true)}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
            {/* SaaS Workspace Header & Bento Navigation Tabs */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                {/* Business Workspace Switcher / Tenant Banner */}
                <div className="relative">
                  {isPlatformAdmin ? (
                    // Platform Admin: Full tenant switching capability
                    <button
                      onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                      className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-4 py-2.5 rounded-2xl transition-all cursor-pointer"
                    >
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                        style={{ backgroundColor: business?.primaryColor || '#2563eb' }}
                      >
                        {business?.name ? business.name.charAt(0) : 'T'}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{business?.name || 'Loading Workspace...'}</span>
                          {business && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                              {getCountryMetadata(business.country).flag} {business.country}
                            </span>
                          )}
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {business?.industry || 'Tenant'} • {business?.currency} • ID: {business?.id} (Switch Business)
                        </span>
                      </div>
                    </button>
                  ) : (
                    // Business Admin: Strictly scoped to authenticated tenant
                    <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 px-4 py-2.5 rounded-2xl">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                        style={{ backgroundColor: business?.primaryColor || '#2563eb' }}
                      >
                        {business?.name ? business.name.charAt(0) : 'T'}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{business?.name || 'Loading Tenant Workspace...'}</span>
                          {business && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                              {getCountryMetadata(business.country).flag} {getCountryMetadata(business.country).name}
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Authenticated
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {business?.industry || 'Verified'} • {business?.currency} • {business?.timezone}
                        </span>
                      </div>
                    </div>
                  )}

                  {isPlatformAdmin && showWorkspaceDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 mb-1">
                        Select Business Workspace (Platform Admin)
                      </div>
                      {allBusinesses.map(b => (
                        <button
                          key={b.id}
                          onClick={() => handleSelectWorkspace(b.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                            b.id === activeBusinessId ? 'bg-blue-600/20 text-blue-300 font-bold' : 'hover:bg-slate-800 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1">
                                <span>{b.name}</span>
                                <span className="text-[9px] text-slate-400 font-normal">({b.country})</span>
                              </div>
                              <div className="text-[10px] text-slate-400">{b.industry}</div>
                            </div>
                          </div>
                          {b.id === activeBusinessId && (
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                          )}
                        </button>
                      ))}

                      <button
                        onClick={() => {
                          setActiveTab('admin');
                          setShowWorkspaceDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2.5 mt-1 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 font-bold flex items-center gap-2 border border-purple-500/30 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span>Platform Multi-Tenant Oversight</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Agent Persona Pill & Copilot Button */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {currentUser?.role === 'PLATFORM_ADMIN' && (
                    <button
                      onClick={() => {
                        setActiveTab('admin');
                        setAdminSubTab('my_agent');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Open Platform Admin AI Agent (platform-admin-agent)"
                    >
                      <Bot className="w-3.5 h-3.5 text-purple-200" />
                      <span>My AI Agent</span>
                    </button>
                  )}

                  {business?.agentSettings?.agentName && (
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs">
                      <Bot className="w-3.5 h-3.5 text-blue-400" />
                      <span>{business.agentSettings.agentName} (AI)</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowCopilot(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Copilot Assistant</span>
                  </button>

                  <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>{currentUser?.role || 'BUSINESS_ADMIN'}</span>
                  </span>
                </div>
              </div>

              {/* Omnichannel Suite Tabs Bar */}
              <div className="flex items-center gap-1.5 pt-4 overflow-x-auto pb-1 text-xs">
                {/* 1. Overview */}
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>

                {/* 2. Voice Receptionist */}
                <button
                  onClick={() => setActiveTab('voice_receptionist')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'voice_receptionist'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Voice Receptionist</span>
                </button>

                {/* 3. Missed Call Text Back */}
                <button
                  onClick={() => setActiveTab('missed_calls')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'missed_calls'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <PhoneMissed className="w-3.5 h-3.5 text-amber-400" />
                  <span>Missed Call Recovery</span>
                </button>

                {/* 4. Leads Intelligence */}
                <button
                  onClick={() => setActiveTab('leads')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'leads'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Leads & Qualification</span>
                </button>

                {/* 5. CRM & Deals */}
                <button
                  onClick={() => setActiveTab('crm')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'crm'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>CRM & Deals Pipeline</span>
                </button>

                {/* 6. Lead Follow-Up */}
                <button
                  onClick={() => setActiveTab('followup')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'followup'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Follow-Up Cadence</span>
                </button>

                {/* 7. Re-Engagement */}
                <button
                  onClick={() => setActiveTab('reengagement')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'reengagement'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Re-Engagement</span>
                </button>

                {/* 8. Reviews */}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'reviews'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reviews</span>
                </button>

                {/* 9. Appointments */}
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'appointments'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Appointments</span>
                </button>

                {/* 10. Estimates */}
                <button
                  onClick={() => setActiveTab('estimates')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'estimates'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Estimates</span>
                </button>

                {/* 11. Cold Outreach */}
                <button
                  onClick={() => setActiveTab('outreach')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'outreach'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>Cold Outreach</span>
                </button>

                {/* 12. Knowledge Base */}
                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'knowledge'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>Knowledge Base</span>
                </button>

                {/* 13. Transcripts */}
                <button
                  onClick={() => setActiveTab('conversations')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'conversations'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Transcripts</span>
                </button>

                {/* 14. Integrations */}
                <button
                  onClick={() => setActiveTab('integrations')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'integrations'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Integrations</span>
                </button>

                {/* 15. Billing & Limits */}
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'billing'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Billing & Usage</span>
                </button>

                {/* 16. Localization & Market Settings */}
                <button
                  onClick={() => setActiveTab('localization')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'localization'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Localization</span>
                </button>

                {/* 17. Deploy & Embed Widget */}
                <button
                  onClick={() => setActiveTab('embed')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'embed'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 text-blue-400" />
                  <span>Deploy & Embed</span>
                </button>

                {/* 18. Platform Admin (Only if Platform Admin) */}
                {currentUser?.role === 'PLATFORM_ADMIN' && (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setAdminSubTab('workspaces');
                    }}
                    className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                        : 'text-purple-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Platform Admin</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dashboard Content Container */}
            {activeTab === 'admin' ? (
              <PlatformAdminDashboard
                initialTab={adminSubTab}
                onSelectBusinessWorkspace={(bizId) => {
                  setActiveBusinessId(bizId);
                  setActiveTab('overview');
                }}
                onTenantUpdated={(updatedBiz) => {
                  if (activeBusinessId === updatedBiz.id) {
                    setBusiness(updatedBiz);
                  }
                  setAllBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));
                }}
                onTenantDeleted={async (deletedBizId) => {
                  const list = await getAllBusinesses();
                  setAllBusinesses(list);
                  if (activeBusinessId === deletedBizId) {
                    const nextId = list.length > 0 ? list[0].id : 'summit-home-services';
                    setActiveBusinessId(nextId);
                  }
                }}
              />
            ) : activeTab === 'embed' ? (
              <WidgetSnippetDashboard
                business={business}
                onOpenLiveDemo={() => setShowDemoWidget(true)}
              />
            ) : business ? (
              <div className="transition-all">
                {activeTab === 'overview' && (
                  <DashboardOverview
                    business={business}
                    onNavigateTab={(tab) => setActiveTab(tab as SaaSNavTab)}
                    onOpenDemoWidget={() => setShowDemoWidget(true)}
                  />
                )}

                {activeTab === 'voice_receptionist' && (
                  <VoiceReceptionistDashboard business={business} />
                )}

                {activeTab === 'missed_calls' && (
                  <MissedCallTextBackDashboard business={business} />
                )}

                {activeTab === 'leads' && (
                  <LeadsDashboard business={business} />
                )}

                {activeTab === 'crm' && (
                  <CRMDashboard business={business} />
                )}

                {activeTab === 'followup' && (
                  <FollowUpDashboard business={business} />
                )}

                {activeTab === 'reengagement' && (
                  <ReEngagementDashboard business={business} />
                )}

                {activeTab === 'reviews' && (
                  <ReviewsDashboard business={business} />
                )}

                {activeTab === 'appointments' && (
                  <AppointmentsDashboard business={business} />
                )}

                {activeTab === 'estimates' && (
                  <EstimatesDashboard business={business} />
                )}

                {activeTab === 'outreach' && (
                  <ColdOutreachDashboard business={business} />
                )}

                {activeTab === 'knowledge' && (
                  <KnowledgeBaseDashboard business={business} />
                )}

                {activeTab === 'conversations' && (
                  <ConversationsDashboard business={business} />
                )}

                {activeTab === 'integrations' && (
                  <IntegrationsDashboard
                    business={business}
                    onBusinessUpdated={(updated) => setBusiness(updated)}
                  />
                )}

                {activeTab === 'billing' && (
                  <BillingDashboard
                    business={business}
                    onOpenUpgrade={handleOpenUpgradeModal}
                  />
                )}

                {activeTab === 'localization' && (
                  <LocalizationSettings
                    business={business}
                    onUpdateBusiness={(updated) => setBusiness(updated)}
                  />
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading workspace data...</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Demo Chat Widget Overlay */}
      {currentView === 'landing' || currentView === 'pricing' ? (
        <ChatWidget
          key="public-agentdesk-demo-chat"
          business={PUBLIC_AGENTDESK_DEMO_BUSINESS}
          agentId={PUBLIC_DEMO_AGENT_ID}
          tenantId={PUBLIC_DEMO_TENANT_ID}
          knowledgeItems={PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS}
          isOpen={showDemoWidget}
          onOpen={() => setShowDemoWidget(true)}
          onClose={() => setShowDemoWidget(false)}
        />
      ) : business ? (
        <ChatWidget
          key={`tenant-chat-${business.id}`}
          business={business}
          agentId={business.primaryAgentId}
          tenantId={business.id}
          isOpen={showDemoWidget}
          onOpen={() => setShowDemoWidget(true)}
          onClose={() => setShowDemoWidget(false)}
        />
      ) : null}

      {/* AI Copilot Drawer */}
      {business && (
        <AICopilotDrawer
          business={business}
          isOpen={showCopilot}
          onClose={() => setShowCopilot(false)}
          onNavigateTab={(tabId) => setActiveTab(tabId as SaaSNavTab)}
        />
      )}

      {/* Notifications Drawer */}
      {business && (
        <NotificationsDrawer
          business={business}
          notifications={notifications}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={handleMarkAllRead}
          onNavigateTab={(tabId) => setActiveTab(tabId as SaaSNavTab)}
        />
      )}

      {/* Plan Upgrade & Gating Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlanId={business?.plan || 'growth'}
        featureReason={upgradeFeatureReason}
        targetPlanId={upgradeTargetPlan}
        onSelectPlan={(newPlan) => {
          if (business) {
            setBusiness({ ...business, plan: newPlan });
          }
          setShowUpgradeModal(false);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setCurrentView('dashboard')}
      />
    </div>
  );
}
