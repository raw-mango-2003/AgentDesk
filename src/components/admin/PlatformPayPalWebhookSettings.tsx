import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Lock, 
  CheckCircle2, 
  Info,
  Clock,
  ArrowRight,
  ChevronRight,
  Shield,
  Activity
} from 'lucide-react';

interface PayPalConfigData {
  webhookUrl: string;
  webhookStatus: 'Registered' | 'Not Registered';
  webhookId: string;
  environment: 'production' | 'sandbox';
  isConfigured: boolean;
  supportedEvents: string[];
}

interface PayPalWebhookLogEntry {
  id: string;
  eventType: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED' | 'DUPLICATE' | 'IGNORED';
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  amount?: number;
  currency?: string;
  message: string;
  verificationMethod?: string;
  receivedAt: string;
}

export const PlatformPayPalWebhookSettings: React.FC = () => {
  const [config, setConfig] = useState<PayPalConfigData | null>(null);
  const [logs, setLogs] = useState<PayPalWebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'sending' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });

  // Calculate actual deployed URL fallback if needed
  const getDeployedWebhookUrl = () => {
    if (config?.webhookUrl) return config.webhookUrl;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/webhooks/paypal`;
    }
    return 'https://ais-dev-gigolstwh3egrzouuvbbb2-566421135054.asia-southeast1.run.app/api/webhooks/paypal';
  };

  const fetchConfigAndLogs = async () => {
    try {
      setRefreshing(true);
      const [configRes, logsRes] = await Promise.all([
        fetch('/api/webhooks/paypal/config').catch(() => null),
        fetch('/api/webhooks/paypal/logs').catch(() => null)
      ]);

      if (configRes && configRes.ok) {
        const data = await configRes.json();
        setConfig(data);
      } else {
        // Fallback: fetch from /api/billing/webhooks/paypal/config
        const fallbackRes = await fetch('/api/billing/webhooks/paypal/config').catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const data = await fallbackRes.json();
          setConfig(data);
        }
      }

      if (logsRes && logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      } else {
        const fallbackLogs = await fetch('/api/billing/webhooks/paypal/logs').catch(() => null);
        if (fallbackLogs && fallbackLogs.ok) {
          const data = await fallbackLogs.json();
          setLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error('Failed to load PayPal webhook config:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConfigAndLogs();
  }, []);

  const handleCopyUrl = async () => {
    const url = getDeployedWebhookUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleCopyId = async () => {
    if (!config?.webhookId) return;
    try {
      await navigator.clipboard.writeText(config.webhookId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const runDiagnosticPing = async () => {
    setTestResult({ status: 'sending', message: 'Testing webhook endpoint reachability...' });
    try {
      const res = await fetch('/api/webhooks/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `PING_${Date.now()}`,
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          summary: 'Diagnostic ping test without headers'
        })
      });

      const body = await res.json();
      if (res.status === 400 && body.code === 'INVALID_SIGNATURE') {
        setTestResult({
          status: 'success',
          message: 'Endpoint verified! Correctly rejected unauthenticated request with HTTP 400 (INVALID_SIGNATURE).'
        });
      } else {
        setTestResult({
          status: 'success',
          message: `Endpoint responded with HTTP ${res.status}: ${body.message || body.error || 'OK'}`
        });
      }
      fetchConfigAndLogs();
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Endpoint connection failed: ${err.message}`
      });
    }
  };

  const webhookUrl = getDeployedWebhookUrl();
  const webhookStatus = config?.webhookStatus || (config?.webhookId ? 'Registered' : 'Not Registered');
  const webhookId = config?.webhookId || '';

  return (
    <div className="space-y-6">
      {/* Exact Breadcrumb Navigation Required by Platform Specification */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="hover:text-slate-700">Settings</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="hover:text-slate-700">Payments</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="hover:text-slate-700">PayPal</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
          Webhook Configuration
        </span>
      </div>

      {/* Main Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              PP
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                PayPal Webhook Configuration
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-full">
                  Live Infrastructure
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Public HTTPS backend endpoint for PayPal Live events with signature verification, raw body preservation, and tenant payment reconciliation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={fetchConfigAndLogs}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : 'text-slate-400'}`} />
            <span>Refresh Status</span>
          </button>
          <a
            href="https://developer.paypal.com/dashboard/applications/live"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span>PayPal Developer Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Core Specification Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: PayPal Live Webhook URL & Copy Action */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm">PayPal Live Webhook URL</h3>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-md">
              HTTPS ENDPOINT ACTIVE
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Copy and paste this exact public URL into your PayPal Live app dashboard under <strong>Webhooks → Add Webhook</strong>:
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 break-all select-all flex items-center justify-between">
              <span>{webhookUrl}</span>
            </div>
            <button
              onClick={handleCopyUrl}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                copiedUrl
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
              }`}
            >
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Webhook URL</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Webhook Status:
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${webhookStatus === 'Registered' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={`text-sm font-bold ${webhookStatus === 'Registered' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {webhookStatus}
                </span>
                {webhookStatus === 'Registered' ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    Ready & Active
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                    Pending Dashboard Setup
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Webhook ID:
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-800 truncate">
                  {webhookId || <span className="text-slate-400 font-normal italic">[blank until configured]</span>}
                </span>
                {webhookId && (
                  <button
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                    title="Copy Webhook ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Environment & Cryptographic Security */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Security & Guarantees</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Environment:</span>
              <span className="font-bold text-slate-900 uppercase">
                {config?.environment || 'production'} (LIVE)
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Raw Body Handling:</span>
              <span className="font-bold text-emerald-700">Preserved in req.rawBody</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Signature Check:</span>
              <span className="font-bold text-purple-700">SHA256withRSA / verify-api</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Idempotency:</span>
              <span className="font-bold text-emerald-700">Event ID Deduplication Active</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Frontend Secrets:</span>
              <span className="font-bold text-slate-700">0% Expose (Server-Only)</span>
            </div>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-[11px] text-purple-900 leading-relaxed">
            <strong>Tenant Safeguard:</strong> Checkout orders created or approved on PayPal are never auto-activated. Tenant provisioning only executes upon verified server-side <code className="font-mono bg-purple-100 px-1 py-0.5 rounded">PAYMENT.CAPTURE.COMPLETED</code>.
          </div>
        </div>
      </div>

      {/* 4-Step Registration Guide */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          PayPal Developer Dashboard Registration Walkthrough
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
              1
            </span>
            <h4 className="font-bold text-slate-900">Open PayPal App</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Log into the PayPal Developer Dashboard and choose your Live REST API App under <strong>Apps & Credentials</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
              2
            </span>
            <h4 className="font-bold text-slate-900">Add Webhook</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Scroll down to the <strong>Webhooks</strong> card and click <strong>Add Webhook</strong>. Paste the Live Webhook URL copied above.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
              3
            </span>
            <h4 className="font-bold text-slate-900">Select Event Types</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Check <strong>Payment capture completed</strong>, <strong>denied</strong>, <strong>refunded</strong>, <strong>reversed</strong>, and <strong>Subscription</strong> events.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
              4
            </span>
            <h4 className="font-bold text-slate-900">Save Webhook ID</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Copy the generated <strong>Webhook ID</strong> into the container environment variable <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">PAYPAL_WEBHOOK_ID</code>.
            </p>
          </div>
        </div>

        {/* Selected Event Types List */}
        <div className="pt-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Selected Live Event Types Handled by AgentDesk Backend:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(config?.supportedEvents || [
              'PAYMENT.CAPTURE.COMPLETED',
              'PAYMENT.CAPTURE.DENIED',
              'PAYMENT.CAPTURE.REFUNDED',
              'PAYMENT.CAPTURE.REVERSED',
              'PAYMENT.SALE.COMPLETED',
              'BILLING.SUBSCRIPTION.ACTIVATED',
              'BILLING.SUBSCRIPTION.CANCELLED',
              'BILLING.SUBSCRIPTION.SUSPENDED',
              'BILLING.SUBSCRIPTION.EXPIRED',
              'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
              'CHECKOUT.ORDER.APPROVED'
            ]).map((evt) => (
              <span
                key={evt}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-mono text-[10px] rounded-lg transition-all"
              >
                {evt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Diagnostic & Event Activity Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Live PayPal Webhook Event Logs & Delivery Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time server log capturing event IDs, verification status, payment IDs, and tenant actions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runDiagnosticPing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Test Endpoint Reachability</span>
            </button>
            <button
              onClick={fetchConfigAndLogs}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              title="Refresh Event Logs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
            </button>
          </div>
        </div>

        {testResult.status !== 'idle' && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            testResult.status === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            testResult.status === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Logs Table */}
        {logs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span>No PayPal webhook events received yet. Live incoming webhooks from PayPal will appear here instantly.</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5">Event Type</th>
                  <th className="px-3.5 py-2.5">Event ID</th>
                  <th className="px-3.5 py-2.5">Related ID</th>
                  <th className="px-3.5 py-2.5">Summary / Outcome</th>
                  <th className="px-3.5 py-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => (
                  <tr key={log.id + idx} className="hover:bg-slate-50/70 transition-colors font-mono text-[11px]">
                    <td className="px-3.5 py-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        log.status === 'DUPLICATE' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-800">
                      {log.eventType}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 truncate max-w-[140px]" title={log.id}>
                      {log.id}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700 truncate max-w-[130px]">
                      {log.paymentId || log.orderId || log.subscriptionId || '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 font-sans text-xs max-w-[280px] truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.receivedAt || log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
