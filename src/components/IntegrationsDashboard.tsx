import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Globe, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Calendar, 
  Phone, 
  MessageSquare, 
  Mail, 
  Database, 
  Sliders, 
  Activity,
  Trash2,
  Lock,
  Plus,
  Save,
  Unplug
} from 'lucide-react';
import { Business, AuditLog, IntegrationStatus, IntegrationProvider } from '../types';
import { getAuditLogs, getBusinesses, getAllBusinesses, getIntegrations, saveIntegrations, saveBusiness, resetDatabaseToSeed, addNotification } from '../lib/dbService';
import { formatDateTime } from '../lib/localization';

interface IntegrationsDashboardProps {
  business: Business;
  onBusinessUpdated: (updated: Business) => void;
}

export function IntegrationsDashboard({ business, onBusinessUpdated }: IntegrationsDashboardProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'localization' | 'audit'>('integrations');
  const [isResetting, setIsResetting] = useState(false);
  const [integrationRecords, setIntegrationRecords] = useState<IntegrationStatus[]>([]);
  const [configuringProvider, setConfiguringProvider] = useState<IntegrationProvider | null>(null);
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);

  const integrationCatalog: Array<{ id: IntegrationProvider; name: string; category: IntegrationStatus['category']; description: string; fields: string[] }> = [
    { id: 'google_calendar', name: 'Google Calendar', category: 'Calendar', description: 'Two-way appointment availability and conflict sync.', fields: ['client_id', 'client_secret', 'refresh_token'] },
    { id: 'twilio_voice', name: 'Twilio Voice', category: 'Voice', description: 'Inbound calls, routing, recording and transcription.', fields: ['account_sid', 'auth_token', 'phone_number'] },
    { id: 'twilio_sms', name: 'Twilio SMS', category: 'SMS', description: 'Missed-call text-back and SMS notifications.', fields: ['account_sid', 'auth_token', 'phone_number'] },
    { id: 'whatsapp_business', name: 'Meta WhatsApp Cloud', category: 'WhatsApp', description: 'WhatsApp Business messaging for customer conversations.', fields: ['phone_number_id', 'business_account_id', 'access_token'] },
    { id: 'resend_email', name: 'Resend Email API', category: 'Email', description: 'Transactional and follow-up email delivery.', fields: ['api_key', 'from_email'] },
    { id: 'gemini_ai', name: 'Google Gemini', category: 'AI', description: 'AI reasoning, RAG and conversation intelligence.', fields: ['api_key', 'model'] },
    { id: 'hubspot_crm', name: 'HubSpot CRM', category: 'CRM', description: 'Contact and deal synchronization.', fields: ['access_token', 'portal_id'] },
    { id: 'salesforce_crm', name: 'Salesforce CRM', category: 'CRM', description: 'Contact and opportunity synchronization.', fields: ['client_id', 'client_secret', 'refresh_token'] },
    { id: 'custom_webhook', name: 'Custom Webhook', category: 'Webhooks', description: 'Inbound or outbound JSON event delivery.', fields: ['webhook_url', 'signing_secret'] }
  ];

  const getIntegrationFor = (provider: IntegrationProvider) =>
    integrationRecords.find(item => item.id === provider && (item.tenantId || item.businessId) === business.id);

  const loadIntegrationWorkspace = async () => {
    setIntegrationRecords(await getIntegrations(business.id));
  };

  const openIntegrationConfig = (provider: IntegrationProvider) => {
    const existing = getIntegrationFor(provider);
    setConfiguringProvider(provider);
    setConfigFields(existing?.config || {});
  };

  const saveIntegrationConfig = async () => {
    if (!configuringProvider) return;
    const catalogItem = integrationCatalog.find(item => item.id === configuringProvider);
    if (!catalogItem) return;
    setIsSavingIntegration(true);
    try {
      const next: IntegrationStatus = {
        id: configuringProvider,
        name: catalogItem.name,
        category: catalogItem.category,
        description: catalogItem.description,
        status: 'CONNECTED',
        lastSync: new Date().toISOString(),
        tenantId: business.id,
        businessId: business.id,
        config: configFields
      };
      const nextRecords = integrationRecords.some(item => item.id === configuringProvider)
        ? integrationRecords.map(item => item.id === configuringProvider ? next : item)
        : [...integrationRecords, next];
      await saveIntegrations(nextRecords);
      setIntegrationRecords(nextRecords);
      setConfiguringProvider(null);
      setConfigFields({});
    } finally {
      setIsSavingIntegration(false);
    }
  };

  const disconnectIntegration = async (provider: IntegrationProvider) => {
    const next = integrationRecords.map(item =>
      item.id === provider ? { ...item, status: 'NOT_CONNECTED' as const, config: undefined } : item
    );
    await saveIntegrations(next);
    setIntegrationRecords(next);
  };

  useEffect(() => {
    loadIntegrationWorkspace();
  }, [business.id]);

  // Editable business settings
  const [agentName, setAgentName] = useState(business.agentSettings.agentName);
  const [voiceTone, setVoiceTone] = useState(business.agentSettings.voiceTone);
  const [temperature, setTemperature] = useState(business.agentSettings.temperature);
  const [savedSettings, setSavedSettings] = useState(false);

  useEffect(() => {
    loadAudit();
  }, [business.id]);

  async function loadAudit() {
    const list = await getAuditLogs(business.id);
    setAuditLogs(list);
  }

  const handleSaveAISettings = async () => {
    const updated: Business = {
      ...business,
      agentSettings: {
        ...business.agentSettings,
        agentName,
        voiceTone,
        temperature
      }
    };
    await saveBusiness(updated);
    onBusinessUpdated(updated);
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2000);
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all demo state to fresh seed data? Any new test leads will be re-initialized.')) return;
    setIsResetting(true);
    await resetDatabaseToSeed();
    const businesses = await getBusinesses();
    const current = businesses.find(b => b.id === business.id) || businesses[0];
    onBusinessUpdated(current);
    setIsResetting(false);
    await addNotification({
      businessId: business.id,
      type: 'campaign_reply',
      title: 'Database Reset',
      message: 'Demo state restored to original clean presets.'
    });
    await loadAudit();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Enterprise Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Security controls configured
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <span>Integrations, Localization & Audit</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Review available integrations, configure credentials when needed, customize AI agent personality and inspect audit logs.
          </p>
        </div>

        {/* Subtab Toggle */}
        <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('integrations')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'integrations' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gateways
          </button>
          <button
            onClick={() => setActiveSubTab('localization')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'localization' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Agent Config
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'audit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: INTEGRATIONS GATEWAYS */}
      {activeSubTab === 'integrations' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Tenant Integration Manager</h3>
                <p className="text-xs text-slate-400 mt-1">Configure integrations for the current tenant workspace. Platform Admin can manage any tenant from Platform Admin → Settings → Integrations → Tenant Integrations.</p>
              </div>
              <div className="w-full lg:w-96 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white">
                {business.name} • {business.id}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
              <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">Platform Admin</span>
              <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">Managing: {business.name}</span>
              <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">Tenant ID: {business.id}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-slate-300">
            <span className="font-semibold text-blue-300">Tenant-scoped integrations:</span> these cards are real controls. Select a tenant, then add or edit the integration credentials for that tenant only.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrationCatalog.map(item => {
              const existing = getIntegrationFor(item.id, business.id);
              const connected = existing?.status === 'CONNECTED';
              return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">{item.category}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${connected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      {connected ? 'CONNECTED' : 'NOT CONNECTED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[42px]">{item.description}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openIntegrationConfig(item.id)} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                      {connected ? <Sliders className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{connected ? 'Edit Integration' : 'Add Integration'}</span>
                    </button>
                    {connected && (
                      <button onClick={() => disconnectIntegration(item.id)} className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 cursor-pointer" title="Disconnect integration">
                        <Unplug className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {configuringProvider && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-white">{integrationCatalog.find(item => item.id === configuringProvider)?.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure for <span className="text-blue-300 font-semibold">{business.name}</span> ({business.id})</p>
                  </div>
                  <button onClick={() => setConfiguringProvider(null)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  {integrationCatalog.find(item => item.id === configuringProvider)?.fields.map(field => (
                    <div key={field}>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
                      <input type={field.includes('secret') || field.includes('token') || field.includes('key') ? 'password' : 'text'} value={configFields[field] || ''} onChange={e => setConfigFields(prev => ({ ...prev, [field]: e.target.value }))} placeholder={`Enter ${field.replace(/_/g, ' ')}`} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500" />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button onClick={() => setConfiguringProvider(null)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer">Cancel</button>
                  <button onClick={saveIntegrationConfig} disabled={isSavingIntegration} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingIntegration ? 'Saving...' : 'Save Integration'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: AI AGENT PERSONALITY & LOCALIZATION */}
      {activeSubTab === 'localization' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Agent Persona Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>AI Receptionist Personality & Guardrails</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Agent Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Voice Tone</label>
                <select
                  value={voiceTone}
                  onChange={e => setVoiceTone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="warm, reassuring, clinical precision">Warm, Reassuring & Clinical (Medical/Dental)</option>
                  <option value="friendly, professional, highly responsive">Friendly & Professional (Home Services)</option>
                  <option value="authoritative, concise, executive">Authoritative & Executive (B2B SaaS / Legal)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Temperature (Creativity vs Determinism)</label>
                  <span className="font-mono text-blue-400">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveAISettings}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{savedSettings ? 'Saved Changes!' : 'Update Agent Settings'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Business Localization Read-Only Card */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Target Region Profile</span>
            </h3>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Country Code:</span>
                <span className="font-bold text-white">{business.country} ({business.country === 'IN' ? 'India' : 'United States'})</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Currency:</span>
                <span className="font-mono font-bold text-emerald-400">{business.currency} ({business.currency === 'INR' ? '₹ Rupees' : '$ USD'})</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Timezone:</span>
                <span className="font-mono text-slate-300">{business.timezone}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Primary Channel:</span>
                <span className="font-bold text-blue-400">{business.country === 'IN' ? 'WhatsApp available' : 'Twilio available'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Physical Address:</span>
                <span className="text-slate-300 truncate max-w-[180px]">{business.address}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Use the top-right business selector in the navigation bar to instantly switch between US and India tenant profiles.
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 3: AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Immutable Audit & Compliance Log ({auditLogs.length})</span>
            </h3>
            <span className="text-xs text-slate-500">Tenant-isolated audit trail and security activity logging</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.map(log => (
              <div
                key={log.id}
                className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/20 text-blue-300 font-mono">
                      {log.action}
                    </span>
                    <span className="font-bold text-white">{log.target}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{log.details}</p>
                </div>

                <div className="text-right text-[10px] text-slate-500 shrink-0">
                  <div>{log.user}</div>
                  <div>{formatDateTime(log.timestamp, business.timezone, business.country)}</div>
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-500">
                No audit log entries recorded yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
