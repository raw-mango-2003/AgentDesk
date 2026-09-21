import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, RefreshCw, Save, ShieldCheck, Server, Zap } from 'lucide-react';
import { safeFetchJson } from '../../lib/apiClient';

type Provider = 'gemini_ai' | 'twilio' | 'whatsapp_business' | 'email_delivery';

const PROVIDERS: Array<{ id: Provider; title: string; description: string; fields: Array<{ key: string; label: string; secret?: boolean; placeholder?: string }> }> = [
  {
    id: 'gemini_ai',
    title: 'AI Engine',
    description: 'Configure the AI model used by AgentDesk. Customers never see this provider configuration.',
    fields: [
      { key: 'apiKey', label: 'API Key', secret: true },
      { key: 'model', label: 'Default Model', placeholder: 'gemini-3.7-flash' }
    ]
  },
  {
    id: 'twilio',
    title: 'Voice & SMS',
    description: 'Platform-level Twilio credentials used for voice, SMS and verification services.',
    fields: [
      { key: 'accountSid', label: 'Account SID' },
      { key: 'authToken', label: 'Auth Token', secret: true },
      { key: 'phoneNumber', label: 'Default Phone Number', placeholder: '+1...' },
      { key: 'verifyServiceSid', label: 'Verify Service SID', secret: true }
    ]
  },
  {
    id: 'whatsapp_business',
    title: 'WhatsApp',
    description: 'Platform Meta Cloud API configuration. Business-specific WhatsApp accounts remain tenant-scoped.',
    fields: [
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'phoneNumberId', label: 'Phone Number ID' },
      { key: 'businessAccountId', label: 'Business Account ID' },
      { key: 'apiVersion', label: 'Graph API Version', placeholder: 'v18.0' }
    ]
  },
  {
    id: 'email_delivery',
    title: 'Email Delivery',
    description: 'Internal transactional email infrastructure. This provider is intentionally hidden from business customers.',
    fields: [
      { key: 'apiKey', label: 'Provider API Key', secret: true },
      { key: 'fromEmail', label: 'From Email', placeholder: 'notifications@yourdomain.com' },
      { key: 'fromName', label: 'From Name', placeholder: 'AgentDesk' },
      { key: 'replyTo', label: 'Reply-To', placeholder: 'support@yourdomain.com' }
    ]
  }
];

export const PlatformConfigurationManager: React.FC = () => {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [deployment, setDeployment] = useState<any>(null);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson('/api/platform/configuration');
      if (!data.success) throw new Error(data.error || 'Failed to load configuration');
      setConfigs(data.configurations || {});
      setDeployment(data.deployment || null);
      const next: Record<string, Record<string, string>> = {};
      for (const provider of PROVIDERS) {
        next[provider.id] = {};
        for (const field of provider.fields) {
          const current = data.configurations?.[provider.id]?.fields?.[field.key] || '';
          next[provider.id][field.key] = current.includes('••••••••') ? '' : current;
        }
      }
      setValues(next);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Unable to load platform configuration.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (provider: Provider) => {
    setSaving(provider);
    setMessage(null);
    try {
      const payload = { ...(values[provider] || {}) };
      for (const key of Object.keys(payload)) {
        if (!payload[key]) delete payload[key];
      }
      const data = await safeFetchJson('/api/platform/configuration/' + provider, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!data.success) throw new Error(data.error || 'Save failed');
      setMessage({ type: 'success', text: 'Configuration saved securely. Backend configuration is now updated.' });
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save configuration.' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-900/50 bg-slate-900 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-600/15 p-2.5"><ShieldCheck className="h-5 w-5 text-blue-400" /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Platform Configuration</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">Manage AgentDesk infrastructure from the dashboard. Secrets are encrypted at rest and are never shown to business users.</p>
          </div>
          <button onClick={load} disabled={loading} className="ml-auto rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">
            <RefreshCw className={`mr-2 inline h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200' : 'border-rose-800 bg-rose-950/40 text-rose-200'}`}>
          {message.text}
        </div>
      )}

      {PROVIDERS.map((provider) => {
        const configured = !!configs[provider.id]?.configured;
        return (
          <div key={provider.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-slate-800 p-2.5"><Zap className="h-5 w-5 text-blue-400" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{provider.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${configured ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
                    {configured ? 'CONFIGURED' : 'ACTION REQUIRED'}
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">{provider.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {provider.fields.map((field) => {
                const key = provider.id + ':' + field.key;
                const isRevealed = !!revealed[key];
                return (
                  <label key={field.key} className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-300">{field.label}</span>
                    <div className="relative">
                      <input
                        type={field.secret && !isRevealed ? 'password' : 'text'}
                        value={values[provider.id]?.[field.key] || ''}
                        onChange={(e) => setValues(prev => ({ ...prev, [provider.id]: { ...(prev[provider.id] || {}), [field.key]: e.target.value } }))}
                        placeholder={field.placeholder || (field.secret ? 'Enter new value to replace current secret' : '')}
                        className="w-full rounded-xl border border-slate-700 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      {field.secret && (
                        <button type="button" onClick={() => setRevealed(prev => ({ ...prev, [key]: !isRevealed }))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={() => save(provider.id)} disabled={saving === provider.id} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60">
                <Save className="mr-2 inline h-4 w-4" />{saving === provider.id ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        );
      })}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3"><Server className="h-5 w-5 text-emerald-400" /><h3 className="font-bold text-white">Deployment</h3></div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Application', deployment?.appUrl],
            ['API', deployment?.apiBaseUrl],
            ['Widget', deployment?.widgetBaseUrl]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-700 bg-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
              <div className="mt-1 break-all text-sm font-semibold text-slate-900">{value || 'Not configured'}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">The deployment URL is derived from the production host. Change the host/APP_URL in Render when moving environments; routine integration credentials can be changed here without a code change.</p>
      </div>
    </div>
  );
};
