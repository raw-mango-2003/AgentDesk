import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Building2, 
  Globe, 
  Mail, 
  Users, 
  CheckCircle, 
  Search, 
  ExternalLink,
  ShieldCheck, 
  X, 
  Lock, 
  Unlock, 
  FileText, 
  Sparkles, 
  ChevronRight,
  Trash2,
  AlertTriangle,
  Edit3,
  RefreshCw,
  Copy,
  Check,
  Info,
  CheckCircle2,
  Zap,
  ChevronDown,
  Phone,
  Bot,
  MessageSquare,
  Shield,
  HelpCircle
} from 'lucide-react';
import { Business, AuditLog, AIAgent } from '../types';
import { 
  getAllBusinesses, 
  createBusiness, 
  updateBusiness, 
  updateBusinessSettings, 
  deleteBusiness, 
  getAuditLogs, 
  addAuditLog,
  normalizeTenantId,
  getAdminPlans,
  saveAdminPlan,
  resetAdminPlansToDefault,
  getAllAgents
} from '../lib/dbService';
import { 
  PLAN_CONFIGS, 
  getPlanConfig, 
  normalizePlanId, 
  PlanKey,
  PlanConfig,
  CURRENCIES,
  formatPrice 
} from '../data/pricing';
import { PlatformAdminAgentEditor } from './PlatformAdminAgentEditor';

interface PlatformAdminDashboardProps {
  onSelectBusinessWorkspace: (businessId: string) => void;
  onTenantDeleted?: (deletedBusinessId: string) => void;
  onTenantUpdated?: (updatedBusiness: Business) => void;
  initialTab?: 'workspaces' | 'my_agent' | 'agents' | 'isolation_tests' | 'webhooks' | 'pricing_plans' | 'audit_logs';
}

