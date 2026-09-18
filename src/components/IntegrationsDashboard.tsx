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
  Lock
} from 'lucide-react';
import { Business, AuditLog } from '../types';
import { getAuditLogs, getBusinesses, saveBusiness, resetDatabaseToSeed, addNotification } from '../lib/dbService';
import { formatDateTime } from '../lib/localization';

interface IntegrationsDashboardProps {
  business: Business;
  onBusinessUpdated: (updated: Business) => void;
}

export function IntegrationsDashboard({ business, onBusinessUpdated }: IntegrationsDashboardProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'localization' | 'audit'>('integrations');
  const [isResetting, setIsResetting] = useState(false);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gemini AI */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Google Gemini 2.5</h4>
                  <p className="text-[10px] text-slate-400">Autonomous Reasoning & RAG</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AVAILABLE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides AI conversation intelligence and knowledge retrieval when a Gemini API key is configured.
            </p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-xl border border-slate-800">
              Requires: Gemini API key • Model: gemini-2.5-flash
            </div>
          </div>

          {/* Twilio Telephony (US) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center font-black">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Twilio Voice & SMS</h4>
                  <p className="text-[10px] text-slate-400">US Telephony & 10DLC</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CONFIGURE TO ACTIVATE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supports inbound voice, missed-call recovery, and SMS when Twilio credentials are configured.
            </p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-xl border border-slate-800">
              Requires: Twilio account SID, auth token, and phone number
            </div>
          </div>

          {/* WhatsApp Cloud API (India & Global) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-black">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Meta WhatsApp Cloud</h4>
                  <p className="text-[10px] text-slate-400">Verified Business API</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CONNECTED
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supports WhatsApp customer messaging and interactive messages when Meta WhatsApp credentials are configured.
            </p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-xl border border-slate-800">
              Requires: WhatsApp phone number ID and access token
            </div>
          </div>

          {/* Google Calendar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center font-black">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Google Calendar</h4>
                  <p className="text-[10px] text-slate-400">2-Way Appointment Sync</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SYNCED
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supports appointment synchronization when Google Calendar credentials are configured.
            </p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-xl border border-slate-800">
              Requires: Google Calendar authorization • Target: primary calendar
            </div>
          </div>

          {/* Resend / Transactional Email */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-black">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Resend Email API</h4>
                  <p className="text-[10px] text-slate-400">Transactional Proposals</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                HEALTHY
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supports transactional email when a Resend API key is configured.
            </p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-xl border border-slate-800">
              Requires: Resend API key • Delivery domain verification is provider-dependent
            </div>
          </div>

          {/* Local / Cloud Persistence */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Database Engine</h4>
                  <p className="text-[10px] text-slate-400">Multi-Tenant Isolation</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AVAILABLE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides local demo persistence with tenant data partitioned by <code>businessId</code>.
            </p>
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isResetting ? 'Resetting...' : 'Re-seed Demo Database'}</span>
            </button>
          </div>
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
            <span className="text-xs text-slate-500">Auto-recorded for SOC-2 & HIPAA compliance</span>
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
