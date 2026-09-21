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
import { BusinessLoginPage } from './components/auth/BusinessLoginPage';
import { PlatformAdminLoginPage } from './components/auth/PlatformAdminLoginPage';
import { BusinessOnboardingFunnel } from './components/auth/BusinessOnboardingFunnel';
import { AgentDeskCheckout } from './components/AgentDeskCheckout';
import { BusinessAccountSettings } from './components/auth/BusinessAccountSettings';
import { ForcedPasswordChangePage } from './components/auth/ForcedPasswordChangePage';
import { AccountSetupPage } from './components/auth/AccountSetupPage';
import { PasswordResetPage } from './components/auth/PasswordResetPage';
import { EmailVerificationPage } from './components/auth/EmailVerificationPage';
import { Business, AppNotification } from './types';
import { getCountryMetadata } from './lib/localization';
import { 
  getBusinessById, 
  getAllBusinesses, 
  saveBusiness,
  subscribeToTenantRegistry, 
  getNotifications, 
  markNotificationsAsRead 
} from './lib/dbService';
import {
  PUBLIC_AGENTDESK_DEMO_BUSINESS,
  PLATFORM_ADMIN_BUSINESS,
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
  Code,
  KeyRound,
  AlertCircle,
  Menu,
  X
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
  | 'admin'
  | 'account_credentials';

export type AppView = 'landing' | 'pricing' | 'login' | 'platform_login' | 'onboarding' | 'checkout' | 'dashboard' | 'setup_account' | 'reset_password' | 'verify_email';

export function resolveAppRoute(pathname: string, hash: string): AppView {
  const path = pathname.toLowerCase();
  const normalizedHash = hash.toLowerCase();

  if (path === '/setup-account' || normalizedHash.startsWith('#setup-account') || normalizedHash.startsWith('#/setup-account')) return 'setup_account';
  if (path === '/reset-password' || normalizedHash.startsWith('#reset-password') || normalizedHash.startsWith('#/reset-password')) return 'reset_password';
  if (path === '/verify-email' || normalizedHash.startsWith('#verify-email') || normalizedHash.startsWith('#/verify-email')) return 'verify_email';
  if (path === '/pricing' || normalizedHash === '#pricing') return 'pricing';
  if (path === '/login' || normalizedHash === '#login') return 'login';
  if (path === '/platform/login' || normalizedHash === '#platform-login' || normalizedHash === '#platform/login') return 'platform_login';
  if (path === '/get-started' || path === '/signup' || path === '/checkout' || normalizedHash === '#get-started' || normalizedHash === '#signup' || normalizedHash === '#checkout') return 'checkout';
  if (path === '/billing' || normalizedHash === '#billing' || path.startsWith('/dashboard') || path.startsWith('/admin') || normalizedHash.startsWith('#admin') || path === '/embed' || normalizedHash === '#embed') return 'dashboard';

  return 'landing';
}

export default function App() {
  const { currentUser, activeBusinessId, setActiveBusinessId, refreshAuth } = useAuth();
  
  const getInitialView = (): AppView => typeof window !== 'undefined' ? resolveAppRoute(window.location.pathname, window.location.hash) : 'landing';

  const getInitialTab = (): SaaSNavTab => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/billing' || hash === '#billing') return 'billing';
      if (path === '/embed' || hash === '#embed') return 'embed';
      if (path === '/admin/account-credentials') return 'account_credentials';
      if (path.startsWith('/admin') || hash.startsWith('#admin')) return 'admin';
      const match = path.match(/^\/dashboard\/([^/]+)$/);
      const slugToTab: Record<string, SaaSNavTab> = {
        'voice-receptionist': 'voice_receptionist',
        'missed-calls': 'missed_calls',
        'leads': 'leads',
        'crm': 'crm',
        'followup': 'followup',
        'reengagement': 'reengagement',
        'reviews': 'reviews',
        'appointments': 'appointments',
        'estimates': 'estimates',
        'outreach': 'outreach',
        'knowledge': 'knowledge',
        'conversations': 'conversations',
        'integrations': 'integrations',
        'localization': 'localization'
      };
      if (match && slugToTab[match[1]]) return slugToTab[match[1]];
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

  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  const [activeTab, setActiveTab] = useState<SaaSNavTab>(getInitialTab);

  // AgentDesk uses the browser's real session history as its navigation model.
  // Every meaningful console destination gets a URL, so Back/Forward and mobile
  // browser gestures return the user to the exact previous/next destination.
  const tabPathMap: Record<SaaSNavTab, string> = {
    overview: '/dashboard',
    voice_receptionist: '/dashboard/voice-receptionist',
    missed_calls: '/dashboard/missed-calls',
    leads: '/dashboard/leads',
    crm: '/dashboard/crm',
    followup: '/dashboard/followup',
    reengagement: '/dashboard/reengagement',
    reviews: '/dashboard/reviews',
    appointments: '/dashboard/appointments',
    estimates: '/dashboard/estimates',
    outreach: '/dashboard/outreach',
    knowledge: '/dashboard/knowledge',
    conversations: '/dashboard/conversations',
    integrations: '/dashboard/integrations',
    billing: '/billing',
    localization: '/dashboard/localization',
    embed: '/embed',
    admin: '/admin',
    account_credentials: '/admin/account-credentials'
  };

  const getTabFromLocation = (): SaaSNavTab => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/billing') return 'billing';
    if (path === '/embed') return 'embed';
    if (path === '/admin/account-credentials') return 'account_credentials';
    if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
    const match = path.match(/^\\/dashboard\\/([^/]+)$/);
    const slugToTab: Record<string, SaaSNavTab> = {
      'voice-receptionist': 'voice_receptionist',
      'missed-calls': 'missed_calls',
      'leads': 'leads',
      'crm': 'crm',
      'followup': 'followup',
      'reengagement': 'reengagement',
      'reviews': 'reviews',
      'appointments': 'appointments',
      'estimates': 'estimates',
      'outreach': 'outreach',
      'knowledge': 'knowledge',
      'conversations': 'conversations',
      'integrations': 'integrations',
      'localization': 'localization'
    };
    return match && slugToTab[match[1]] ? slugToTab[match[1]] : 'overview';
  };

  type AgentDeskHistoryState = {
    agentDeskRoute?: boolean;
    agentDeskView?: AppView;
    agentDeskTab?: SaaSNavTab;
    agentDeskScrollY?: number;
  };

  const saveCurrentHistoryScroll = () => {
    if (typeof window === 'undefined' || !window.history) return;
    const currentState = (window.history.state || {}) as AgentDeskHistoryState;
    window.history.replaceState(
      { ...currentState, agentDeskScrollY: window.scrollY },
      '',
      window.location.href
    );
  };

  const pushAgentDeskRoute = (path: string, state: AgentDeskHistoryState) => {
    if (typeof window === 'undefined' || !window.history) return;
    if (window.location.pathname === path && !window.location.search && !window.location.hash) return;

    saveCurrentHistoryScroll();
    window.history.pushState(
      { ...state, agentDeskRoute: true, agentDeskScrollY: 0 },
      '',
      path
    );

    // New destinations start at the top, just like a normal page navigation.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const navigateTab = (tab: SaaSNavTab) => {
    const path = tabPathMap[tab] || '/dashboard';
    if (typeof window !== 'undefined' && window.location.pathname === path) {
      setActiveTab(tab);
      return;
    }
    setActiveTab(tab);
    if (tab === 'admin') setAdminSubTab('workspaces');
    pushAgentDeskRoute(path, { agentDeskView: 'dashboard', agentDeskTab: tab });
  };

  // Establish a state object for the entry the user originally loaded. This is
  // what lets Back restore the initial SPA screen instead of losing its state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const existingState = (window.history.state || {}) as AgentDeskHistoryState;
    window.history.replaceState(
      {
        ...existingState,
        agentDeskRoute: true,
        agentDeskView: resolveAppRoute(window.location.pathname, window.location.hash),
        agentDeskTab: getTabFromLocation(),
        agentDeskScrollY: window.scrollY
      },
      '',
      window.location.href
    );

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  const [adminSubTab, setAdminSubTab] = useState<'workspaces' | 'my_agent' | 'agents' | 'isolation_tests' | 'webhooks' | 'pricing_plans' | 'audit_logs'>(getInitialAdminSubTab);
  
  // Active business workspace state
  const [business, setBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceLoadError, setWorkspaceLoadError] = useState<string | null>(null);

  // Drawers & Modals
  const [showCopilot, setShowCopilot] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDemoWidget, setShowDemoWidget] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState<string | undefined>();
  const [upgradeFeatureReason, setUpgradeFeatureReason] = useState<string | undefined>();
  const [mobileDashboardDrawerOpen, setMobileDashboardDrawerOpen] = useState(false);

  const getActiveTabLabel = (tab: SaaSNavTab): string => {
    switch (tab) {
      case 'overview': return 'Overview';
      case 'voice_receptionist': return 'AI Voice Receptionist';
      case 'missed_calls': return 'Missed Call Recovery';
      case 'leads': return 'Leads & Qualification';
      case 'crm': return 'CRM & Deals Pipeline';
      case 'followup': return 'Follow-Up Cadence';
      case 'reengagement': return 'Re-Engagement';
      case 'reviews': return 'Reviews';
      case 'appointments': return 'Appointments';
      case 'estimates': return 'Estimates';
      case 'outreach': return 'Cold Outreach';
      case 'knowledge': return 'Knowledge Base';
      case 'conversations': return 'Transcripts';
      case 'integrations': return 'Integrations';
      case 'billing': return 'Billing & Usage';
      case 'localization': return 'Localization';
      case 'embed': return 'Deploy & Embed';
      case 'account_credentials': return 'Account & Credentials';
      case 'admin': return 'Platform Admin';
      default: return 'Overview';
    }
  };

  const handleOpenUpgradeModal = (feature?: string, targetPlan?: string) => {
    setUpgradeFeatureReason(feature);
    setUpgradeTargetPlan(targetPlan);
    setShowUpgradeModal(true);
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const resolvedView = resolveAppRoute(path, hash);

      if (resolvedView === 'dashboard') {
        const nextTab = getTabFromLocation();
        setCurrentView('dashboard');
        setActiveTab(nextTab);
        if (path === '/admin/agent' || path === '/admin/my-agent' || path === '/admin/my_agent' || hash === '#admin-agent' || hash === '#admin/agent') {
          setAdminSubTab('my_agent');
        } else if (nextTab === 'admin') {
          setAdminSubTab('workspaces');
        }
      } else {
        setCurrentView(resolvedView);
      }

      // popstate means the browser moved to an existing history entry. Never
      // push another entry here. Restore the entry's saved browsing position.
      const state = (event.state || {}) as AgentDeskHistoryState;
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: state.agentDeskScrollY || 0, left: 0, behavior: 'auto' });
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // The public landing page must not depend on tenant APIs or authenticated
    // workspace state. Load workspace data only after entering the dashboard.
    if (currentView !== 'dashboard') {
      setWorkspaceLoading(false);
      setWorkspaceLoadError(null);
      return;
    }

    // For Business Admin: strictly enforce active workspace matches authenticated tenantId
    if (currentUser?.role === 'BUSINESS_ADMIN' && currentUser.businessId) {
      if (activeBusinessId !== currentUser.businessId) {
        setActiveBusinessId(currentUser.businessId);
        return;
      }
    }

    let isMounted = true;
    async function loadWorkspaceData() {
      const targetId = activeBusinessId || currentUser?.businessId || (currentUser?.role === 'PLATFORM_ADMIN' ? 'platform' : PUBLIC_DEMO_TENANT_ID);
      if (!targetId) return;

      setWorkspaceLoading(true);
      setWorkspaceLoadError(null);

      try {
        if (targetId === 'platform') {
          const list = await getAllBusinesses();
          if (isMounted) {
            setAllBusinesses(list);
            if (list.length > 0) {
              setBusiness(list[0]);
            } else {
              setBusiness(PLATFORM_ADMIN_BUSINESS);
            }
            setWorkspaceLoading(false);
          }
          return;
        }

        let biz = await getBusinessById(targetId);

        // Fallback: If user belongs to this tenant but local storage didn't have it, create initial record
        if (!biz && currentUser && (currentUser.businessId === targetId || currentUser.tenantId === targetId)) {
          biz = {
            id: targetId,
            tenantId: targetId,
            name: (currentUser as any).businessName || currentUser.displayName || `${currentUser.email.split('@')[0]}'s Organization`,
            type: 'Professional Services',
            industry: 'Professional Services',
            description: 'AI-automated revenue operations workspace',
            status: 'active',
            plan: 'growth',
            planStatus: 'ACTIVE',
            subscriptionState: 'ACTIVE',
            currency: 'USD',
            phone: '',
            email: currentUser.email,
            website: '',
            supportEmail: currentUser.email,
            aiSettings: {
              receptionistName: 'AgentDesk AI',
              voiceTone: 'Professional',
              bookingLink: '',
              faq: [],
              systemInstructions: 'You are a professional AI assistant for AgentDesk.'
            },
            agentSettings: {
              activeAgentId: 'agent-' + targetId,
              autoReplyEnabled: true,
              callForwardingEnabled: false,
              voiceId: 'agent-voice-1',
              greetingMessage: 'Hello, thank you for reaching out to us. How can I assist your business today?'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as unknown as Business;
          await saveBusiness(biz);
        }

        const list = await getAllBusinesses();
        if (isMounted) setAllBusinesses(list);

        // Fallback to first available if requested workspace does not exist
        if (!biz && list.length > 0) {
          biz = list[0];
        }

        if (isMounted) {
          if (biz) {
            setBusiness(biz);
            setWorkspaceLoadError(null);
          } else {
            setWorkspaceLoadError(`Workspace "${targetId}" could not be located.`);
          }
          const notifs = await getNotifications(biz?.id || targetId);
          setNotifications(notifs);
          setWorkspaceLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setWorkspaceLoadError(err.message || 'Failed to load workspace data');
          setWorkspaceLoading(false);
        }
      }
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
    let target = view;
    if (view === 'get-started' || view === 'signup') target = 'checkout';

    const validViews: AppView[] = ['landing', 'pricing', 'login', 'platform_login', 'onboarding', 'checkout', 'dashboard'];
    if (!validViews.includes(target as AppView)) return;

    if (target === 'dashboard' && !currentUser) {
      setCurrentView('login');
      pushAgentDeskRoute('/login', { agentDeskView: 'login' });
      return;
    }

    const pathMap: Record<AppView, string> = {
      landing: '/',
      pricing: '/pricing',
      login: '/login',
      platform_login: '/platform/login',
      onboarding: '/get-started',
      checkout: '/get-started',
      dashboard: '/dashboard',
      setup_account: '/setup-account',
      reset_password: '/reset-password',
      verify_email: '/verify-email'
    };
    const nextPath = pathMap[target as AppView] || '/';

    setCurrentView(target as AppView);
    if (target === 'dashboard') {
      setActiveTab('overview');
      if (typeof window !== 'undefined' && window.location.pathname === '/dashboard') {
        return;
      }
    }

    pushAgentDeskRoute(nextPath, { agentDeskView: target as AppView, agentDeskTab: target === 'dashboard' ? 'overview' : undefined });
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
        {currentView === 'setup_account' ? (
          <AccountSetupPage
            onSuccess={(businessId) => {
              if (businessId) {
                setActiveBusinessId(businessId);
              }
              refreshAuth();
              handleNavigate('dashboard');
            }}
            onNavigateLogin={() => handleNavigate('login')}
          />
        ) : currentView === 'reset_password' ? (
          <PasswordResetPage
            onSuccess={() => handleNavigate('login')}
            onNavigateLogin={() => handleNavigate('login')}
          />
        ) : currentView === 'verify_email' ? (
          <EmailVerificationPage
            onSuccess={() => handleNavigate('login')}
            onNavigateLogin={() => handleNavigate('login')}
          />
        ) : currentView === 'login' ? (
          <BusinessLoginPage
            onLoginSuccess={() => handleNavigate('dashboard')}
            onNavigateSignup={() => handleNavigate('onboarding')}
            onNavigatePlatformLogin={() => handleNavigate('platform_login')}
            onCancel={() => handleNavigate('landing')}
          />
        ) : currentView === 'platform_login' ? (
          <PlatformAdminLoginPage
            onLoginSuccess={() => {
              navigateTab('admin');
              setAdminSubTab('workspaces');
              handleNavigate('dashboard');
            }}
            onNavigateBusinessLogin={() => handleNavigate('login')}
            onCancel={() => handleNavigate('landing')}
          />
        ) : currentView === 'checkout' || currentView === 'onboarding' ? (
          <AgentDeskCheckout
            initialPlanId="starter"
            isModal={false}
            onNavigateHome={() => handleNavigate('landing')}
            onNavigateLogin={() => handleNavigate('login')}
            onSuccess={async (provisioned) => {
              const list = await getAllBusinesses();
              setAllBusinesses(list);
              setActiveBusinessId(provisioned.tenantId);
              setCurrentView('dashboard');
              navigateTab('overview');
            }}
          />
        ) : currentView === 'landing' ? (
          <LandingPage
            onOpenDemo={() => setShowDemoWidget(true)}
            onOpenAuth={() => handleNavigate('login')}
            onNavigateGetStarted={() => handleNavigate('onboarding')}
            onNavigateLogin={() => handleNavigate('login')}
            onNavigatePlatformLogin={() => handleNavigate('platform_login')}
            onOpenDashboard={(tenantId) => {
              if (tenantId) {
                setActiveBusinessId(tenantId);
              }
              handleNavigate('dashboard');
            }}
            onOpenPricing={() => handleNavigate('pricing')}
            onWorkspaceCreated={async (tenantId) => {
              const list = await getAllBusinesses();
              setAllBusinesses(list);
              setActiveBusinessId(tenantId);
              setCurrentView('dashboard');
              navigateTab('overview');
            }}
          />
        ) : currentView === 'pricing' ? (
          <PricingPage
            onOpenDashboard={(tenantId) => {
              if (tenantId) {
                setActiveBusinessId(tenantId);
              }
              handleNavigate('dashboard');
            }}
            onOpenDemo={() => setShowDemoWidget(true)}
            onWorkspaceCreated={async (tenantId) => {
              const list = await getAllBusinesses();
              setAllBusinesses(list);
              setActiveBusinessId(tenantId);
              setCurrentView('dashboard');
              navigateTab('overview');
            }}
          />
        ) : !currentUser ? (
          <BusinessLoginPage
            onLoginSuccess={() => handleNavigate('dashboard')}
            onNavigateSignup={() => handleNavigate('onboarding')}
            onNavigatePlatformLogin={() => handleNavigate('platform_login')}
            onCancel={() => handleNavigate('landing')}
          />
        ) : currentUser.mustChangePassword ? (
          <ForcedPasswordChangePage
            onSuccess={async () => {
              await refreshAuth();
              setCurrentView('dashboard');
              navigateTab('overview');
            }}
          />
        ) : currentUser?.role === 'PLATFORM_ADMIN' && activeTab === 'admin' ? (
          <PlatformAdminDashboard
            initialTab={adminSubTab as any}
            allBusinesses={allBusinesses}
            onSelectBusinessWorkspace={(bizId) => {
              setActiveBusinessId(bizId);
              navigateTab('overview');
            }}
            onSwitchToBusinessConsole={() => {
              if (allBusinesses.length > 0 && (!business || business.id === 'platform')) {
                setActiveBusinessId(allBusinesses[0].id);
              }
              navigateTab('overview');
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
                          navigateTab('admin');
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
                        navigateTab('admin');
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

              {/* Omnichannel Suite Tabs Bar (Desktop: Horizontal, Mobile: Mobile Drawer) */}
              <div className="hidden xl:flex items-center gap-1.5 pt-4 overflow-x-auto pb-1 text-xs">
                {/* 1. Overview */}
                <button
                  onClick={() => navigateTab('overview')}
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
                  onClick={() => navigateTab('voice_receptionist')}
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
                  onClick={() => navigateTab('missed_calls')}
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
                  onClick={() => navigateTab('leads')}
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
                  onClick={() => navigateTab('crm')}
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
                  onClick={() => navigateTab('followup')}
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
                  onClick={() => navigateTab('reengagement')}
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
                  onClick={() => navigateTab('reviews')}
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
                  onClick={() => navigateTab('appointments')}
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
                  onClick={() => navigateTab('estimates')}
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
                  onClick={() => navigateTab('outreach')}
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
                  onClick={() => navigateTab('knowledge')}
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
                  onClick={() => navigateTab('conversations')}
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
                  onClick={() => navigateTab('integrations')}
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
                  onClick={() => navigateTab('billing')}
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
                  onClick={() => navigateTab('localization')}
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
                  onClick={() => navigateTab('embed')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'embed'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 text-blue-400" />
                  <span>Deploy & Embed</span>
                </button>

                {/* 18. Account & Credentials (Business Owner Self-Service) */}
                <button
                  onClick={() => navigateTab('account_credentials')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'account_credentials'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Account & Credentials</span>
                </button>

                {/* 19. Platform Admin (Only if Platform Admin) */}
                {currentUser?.role === 'PLATFORM_ADMIN' && (
                  <button
                    onClick={() => {
                      navigateTab('admin');
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

              {/* Mobile Dashboard Navigation Bar (< xl Viewports) */}
              <div className="xl:hidden pt-3.5 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">Current View:</span>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-bold truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" />
                    <span className="truncate">{getActiveTabLabel(activeTab)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setMobileDashboardDrawerOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
                  aria-label="Open Navigation Modules Drawer"
                >
                  <Menu className="w-4 h-4 text-blue-400" />
                  <span>Modules</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-black">
                    {18 + (currentUser?.role === 'PLATFORM_ADMIN' ? 1 : 0)}
                  </span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileDashboardDrawerOpen && (
              <div 
                className="fixed inset-0 z-50 xl:hidden flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
                onClick={() => setMobileDashboardDrawerOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-label="Modules Navigation Drawer"
              >
                <div 
                  className="w-full max-w-xs sm:max-w-sm h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>RevenueOS Suite</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                          Modules
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {business?.name || 'Workspace Console'}
                      </p>
                    </div>
                    <button
                      onClick={() => setMobileDashboardDrawerOpen(false)}
                      className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                      aria-label="Close Drawer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Grouped Modules */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {/* 1. Core Operations */}
                    <div className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Core Operations
                      </div>
                      {[
                        { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-blue-400' },
                        { id: 'voice_receptionist', label: 'AI Voice Receptionist', icon: PhoneCall, color: 'text-emerald-400' },
                        { id: 'missed_calls', label: 'Missed Call Recovery', icon: PhoneMissed, color: 'text-amber-400' },
                        { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'text-blue-400' },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              navigateTab(item.id as SaaSNavTab);
                              setMobileDashboardDrawerOpen(false);
                            }}
                            className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer text-left ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                            <span className="flex-1">{item.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* 2. Revenue & CRM */}
                    <div className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Revenue & CRM Pipeline
                      </div>
                      {[
                        { id: 'leads', label: 'Leads & Qualification', icon: Users, color: 'text-purple-400' },
                        { id: 'crm', label: 'CRM & Deals Pipeline', icon: Users, color: 'text-blue-400' },
                        { id: 'followup', label: 'Follow-Up Cadence', icon: Repeat, color: 'text-emerald-400' },
                        { id: 'reengagement', label: 'Re-Engagement', icon: RotateCcw, color: 'text-purple-400' },
                        { id: 'reviews', label: 'Reviews & Reputation', icon: Star, color: 'text-amber-400' },
                        { id: 'estimates', label: 'Estimates & Quotes', icon: FileText, color: 'text-indigo-400' },
                        { id: 'outreach', label: 'Cold Outreach', icon: Send, color: 'text-blue-400' },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              navigateTab(item.id as SaaSNavTab);
                              setMobileDashboardDrawerOpen(false);
                            }}
                            className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer text-left ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                            <span className="flex-1">{item.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* 3. AI & Knowledge */}
                    <div className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Intelligence & Knowledge
                      </div>
                      {[
                        { id: 'knowledge', label: 'Knowledge Base', icon: Database, color: 'text-slate-400' },
                        { id: 'conversations', label: 'Transcripts & Logs', icon: MessageSquare, color: 'text-slate-400' },
                        { id: 'embed', label: 'Deploy & Embed Widget', icon: Code, color: 'text-blue-400' },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              navigateTab(item.id as SaaSNavTab);
                              setMobileDashboardDrawerOpen(false);
                            }}
                            className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer text-left ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                            <span className="flex-1">{item.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* 4. Settings & Administration */}
                    <div className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Settings & Account
                      </div>
                      {[
                        { id: 'integrations', label: 'Integrations', icon: Sliders, color: 'text-blue-400' },
                        { id: 'billing', label: 'Billing & Usage Quotas', icon: CreditCard, color: 'text-emerald-400' },
                        { id: 'localization', label: 'Localization & Market', icon: Globe, color: 'text-blue-400' },
                        { id: 'account_credentials', label: 'Account & Credentials', icon: KeyRound, color: 'text-amber-400' },
                        ...(currentUser?.role === 'PLATFORM_ADMIN' ? [
                          { id: 'admin', label: 'Platform Multi-Tenant Oversight', icon: ShieldCheck, color: 'text-purple-400' }
                        ] : [])
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              navigateTab(item.id as SaaSNavTab);
                              setMobileDashboardDrawerOpen(false);
                            }}
                            className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer text-left ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                            <span className="flex-1">{item.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400 flex items-center justify-between">
                    <span className="text-[11px] font-medium">AgentDesk RevenueOS</span>
                    <button
                      onClick={() => {
                        setShowCopilot(true);
                        setMobileDashboardDrawerOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-600/30"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Copilot</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Content Container */}
            {activeTab === 'admin' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Access Denied (403 Forbidden)</h3>
                <p className="text-xs text-slate-400 mb-6">
                  The Platform Multi-Tenant Control Plane is restricted exclusively to authenticated Platform Administrators. Your account role ({currentUser?.role}) is not authorized.
                </p>
                <button
                  onClick={() => navigateTab('overview')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Return to Business Console
                </button>
              </div>
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
                    onNavigateTab={(tab) => navigateTab(tab as SaaSNavTab)}
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

                {activeTab === 'account_credentials' && (
                  <BusinessAccountSettings business={business} />
                )}
              </div>
            ) : workspaceLoadError ? (
              <div className="py-16 px-4 max-w-lg mx-auto text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Workspace Unavailable</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  {workspaceLoadError}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setWorkspaceLoading(true);
                      setWorkspaceLoadError(null);
                      const targetId = activeBusinessId || currentUser?.businessId || (currentUser?.role === 'PLATFORM_ADMIN' ? 'platform' : PUBLIC_DEMO_TENANT_ID);
                      getBusinessById(targetId).then(b => {
                        if (b) setBusiness(b);
                        setWorkspaceLoading(false);
                      }).catch(() => setWorkspaceLoading(false));
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Loading</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveBusinessId(PUBLIC_DEMO_TENANT_ID);
                      setBusiness(PUBLIC_AGENTDESK_DEMO_BUSINESS);
                      setWorkspaceLoadError(null);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Switch to Demo Workspace</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading workspace data...</span>
                <button
                  onClick={() => {
                    setActiveBusinessId(PUBLIC_DEMO_TENANT_ID);
                    setBusiness(PUBLIC_AGENTDESK_DEMO_BUSINESS);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors"
                >
                  Taking too long? Open demo workspace
                </button>
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
          onNavigateTab={(tabId) => navigateTab(tabId as SaaSNavTab)}
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
          onNavigateTab={(tabId) => navigateTab(tabId as SaaSNavTab)}
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
        onSuccess={(targetView) => {
          if (targetView === 'onboarding') {
            handleNavigate('onboarding');
          } else {
            handleNavigate('dashboard');
          }
        }}
        onNavigateGetStarted={() => handleNavigate('onboarding')}
        onNavigatePlatformLogin={() => handleNavigate('platform_login')}
      />
    </div>
  );
}