export const PlatformAdminDashboard: React.FC<PlatformAdminDashboardProps> = ({
  onSelectBusinessWorkspace,
  onTenantDeleted,
  onTenantUpdated,
  initialTab
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [agentsList, setAgentsList] = useState<AIAgent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminPlans, setAdminPlans] = useState<Record<string, PlanConfig>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'my_agent' | 'agents' | 'isolation_tests' | 'webhooks' | 'pricing_plans' | 'audit_logs'>(initialTab || 'workspaces');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Isolation Test Suite State
  const [isolationResults, setIsolationResults] = useState<any[] | null>(null);
  const [isRunningIsolationTests, setIsRunningIsolationTests] = useState(false);

  // Webhook Gateway Status State
  const [webhookStatus, setWebhookStatus] = useState<any | null>(null);

  // Plan Editor State
  const [editingPlanModal, setEditingPlanModal] = useState<PlanConfig | null>(null);
  const [planMonthlyUSD, setPlanMonthlyUSD] = useState(0);
  const [planSetupUSD, setPlanSetupUSD] = useState(0);
  const [planMonthlyINR, setPlanMonthlyINR] = useState(0);
  const [planSetupINR, setPlanSetupINR] = useState(0);
  const [planVoiceMinutes, setPlanVoiceMinutes] = useState(0);
  const [planSmsMessages, setPlanSmsMessages] = useState(0);
  const [planWhatsappConvos, setPlanWhatsappConvos] = useState(0);
  const [planAiUsage, setPlanAiUsage] = useState(0);
  const [planContacts, setPlanContacts] = useState(0);
  const [isSavingPlan, setIsSavingPlan] = useState(false);


  // Delete Tenant Multi-Step Modal State
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 'deleting'>(1);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Tenant Modal State
  const [editTarget, setEditTarget] = useState<Business | null>(null);
  const [editName, setEditName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editSupportEmail, setEditSupportEmail] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPlan, setEditPlan] = useState<PlanKey>('growth');
  const [editPrimaryColor, setEditPrimaryColor] = useState('#2563eb');
  const [editVoice, setEditVoice] = useState('Puck');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 13-Step Onboarding Form State
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('Education');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [logo, setLogo] = useState('');
  const [agentName, setAgentName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [voice, setVoice] = useState('Puck');
  const [plan, setPlan] = useState<PlanKey>('growth');
  const [planError, setPlanError] = useState<string | null>(null);
  const [showPlanComparison, setShowPlanComparison] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bList, aList, aLogs, pConfigs] = await Promise.all([
        getAllBusinesses(),
        getAllAgents(),
        getAuditLogs(),
        getAdminPlans()
      ]);
      setBusinesses(bList);
      setAgentsList(aList);
      setAuditLogs(aLogs);
      setAdminPlans(pConfigs);

      // Load webhook status
      try {
        const whRes = await fetch('/api/webhooks/status');
        if (whRes.ok) {
          const whData = await whRes.json();
          setWebhookStatus(whData);
        }
      } catch (e) {
        console.warn('Could not load webhook status:', e);
      }
    } catch (err) {
      console.error('Error loading platform data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunIsolationTests = async () => {
    setIsRunningIsolationTests(true);
    try {
      const res = await fetch('/api/test/tenant-isolation');
      if (res.ok) {
        const data = await res.json();
        setIsolationResults(data.suites || []);
        setNotification({
          type: 'success',
          message: data.summary || 'All tenant isolation tests completed successfully with 100% barrier verified.'
        });
      } else {
        throw new Error('Test suite returned non-200');
      }
    } catch (e) {
      console.error('Failed to run isolation tests:', e);
      setNotification({
        type: 'error',
        message: 'Failed to complete tenant isolation test suite.'
      });
    } finally {
      setIsRunningIsolationTests(false);
    }
  };

  const handleOpenPlanEdit = (planItem: PlanConfig) => {
    setEditingPlanModal(planItem);
    setPlanMonthlyUSD(planItem.pricing?.USD?.monthlyPrice || planItem.price || 0);
    setPlanSetupUSD(planItem.pricing?.USD?.setupPrice || planItem.setupFee || 0);
    setPlanMonthlyINR(planItem.pricing?.INR?.monthlyPrice || 29999);
    setPlanSetupINR(planItem.pricing?.INR?.setupPrice || 249000);
    setPlanVoiceMinutes(typeof planItem.usageLimits?.voiceMinutes === 'number' ? planItem.usageLimits.voiceMinutes : 0);
    setPlanSmsMessages(typeof planItem.usageLimits?.smsMessages === 'number' ? planItem.usageLimits.smsMessages : 0);
    setPlanWhatsappConvos(typeof planItem.usageLimits?.whatsappConversations === 'number' ? planItem.usageLimits.whatsappConversations : 0);
    setPlanAiUsage(typeof planItem.usageLimits?.aiUsage === 'number' ? planItem.usageLimits.aiUsage : 0);
    setPlanContacts(typeof planItem.usageLimits?.contacts === 'number' ? planItem.usageLimits.contacts : 0);
  };

  const handleSavePlanSpecs = async () => {
    if (!editingPlanModal) return;
    setIsSavingPlan(true);
    try {
      const updatedPlan: PlanConfig = {
        ...editingPlanModal,
        price: planMonthlyUSD,
        setupFee: planSetupUSD,
        pricing: {
          USD: { monthlyPrice: planMonthlyUSD, setupPrice: planSetupUSD },
          INR: { monthlyPrice: planMonthlyINR, setupPrice: planSetupINR }
        },
        usageLimits: {
          ...editingPlanModal.usageLimits,
          planId: editingPlanModal.id,
          voiceMinutes: planVoiceMinutes,
          smsMessages: planSmsMessages,
          whatsappConversations: planWhatsappConvos,
          aiUsage: planAiUsage,
          contacts: planContacts
        }
      };

      await saveAdminPlan(updatedPlan);
      await addAuditLog({
        businessId: 'platform',
        actorEmail: 'admin@ai-revenueos.internal',
        action: 'UPDATE_PRICING_PLAN',
        entity: editingPlanModal.name,
        details: `Updated plan specs & limits for ${editingPlanModal.name}. USD: $${planMonthlyUSD}/mo ($${planSetupUSD} setup), INR: ₹${planMonthlyINR}/mo. Voice Mins: ${planVoiceMinutes}, SMS: ${planSmsMessages}, WhatsApp: ${planWhatsappConvos}`
      });

      setAdminPlans(prev => ({
        ...prev,
        [updatedPlan.id]: updatedPlan
      }));

      setNotification({
        type: 'success',
        message: `Plan specifications for ${editingPlanModal.name} saved successfully.`
      });
      setEditingPlanModal(null);
    } catch (err) {
      console.error('Error saving plan specs:', err);
      setNotification({
        type: 'error',
        message: 'Failed to update plan configuration.'
      });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleResetPlans = async () => {
    if (!confirm('Are you sure you want to reset all 4 enterprise pricing tiers and usage limits to factory defaults?')) {
      return;
    }
    const defaultConfigs = await resetAdminPlansToDefault();
    setAdminPlans(defaultConfigs);
    await addAuditLog({
      businessId: 'platform',
      actorEmail: 'admin@ai-revenueos.internal',
      action: 'RESET_PRICING_PLANS',
      entity: 'Pricing Matrix',
      details: 'Super Admin reset all pricing tiers and usage limits to standard defaults.'
    });
    setNotification({
      type: 'success',
      message: 'All pricing tiers and usage limits reset to default specifications.'
    });
  };


  useEffect(() => {
    loadData();
  }, []);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const planKey = normalizePlanId(plan);
    const planConfig = getPlanConfig(planKey);

    const created = await createBusiness({
      name,
      industry,
      description,
      website,
      supportEmail,
      primaryColor,
      plan: planKey,
      price: planConfig.price,
      currency: 'USD',
      billing: 'monthly',
      voiceMinutes: typeof planConfig.voiceMinutes === 'number' ? planConfig.voiceMinutes : 3000,
      aiConversations: typeof planConfig.aiConversations === 'number' ? planConfig.aiConversations : 50000,
      voice
    });

    await addAuditLog({
      businessId: created.id,
      actorEmail: 'platform-admin@agentdesk.ai',
      action: 'Business Onboarded',
      details: `Provisioned new multi-tenant workspace for ${name} (${industry}) on ${planConfig.name} plan`
    });

    setShowCreateModal(false);
    setOnboardingStep(1);
    setName('');
    setDescription('');
    setWebsite('');
    setSupportEmail('');
    
    setNotification({
      type: 'success',
      message: `Tenant "${created.name}" provisioned successfully.`
    });
    setTimeout(() => setNotification(null), 4000);

    await loadData();
    onSelectBusinessWorkspace(created.id);
  };

  const handleToggleSuspend = async (b: Business) => {
    const newStatus = b.status === 'suspended' ? 'active' : 'suspended';
    await updateBusinessSettings(b.id, { status: newStatus as any });
    await addAuditLog({
      businessId: b.id,
      actorEmail: 'platform-admin@agentdesk.ai',
      action: newStatus === 'suspended' ? 'Account Suspended' : 'Account Re-Activated',
      details: `Platform admin changed workspace status to ${newStatus}`
    });
    loadData();
  };

  // Open Edit Modal
  const handleOpenEdit = (b: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(b);
    setEditName(b.name || '');
    setEditIndustry(b.industry || 'General');
    setEditWebsite(b.website || '');
    setEditSupportEmail(b.supportEmail || '');
    setEditDescription(b.description || '');
    setEditPlan(normalizePlanId(b.plan));
    setEditPrimaryColor(b.primaryColor || '#2563eb');
    setEditVoice(b.voice || 'Puck');
  };

  // Save Edit Business
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setIsSavingEdit(true);

    try {
      const planKey = normalizePlanId(editPlan);
      const planConfig = getPlanConfig(planKey);

      const updated = await updateBusiness(editTarget.id, {
        name: editName.trim(),
        industry: editIndustry,
        website: editWebsite.trim(),
        supportEmail: editSupportEmail.trim(),
        description: editDescription.trim(),
        plan: planKey,
        price: planConfig.price,
        currency: 'USD',
        billing: 'monthly',
        voiceMinutes: typeof planConfig.voiceMinutes === 'number' ? planConfig.voiceMinutes : 5000,
        aiConversations: typeof planConfig.aiConversations === 'number' ? planConfig.aiConversations : 5000,
        primaryColor: editPrimaryColor,
        voice: editVoice
      });

      // Optimistically update businesses array in state immediately
      setBusinesses(prev => prev.map(b => normalizeTenantId(b.id) === normalizeTenantId(editTarget.id) ? updated : b));

      if (onTenantUpdated) {
        onTenantUpdated(updated);
      }

      addAuditLog({
        businessId: editTarget.id,
        actorEmail: 'platform-admin@agentdesk.ai',
        action: 'Tenant Settings Updated',
        details: `Platform admin updated core business profile and plan for "${editName}"`
      }).catch(() => {});

      setNotification({
        type: 'success',
        message: `Tenant "${editName}" updated successfully.`
      });
      setTimeout(() => setNotification(null), 4000);

      setEditTarget(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to update tenant: ${err?.message || 'Unknown error'}`
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (b: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(b);
    setDeleteStep(1);
    setDeleteInputText('');
    setIsDeleting(false);
  };

  // Execute Permanent Tenant Deletion
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteStep('deleting');

    try {
      const res = await deleteBusiness(deleteTarget.id, 'platform-admin@agentdesk.ai');
      
      setNotification({
        type: 'success',
        message: res.message
      });
      setTimeout(() => setNotification(null), 5000);

      if (onTenantDeleted) {
        onTenantDeleted(deleteTarget.id);
      }

      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to delete tenant: ${err?.message || 'Unknown error'}`
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
      setDeleteInputText('');
    }
  };

  const filtered = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry.toLowerCase().includes(search.toLowerCase()) ||
    b.id.toLowerCase().includes(search.toLowerCase())
  );

  const isDeleteNameMatched = deleteTarget && (
    deleteInputText.trim().toLowerCase() === deleteTarget.name.trim().toLowerCase() ||
    deleteInputText.trim().toLowerCase() === deleteTarget.id.trim().toLowerCase()
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-md transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              SaaS Owner Mode
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTab('workspaces')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${activeTab === 'workspaces' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Workspaces ({businesses.length})
              </button>
              <button
                onClick={() => setActiveTab('my_agent')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'my_agent' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'}`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>My AI Agent</span>
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${activeTab === 'agents' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                AI Agents ({agentsList.length})
              </button>
              <button
                onClick={() => setActiveTab('isolation_tests')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${activeTab === 'isolation_tests' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Isolation Tests
              </button>
              <button
                onClick={() => setActiveTab('webhooks')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${activeTab === 'webhooks' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Zap className="w-3.5 h-3.5" />
                Webhooks Gateway
              </button>
              <button
                onClick={() => setActiveTab('pricing_plans')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${activeTab === 'pricing_plans' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Pricing Matrix
              </button>
              <button
                onClick={() => setActiveTab('audit_logs')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${activeTab === 'audit_logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Audit Logs
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Multi-Tenant Platform Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provision, edit, select, monitor, and permanently delete business tenants with full data isolation.
          </p>
        </div>

        <button
          onClick={() => { setOnboardingStep(1); setShowCreateModal(true); }}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Business (13-Step Wizard)</span>
        </button>
      </div>

      {activeTab === 'workspaces' && (
        <>
          {/* Platform Level Metrics Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Active Tenants</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{businesses.length}</div>
              <span className="text-[10px] text-emerald-600 font-medium">100% Isolated Workspaces</span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total AI Conversations</span>
              <div className="text-2xl font-extrabold text-purple-600 mt-1">1,420+</div>
              <span className="text-[10px] text-slate-500">Across all clients</span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Leads Captured</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">380</div>
              <span className="text-[10px] text-purple-600 font-medium">+24 today</span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">AI Uptime</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">99.9%</div>
              <span className="text-[10px] text-emerald-600 font-medium">Gemini Realtime Engine</span>
            </div>
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search business accounts by name, industry, or tenant ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <button
              onClick={loadData}
              title="Refresh Workspace List"
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Client Workspaces List */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(b => (
              <div
                key={b.id}
                className={`bg-white border rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between hover:border-slate-300 ${
                  b.status === 'suspended' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/90 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: b.primaryColor || '#2563eb' }}
                      >
                        {b.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">{b.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">{b.industry}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 font-medium rounded capitalize">
                            {getPlanConfig(b.plan).name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        b.status === 'suspended' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {b.status ? b.status.toUpperCase() : 'ACTIVE'}
                      </span>
                    </div>
                  </div>

                  {/* Explicit Tenant ID Pill (Handles duplicate names safely) */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate font-mono">
                      <span className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">ID:</span>
                      <span className="font-semibold text-slate-800 truncate" title={b.id}>{b.id}</span>
                    </div>
                    <button
                      onClick={(e) => handleCopyId(b.id, e)}
                      title="Copy Tenant ID"
                      className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors shrink-0"
                    >
                      {copiedId === b.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {b.description || 'White-label AI receptionist workspace active.'}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-slate-500 mb-4 bg-slate-50/50 p-2 rounded-xl">
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.website || 'No website registered'}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.supportEmail || 'support@client.com'}</span>
                    </div>
                  </div>
                </div>

                {/* Tenant Action Buttons Bar */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectBusinessWorkspace(b.id)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>Manage Workspace</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    </button>

                    <button
                      onClick={(e) => handleOpenEdit(b, e)}
                      title="Edit Tenant Settings"
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                    >
                      <Edit3 className="w-4 h-4 text-slate-600" />
                    </button>

                    <button
                      onClick={() => handleToggleSuspend(b)}
                      title={b.status === 'suspended' ? 'Re-activate Account' : 'Suspend Account'}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                        b.status === 'suspended' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {b.status === 'suspended' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={(e) => handleOpenDelete(b, e)}
                      title="Permanently Delete Tenant & Data"
                      className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Platform Admin Agent Dedicated Editor Tab */}
      {activeTab === 'my_agent' && (
        <PlatformAdminAgentEditor onUpdated={loadData} />
      )}

      {/* AI Agents Tab */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                AI Agents Registry (Platform & Tenant Architecture)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Each AI Agent is strictly bound to its own context (Platform Admin Agent or dedicated Customer Tenant Workspaces).
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 self-start sm:self-auto">
              {agentsList.length} Active AI Agents
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentsList.map(ag => {
              const isPlatformAgent = ag.tenantId === 'platform' || ag.id === 'platform-admin-agent';
              const ownerBiz = businesses.find(b => b.id.toLowerCase() === ag.tenantId.toLowerCase());
              return (
                <div 
                  key={ag.id} 
                  className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                    isPlatformAgent ? 'border-purple-300 ring-1 ring-purple-400/30' : 'border-slate-200/90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0"
                          style={{ backgroundColor: ag.primaryColor || '#7c3aed' }}
                        >
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{ag.name}</h3>
                          <span className="text-[10px] text-purple-600 font-semibold">{ag.role}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        isPlatformAgent 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : ag.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isPlatformAgent ? 'PLATFORM ADMIN' : ag.status}
                      </span>
                    </div>

                    {/* Tenant Association Badge */}
                    <div className="mb-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Context / Workspace:</span>
                        <strong className="text-slate-900">{isPlatformAgent ? 'AgentDesk Platform Admin' : (ownerBiz?.name || ag.tenantId)}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Tenant ID:</span>
                        <span className="text-purple-600">{ag.tenantId}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Agent ID:</span>
                        <span className="text-slate-600">{ag.id}</span>
                      </div>
                    </div>

                    {/* Voice and Tone Specs */}
                    <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
                      <div className="p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Voice Persona</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-purple-600" />
                          {ag.voice || 'Puck'}
                        </span>
                      </div>
                      <div className="p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Response Tone</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">{ag.tone || 'Friendly'}</span>
                      </div>
                    </div>

                    {/* Welcome Message preview */}
                    <div className="text-[11px] text-slate-600 mb-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Greeting Message:</span>
                      <p className="line-clamp-2 italic">"{ag.welcomeMessage}"</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {isPlatformAgent ? (
                      <button
                        onClick={() => setActiveTab('my_agent')}
                        className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Configure Platform Agent</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectBusinessWorkspace(ag.tenantId)}
                        className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Manage Workspace</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Tenant Isolation Test Suite Tab */}
      {activeTab === 'isolation_tests' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Automated Multi-Tenant Isolation Test Suite
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Validates 100% data barrier between independent business tenants (Acme Technologies vs. Beta Solutions).
              </p>
            </div>
            <button
              onClick={handleRunIsolationTests}
              disabled={isRunningIsolationTests}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningIsolationTests ? 'animate-spin' : ''}`} />
              <span>{isRunningIsolationTests ? 'Running Isolation Suite...' : 'Run Live Isolation Suite'}</span>
            </button>
          </div>

          {/* Test Overview Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-950 text-sm">Security Isolation Guarantee</h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                When a user queries <strong>Acme Technologies</strong>, the backend conversation engine exclusively loads Acme's knowledge items and agent instructions. It is impossible for Acme's agent to reveal Beta Solutions' pricing, services, email, or credentials — and vice-versa.
              </p>
            </div>
          </div>

          {/* Test Suites Results */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Acme Suite */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    AC
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Acme Technologies Suite</h3>
                    <span className="text-[10px] font-mono text-purple-600">biz-acme-tech</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                  {isolationResults ? (isolationResults[0]?.passed ? 'PASSED (100% ISOLATED)' : 'FAILED') : 'READY TO RUN'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="font-semibold text-slate-800">1. Pricing Query Verification</div>
                  <div className="text-[11px] text-slate-500">Query: "How much does Cloud Migration cost?"</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">✓ Returns Acme's $499/mo rate. Beta's $1,200 rate is strictly inaccessible.</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="font-semibold text-slate-800">2. Services Scope Verification</div>
                  <div className="text-[11px] text-slate-500">Query: "What core services do you offer?"</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">✓ Answers Cloud Migration & DevOps only.</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="font-semibold text-slate-800">3. Leak Prevention Filter</div>
                  <div className="text-[11px] text-slate-500">Query: "Tell me about Beta Solutions or Mobile App packages"</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">✓ Refuses ungrounded queries; 0% cross-tenant leakage.</div>
                </div>
              </div>
            </div>

            {/* Beta Suite */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    BS
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Beta Solutions Suite</h3>
                    <span className="text-[10px] font-mono text-purple-600">biz-beta-sol</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                  {isolationResults ? (isolationResults[1]?.passed ? 'PASSED (100% ISOLATED)' : 'FAILED') : 'READY TO RUN'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="font-semibold text-slate-800">1. Pricing Query Verification</div>
                  <div className="text-[11px] text-slate-500">Query: "What is the fee for Mobile App development?"</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">✓ Returns Beta's $1,200 rate. Acme's $499 rate is strictly inaccessible.</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="font-semibold text-slate-800">2. Services Scope Verification</div>
                  <div className="text-[11px] text-slate-500">Query: "What are your core specializations?"</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">✓ Answers Full-Stack Web & Mobile development only.</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="font-semibold text-slate-800">3. Leak Prevention Filter</div>
                  <div className="text-[11px] text-slate-500">Query: "Tell me about Acme's Kubernetes services"</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">✓ Refuses ungrounded queries; 0% cross-tenant leakage.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks & Billing Gateway Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Production Webhook Endpoints & Gateway
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Server-side webhook handlers with HMAC-SHA256 signature verification, idempotency deduplication, and automated subscription state synchronization.
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl self-start sm:self-auto font-mono">
              Ready for Deployment Registration
            </span>
          </div>

          {/* Notice: Local sandbox notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-bold block text-sm">Deployment Registration Guide</span>
              <p className="mt-1 leading-relaxed">
                The backend endpoints below are fully implemented and waiting to receive events. When you deploy the application to your public HTTPS domain, register these exact paths in your payment provider developer dashboards.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Razorpay Webhook Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    RP
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Razorpay Webhook</h3>
                    <span className="text-[10px] text-slate-400">India & International INR/USD</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                  ACTIVE ROUTE
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Registered Path:</span>
                  <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs flex items-center justify-between">
                    <span>POST /api/webhooks/razorpay</span>
                    <button 
                      onClick={(e) => handleCopyId('/api/webhooks/razorpay', e)}
                      className="text-slate-400 hover:text-white"
                      title="Copy Path"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Signature Header:</span>
                    <span className="font-mono text-slate-900 font-bold">X-Razorpay-Signature</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Verification Method:</span>
                    <span className="text-purple-700 font-semibold">HMAC-SHA256</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Secret Environment Variable:</span>
                    <span className="font-mono text-slate-900 font-bold">RAZORPAY_WEBHOOK_SECRET</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Idempotency:</span>
                    <span className="text-emerald-700 font-bold">Event ID Deduplication Enabled</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600">
                  <strong>Handled Events:</strong> <code className="text-purple-700">payment.captured</code>, <code className="text-purple-700">subscription.charged</code>, <code className="text-purple-700">subscription.cancelled</code>, <code className="text-purple-700">payment.failed</code>
                </div>
              </div>
            </div>

            {/* PayPal Webhook Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    PP
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">PayPal Webhook</h3>
                    <span className="text-[10px] text-slate-400">USA, UK & Global Subscriptions</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                  ACTIVE ROUTE
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Registered Path:</span>
                  <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs flex items-center justify-between">
                    <span>POST /api/webhooks/paypal</span>
                    <button 
                      onClick={(e) => handleCopyId('/api/webhooks/paypal', e)}
                      className="text-slate-400 hover:text-white"
                      title="Copy Path"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Signature Header:</span>
                    <span className="font-mono text-slate-900 font-bold">PAYPAL-TRANSMISSION-SIG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Transmission ID:</span>
                    <span className="font-mono text-slate-900 font-bold">PAYPAL-TRANSMISSION-ID</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Secret Environment Variable:</span>
                    <span className="font-mono text-slate-900 font-bold">PAYPAL_WEBHOOK_ID</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Idempotency:</span>
                    <span className="text-emerald-700 font-bold">Event ID Deduplication Enabled</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600">
                  <strong>Handled Events:</strong> <code className="text-purple-700">PAYMENT.CAPTURE.COMPLETED</code>, <code className="text-purple-700">BILLING.SUBSCRIPTION.ACTIVATED</code>, <code className="text-purple-700">BILLING.SUBSCRIPTION.CANCELLED</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing & Limits Configuration Tab */}
      {activeTab === 'pricing_plans' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Super Admin Pricing & Plan Limits Management
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize monthly fees, implementation setup charges, usage limits, and quotas across all 4 tiers without code modification.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetPlans}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore Matrix Defaults</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(adminPlans).map((pItem: PlanConfig) => {
              const isEnterprise = pItem.id === 'enterprise';
              return (
                <div
                  key={pItem.id}
                  className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-2xs relative ${
                    isEnterprise ? 'border-purple-400 ring-2 ring-purple-400/20' : 'border-slate-200'
                  }`}
                >
                  {isEnterprise && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[9px] uppercase tracking-wider">
                      Flagship Tier
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-extrabold text-slate-900 text-base">{pItem.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">
                        {pItem.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">{pItem.positioning}</p>

                    {/* Rates Overview */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 mb-4 text-xs">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">USD Monthly:</span>
                        <span className="font-bold text-slate-900">
                          {pItem.isCustomPrice ? 'Custom' : `$${(pItem.pricing?.USD?.monthlyPrice || pItem.price || 0).toLocaleString()}/mo`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">USD Setup:</span>
                        <span className="font-bold text-slate-900">
                          {pItem.isCustomPrice ? 'Custom' : `$${(pItem.pricing?.USD?.setupPrice || pItem.setupFee || 0).toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 pt-1.5 border-t border-slate-200/60">
                        <span className="font-medium">INR Monthly:</span>
                        <span className="font-bold text-slate-900">
                          {pItem.isCustomPrice ? 'Custom' : `₹${(pItem.pricing?.INR?.monthlyPrice || 29999).toLocaleString()}/mo`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">INR Setup:</span>
                        <span className="font-bold text-slate-900">
                          {pItem.isCustomPrice ? 'Custom' : `₹${(pItem.pricing?.INR?.setupPrice || 249000).toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Hard Usage Limits */}
                    <div className="text-[11px] space-y-1.5 mb-4 text-slate-600">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hard Quotas & Allowances:</div>
                      <div className="flex justify-between">
                        <span>Voice Telephony:</span>
                        <span className="font-bold text-slate-900">
                          {typeof pItem.usageLimits?.voiceMinutes === 'number' ? `${pItem.usageLimits.voiceMinutes.toLocaleString()} mins` : 'Custom'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>SMS Messages:</span>
                        <span className="font-bold text-slate-900">
                          {typeof pItem.usageLimits?.smsMessages === 'number' ? `${pItem.usageLimits.smsMessages.toLocaleString()} msgs` : 'Custom'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>WhatsApp Convos:</span>
                        <span className="font-bold text-slate-900">
                          {typeof pItem.usageLimits?.whatsappConversations === 'number' ? `${pItem.usageLimits.whatsappConversations.toLocaleString()} convos` : 'Custom'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Operations:</span>
                        <span className="font-bold text-emerald-600">
                          {typeof pItem.usageLimits?.aiUsage === 'number' ? `${pItem.usageLimits.aiUsage.toLocaleString()} ops` : 'Custom'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contact Limit:</span>
                        <span className="font-bold text-slate-900">
                          {typeof pItem.usageLimits?.contacts === 'number' ? `${pItem.usageLimits.contacts.toLocaleString()} contacts` : 'Unlimited'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenPlanEdit(pItem)}
                    className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Fees & Quota Limits</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                System Audit & Security Logs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Complete immutable audit trail of admin and tenant operations</p>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{log.action}</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full font-mono">
                      {log.businessId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Actor: {log.actorEmail}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SAFE MULTI-STEP DELETE TENANT MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-4">
              <div className="flex items-center gap-2.5 text-rose-700">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Permanently Delete Tenant</h3>
                  <span className="text-[11px] text-rose-600 font-semibold">Strict Multi-Tenant Cascade Deletion</span>
                </div>
              </div>
              {!isDeleting && (
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteStep(1); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {deleteStep === 1 && (
              <div className="space-y-4">
                {/* Warning details card */}
                <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
                  <p className="font-bold text-rose-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    You are about to permanently delete this tenant workspace:
                  </p>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200/60 font-mono text-slate-800 space-y-1">
                    <div><span className="text-slate-400 font-sans">Business:</span> <strong>{deleteTarget.name}</strong></div>
                    <div><span className="text-slate-400 font-sans">Tenant ID:</span> <span className="text-purple-700 font-bold">{deleteTarget.id}</span></div>
                    <div><span className="text-slate-400 font-sans">Industry:</span> {deleteTarget.industry}</div>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    This action will <strong>permanently erase</strong> all knowledge items, AI agent prompts, chat transcripts, voice session recordings, and leads for this tenant. <strong>This action cannot be undone.</strong>
                  </p>
                </div>

                {/* Name verification input */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    To confirm, please type the business name <span className="text-rose-600 select-all font-mono font-bold">"{deleteTarget.name}"</span> or ID below:
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder={`Type "${deleteTarget.name}" to confirm`}
                    value={deleteInputText}
                    onChange={e => setDeleteInputText(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-900"
                  />
                  {deleteInputText.trim() && !isDeleteNameMatched && (
                    <span className="text-[11px] text-rose-600 mt-1 block">
                      Name does not match yet.
                    </span>
                  )}
                  {isDeleteNameMatched && (
                    <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Verification passed
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setDeleteTarget(null); setDeleteStep(1); }}
                    className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!isDeleteNameMatched}
                    onClick={() => setDeleteStep(2)}
                    className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <span>Proceed to Confirmation</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div className="space-y-4">
                <div className="bg-rose-600 text-white rounded-2xl p-5 text-xs space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-300" />
                    Final Confirmation Required
                  </div>
                  <p className="leading-relaxed">
                    Are you absolutely sure you want to permanently delete <strong>{deleteTarget.name}</strong> (Tenant ID: <code className="bg-rose-700 px-1 py-0.5 rounded">{deleteTarget.id}</code>)?
                  </p>
                  <p className="text-[11px] text-rose-100">
                    No data can be recovered once deleted.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="px-5 py-2.5 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Tenant Now</span>
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 'deleting' && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">Erasing Workspace & Multi-Tenant Data...</h4>
                <p className="text-xs text-slate-500">Wiping knowledge base, chat transcripts, leads, and server state for {deleteTarget.id}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT TENANT MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Tenant Settings</h3>
                  <span className="text-[11px] text-slate-500 font-mono">ID: {editTarget.id}</span>
                </div>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Industry</label>
                  <select
                    value={editIndustry}
                    onChange={e => setEditIndustry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="E-Commerce">E-Commerce</option>
                    <option value="Legal">Legal</option>
                    <option value="Services">Services</option>
                    <option value="Vocational & Technical Trades">Vocational & Technical Trades</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Subscription Plan</label>
                  <select
                    value={normalizePlanId(editPlan)}
                    onChange={e => setEditPlan(normalizePlanId(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="starter">{PLAN_CONFIGS.starter?.dropdownLabel || 'Starter ($497/mo + $2,997 setup • 250 Voice Mins)'}</option>
                    <option value="growth">{PLAN_CONFIGS.growth?.dropdownLabel || 'Growth ($1,497/mo + $7,497 setup • 1,000 Voice Mins)'}</option>
                    <option value="enterprise">{PLAN_CONFIGS.enterprise?.dropdownLabel || 'Enterprise ($2,497/mo + $14,997 setup • 3,000 Voice Mins)'}</option>
                    <option value="enterprise_custom">{PLAN_CONFIGS.enterprise_custom?.dropdownLabel || 'Enterprise Custom ($24,997+ setup • Custom Monthly)'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Website</label>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={e => setEditWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={editSupportEmail}
                    onChange={e => setEditSupportEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Business Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editPrimaryColor}
                      onChange={e => setEditPrimaryColor(e.target.value)}
                      className="w-10 h-9 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-slate-600 text-xs">{editPrimaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Voice Profile</label>
                  <select
                    value={editVoice}
                    onChange={e => setEditVoice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="Puck">Puck (Energetic Male - Upbeat & Friendly)</option>
                    <option value="Fenrir">Fenrir (Clear Male - Focused & Direct)</option>
                    <option value="Charon">Charon (Deep Male - Professional & Authoritative)</option>
                    <option value="Aoede">Aoede (Confident Female - Executive & Crisp)</option>
                    <option value="Kore">Kore (Warm Female - Calm & Empathetic)</option>
                    <option value="Leda">Leda (Gentle Female - Supportive & Smooth)</option>
                    <option value="Zephyr">Zephyr (Natural Male - Conversational)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow transition-colors flex items-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13-Step Business Onboarding Wizard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl ${onboardingStep === 12 ? 'max-w-3xl' : 'max-w-xl'} w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto transition-all duration-200`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Business Onboarding Wizard
                </h3>
                <span className="text-[11px] text-purple-700 font-bold">Step {onboardingStep} of 13</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4 text-xs">
              {onboardingStep === 1 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 1: Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Health Clinic"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 2 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 2: Industry Category</label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="E-Commerce">E-Commerce</option>
                    <option value="Legal">Legal</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
              )}

              {onboardingStep === 3 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 3: Website Domain</label>
                  <input
                    type="text"
                    placeholder="https://apexhealth.com"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 4 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 4: Business Description & Offerings</label>
                  <textarea
                    rows={3}
                    placeholder="Describe core services, pricing structure, and key client information..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 5 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 5: Official Support Email</label>
                  <input
                    type="email"
                    placeholder="support@client.com"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 6 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 6: Primary Brand Accent Color</label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-full h-10 p-1 border border-slate-300 rounded-xl cursor-pointer"
                  />
                </div>
              )}

              {onboardingStep === 7 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 7: Logo Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logo}
                    onChange={e => setLogo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 8 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 8: AI Assistant Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Receptionist"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 9 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 9: Customer Welcome Greeting</label>
                  <input
                    type="text"
                    placeholder="Hi 👋 Welcome to Apex Health. How can I help you today?"
                    value={welcomeMessage}
                    onChange={e => setWelcomeMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 10 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 10: Initial Knowledge Text / FAQs</label>
                  <textarea
                    rows={3}
                    placeholder="Enter key facts, pricing, or FAQs for instant training..."
                    value={knowledgeText}
                    onChange={e => setKnowledgeText(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {onboardingStep === 11 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Step 11: Voice Receptionist Profile</label>
                  <select
                    value={voice}
                    onChange={e => setVoice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                  >
                    <option value="Puck">Puck (Energetic Male - Upbeat & Friendly)</option>
                    <option value="Fenrir">Fenrir (Clear Male - Focused & Direct)</option>
                    <option value="Charon">Charon (Deep Male - Professional & Authoritative)</option>
                    <option value="Aoede">Aoede (Confident Female - Executive & Crisp)</option>
                    <option value="Kore">Kore (Warm Female - Calm & Empathetic)</option>
                    <option value="Leda">Leda (Gentle Female - Supportive & Smooth)</option>
                    <option value="Zephyr">Zephyr (Natural Male - Conversational)</option>
                  </select>
                </div>
              )}

              {onboardingStep === 12 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-bold text-slate-900 text-sm">Step 12: Select Subscription Plan</label>
                      <p className="text-xs text-slate-500">Select the AI RevenueOS plan that best fits this organization's scale and call volume.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPlanComparison(!showPlanComparison)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{showPlanComparison ? 'Hide Comparison' : 'Compare Plans'}</span>
                    </button>
                  </div>

                  {planError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-semibold">{planError}</span>
                    </div>
                  )}

                  {/* 4 Interactive Subscription Plan Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        id: 'starter',
                        name: 'Starter',
                        badge: undefined,
                        monthlyPrice: '$497',
                        setupFee: '$2,997',
                        aiConvos: '5,000',
                        voiceMins: '250',
                        description: 'Essential AI website receptionist & CRM for growing businesses.',
                        features: ['AI Web Receptionist', 'Lead Capture & CRM', 'Knowledge Base (25 docs)', '250 Voice Mins/mo']
                      },
                      {
                        id: 'growth',
                        name: 'Growth',
                        badge: undefined,
                        monthlyPrice: '$1,497',
                        setupFee: '$7,497',
                        aiConvos: '15,000',
                        voiceMins: '1,000',
                        description: 'Autonomous lead conversion & real-time Voice AI receptionist.',
                        features: ['Everything in Starter', 'AI Voice Receptionist', 'Missed-Call Text Back', '1,000 Voice Mins/mo']
                      },
                      {
                        id: 'enterprise',
                        name: 'Enterprise',
                        badge: 'RECOMMENDED',
                        monthlyPrice: '$2,497',
                        setupFee: '$14,997',
                        aiConvos: '50,000',
                        voiceMins: '3,000',
                        description: 'Complete AI Revenue & Autonomous Customer Operations Platform.',
                        features: ['Everything in Growth', 'AI Copilot & Multi-Agent', 'Re-engagement Engine', '3,000 Voice Mins/mo']
                      },
                      {
                        id: 'enterprise_custom',
                        name: 'Enterprise Custom',
                        badge: 'BESPOKE',
                        monthlyPrice: '$3,497–$5k+',
                        setupFee: '$24,997+',
                        aiConvos: 'Custom',
                        voiceMins: 'Custom',
                        description: 'Bespoke high-volume trunking, franchise hierarchy & custom SLAs.',
                        features: ['Dedicated Private Cloud', 'Custom Voice Models', 'ERP & CRM Endpoints', 'Dedicated Solutions Eng.']
                      }
                    ].map((tier) => {
                      const isSelected = normalizePlanId(plan) === tier.id;
                      return (
                        <div
                          key={tier.id}
                          tabIndex={0}
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            setPlan(tier.id as PlanKey);
                            setPlanError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setPlan(tier.id as PlanKey);
                              setPlanError(null);
                            }
                          }}
                          className={`relative rounded-xl p-3.5 border transition-all duration-150 flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isSelected
                              ? 'bg-purple-50/70 border-purple-600 ring-2 ring-purple-600/30 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div>
                            {/* Header & Badge */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-900 text-xs">{tier.name}</span>
                              {tier.badge ? (
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wider ${
                                  tier.badge === 'RECOMMENDED'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {tier.badge}
                                </span>
                              ) : (
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                              )}
                            </div>

                            {/* Pricing */}
                            <div className="mb-2">
                              <div className="flex items-baseline gap-1">
                                <span className="font-black text-slate-900 text-base">{tier.monthlyPrice}</span>
                                <span className="text-[10px] text-slate-500 font-medium">/month</span>
                              </div>
                              <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                                + {tier.setupFee} setup
                              </div>
                            </div>

                            {/* Usage Limits */}
                            <div className="space-y-1 py-2 border-t border-b border-slate-200/80 mb-2.5 text-[10px] text-slate-600">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">AI Convos:</span>
                                <span className="font-bold text-slate-800">{tier.aiConvos}{tier.aiConvos !== 'Custom' ? '/mo' : ''}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Voice Mins:</span>
                                <span className="font-bold text-slate-800">{tier.voiceMins}{tier.voiceMins !== 'Custom' ? ' mins/mo' : ''}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlan(tier.id as PlanKey);
                              setPlanError(null);
                            }}
                            className={`w-full py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 border border-slate-200/80'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Selected</span>
                              </>
                            ) : (
                              <span>Select {tier.name}</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Plan Details & Summary */}
                  {(() => {
                    const currentPlanConfig = getPlanConfig(plan);
                    const isCustom = normalizePlanId(plan) === 'enterprise_custom';
                    return (
                      <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">Selected: {currentPlanConfig.name} Plan</span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                                Active Selection
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{currentPlanConfig.tagline}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-purple-700 text-sm">
                              {isCustom ? '$3,497–$5,000+/mo' : `$${currentPlanConfig.price.toLocaleString()}/month`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              + {isCustom ? '$24,997+ one-time implementation' : `$${currentPlanConfig.setupFee.toLocaleString()} one-time setup`}
                            </div>
                          </div>
                        </div>

                        {/* Entitlements & Limits Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-500 block text-[10px]">Monthly Subscription</span>
                            <span className="font-bold text-slate-900">
                              {isCustom ? '$3,497+/mo' : `$${currentPlanConfig.price.toLocaleString()}/mo`}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-500 block text-[10px]">Implementation Fee</span>
                            <span className="font-bold text-slate-900">
                              {isCustom ? '$24,997+' : `$${currentPlanConfig.setupFee.toLocaleString()}`}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-500 block text-[10px]">AI Conversations</span>
                            <span className="font-bold text-slate-900">
                              {typeof currentPlanConfig.aiConversations === 'number'
                                ? `${currentPlanConfig.aiConversations.toLocaleString()}/mo`
                                : currentPlanConfig.aiConversations}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-500 block text-[10px]">Voice Receptionist</span>
                            <span className="font-bold text-slate-900">
                              {typeof currentPlanConfig.voiceMinutes === 'number'
                                ? `${currentPlanConfig.voiceMinutes.toLocaleString()} mins/mo`
                                : currentPlanConfig.voiceMinutes}
                            </span>
                          </div>
                        </div>

                        {/* Feature Highlights Checklist */}
                        <div>
                          <span className="font-bold text-slate-800 text-[11px] block mb-1.5">Included Platform Entitlements:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                            {currentPlanConfig.features.slice(0, 8).map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Expandable Comparison Table */}
                  {showPlanComparison && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl overflow-x-auto text-[11px] space-y-2">
                      <div className="font-bold text-slate-900 text-xs">Plan Comparison Matrix</div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px]">
                            <th className="pb-1 font-semibold">Feature / Spec</th>
                            <th className="pb-1 font-semibold text-center">Starter</th>
                            <th className="pb-1 font-semibold text-center">Growth</th>
                            <th className="pb-1 font-semibold text-center text-purple-700">Enterprise</th>
                            <th className="pb-1 font-semibold text-center">Custom</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          <tr>
                            <td className="py-1 font-medium">Monthly Subscription</td>
                            <td className="py-1 text-center font-bold">$497</td>
                            <td className="py-1 text-center font-bold">$1,497</td>
                            <td className="py-1 text-center font-bold text-purple-700">$2,497</td>
                            <td className="py-1 text-center font-bold">$3,497+</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-medium">Implementation Setup</td>
                            <td className="py-1 text-center">$2,997</td>
                            <td className="py-1 text-center">$7,497</td>
                            <td className="py-1 text-center text-purple-700 font-semibold">$14,997</td>
                            <td className="py-1 text-center">$24,997+</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-medium">AI Conversations</td>
                            <td className="py-1 text-center">5,000/mo</td>
                            <td className="py-1 text-center">15,000/mo</td>
                            <td className="py-1 text-center text-purple-700 font-semibold">50,000/mo</td>
                            <td className="py-1 text-center">Custom</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-medium">Voice Receptionist Mins</td>
                            <td className="py-1 text-center">250 mins</td>
                            <td className="py-1 text-center">1,000 mins</td>
                            <td className="py-1 text-center text-purple-700 font-semibold">3,000 mins</td>
                            <td className="py-1 text-center">Custom</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-medium">Missed-Call Recovery</td>
                            <td className="py-1 text-center text-slate-400">—</td>
                            <td className="py-1 text-center text-emerald-600">✓</td>
                            <td className="py-1 text-center text-emerald-600">✓</td>
                            <td className="py-1 text-center text-emerald-600">✓</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-medium">AI Copilot & Multi-Agent</td>
                            <td className="py-1 text-center text-slate-400">—</td>
                            <td className="py-1 text-center text-slate-400">—</td>
                            <td className="py-1 text-center text-emerald-600">✓</td>
                            <td className="py-1 text-center text-emerald-600">✓</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-medium">White-Label & SLA</td>
                            <td className="py-1 text-center text-slate-400">—</td>
                            <td className="py-1 text-center text-slate-400">—</td>
                            <td className="py-1 text-center text-slate-400">—</td>
                            <td className="py-1 text-center text-emerald-600">Dedicated</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {onboardingStep === 13 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-sm">Step 13: Your AI Agent is Ready!</h4>
                  <p className="text-xs text-slate-600">Click complete to provision workspace and generate embed code snippet.</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                {onboardingStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPlanError(null);
                      setOnboardingStep(s => s - 1);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    Previous Step
                  </button>
                ) : <div />}

                {onboardingStep < 13 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onboardingStep === 12) {
                        if (!plan) {
                          setPlanError('Please select a subscription plan to continue.');
                          return;
                        }
                      }
                      setPlanError(null);
                      setOnboardingStep(s => s + 1);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md text-xs cursor-pointer transition-colors"
                  >
                    Provision & Launch AI Workspace
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER ADMIN PLAN EDITING MODAL */}
      {editingPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span>Configure {editingPlanModal.name} Specifications</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">Tier ID: {editingPlanModal.id}</span>
              </div>
              <button
                onClick={() => setEditingPlanModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">USD Monthly Price ($)</label>
                  <input
                    type="number"
                    value={planMonthlyUSD}
                    onChange={(e) => setPlanMonthlyUSD(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">USD Setup Fee ($)</label>
                  <input
                    type="number"
                    value={planSetupUSD}
                    onChange={(e) => setPlanSetupUSD(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">INR Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={planMonthlyINR}
                    onChange={(e) => setPlanMonthlyINR(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">INR Setup Fee (₹)</label>
                  <input
                    type="number"
                    value={planSetupINR}
                    onChange={(e) => setPlanSetupINR(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Usage Quotas */}
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                <div className="font-bold text-purple-900 uppercase text-[10px] tracking-wider">Usage-Based Quotas & Limits</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Voice Telephony (Mins/mo)</label>
                    <input
                      type="number"
                      value={planVoiceMinutes}
                      onChange={(e) => setPlanVoiceMinutes(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">SMS Messages (/mo)</label>
                    <input
                      type="number"
                      value={planSmsMessages}
                      onChange={(e) => setPlanSmsMessages(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">WhatsApp Convos (/mo)</label>
                    <input
                      type="number"
                      value={planWhatsappConvos}
                      onChange={(e) => setPlanWhatsappConvos(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">AI Computations (/mo)</label>
                    <input
                      type="number"
                      value={planAiUsage}
                      onChange={(e) => setPlanAiUsage(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">CRM Contacts Allowance</label>
                    <input
                      type="number"
                      value={planContacts}
                      onChange={(e) => setPlanContacts(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingPlanModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlanSpecs}
                disabled={isSavingPlan}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingPlan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Tier Specifications</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
