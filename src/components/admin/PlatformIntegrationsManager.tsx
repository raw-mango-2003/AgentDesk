import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../lib/apiClient';
import { 
  Mail, 
  CreditCard, 
  Smartphone, 
  Zap, 
  MessageSquare, 
  Activity, 
  Shield, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Send,
  ExternalLink,
  Key,
  Lock,
  LogOut,
  Sparkles,
  ChevronRight,
  Info,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: string;
  isConfigured: boolean;
  description: string;
  envVars: string[];
  maskedConfig: Record<string, any>;
  senderEmail?: string;
  scopes?: string[];
  tokenExpiresAt?: string;
}

interface GmailDetails {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'REAUTHORIZATION_REQUIRED';
  isConfigured: boolean;
  senderEmail: string;
  replyTo: string;
  scope: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  maskedClientId?: string;
  connectedAt?: string;
  lastSuccessfulSendAt?: string;
  lastVerifiedAt?: string;
  lastError?: string;
  callbackUrl?: string;
  oauthStartUrl?: string;
}

export const PlatformIntegrationsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'brevo' | 'gmail' | 'all' | 'env'>('brevo');
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [envReport, setEnvReport] = useState<any>(null);
  const [loadingEnv, setLoadingEnv] = useState(false);
  
  // Brevo Primary Email State
  const [brevoTestRecipient, setBrevoTestRecipient] = useState('hello.agentdesktech@gmail.com');
  const [sendingBrevoTest, setSendingBrevoTest] = useState(false);
  const [brevoTestResult, setBrevoTestResult] = useState<{
    status: 'SUCCESS' | 'FAILED' | 'NOT_CONFIGURED';
    messageId?: string;
    timestamp: string;
    message?: string;
    error?: string;
  } | null>(null);

  // Gmail Specific State
  const [gmailDetails, setGmailDetails] = useState<GmailDetails>({
    status: 'NOT_CONNECTED',
    isConfigured: false,
    senderEmail: 'hello.agentdesktech@gmail.com',
    replyTo: 'hello.agentdesktech@gmail.com',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    hasClientId: false,
    hasClientSecret: false,
    hasRefreshToken: false
  });

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);

  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [gmailTestRecipient, setGmailTestRecipient] = useState('hello.agentdesktech@gmail.com');
  const [sendingGmailTest, setSendingGmailTest] = useState(false);
  
  const [gmailTestResult, setGmailTestResult] = useState<{
    status: 'SUCCESS' | 'FAILED' | 'NOT_CONNECTED';
    messageId?: string;
    timestamp: string;
    message?: string;
    error?: string;
  } | null>(null);

  const [oauthBanner, setOauthBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Send Test Email via Brevo API
  const handleSendBrevoTestEmail = async () => {
    const cleanRecipient = brevoTestRecipient.trim();
    if (!cleanRecipient) {
      alert('Please enter a recipient email address.');
      return;
    }

    setSendingBrevoTest(true);
    setBrevoTestResult(null);

    try {
      const data = await safeFetchJson('/api/platform/integrations/test-brevo-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanRecipient })
      });

      if (data.success && data.status === 'SUCCESS') {
        setBrevoTestResult({
          status: 'SUCCESS',
          messageId: data.messageId,
          timestamp: new Date().toLocaleTimeString(),
          message: data.message || 'Brevo accepted the test email.'
        });
      } else {
        setBrevoTestResult({
          status: data.status === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'FAILED',
          timestamp: new Date().toLocaleTimeString(),
          error: data.error || data.message || 'Brevo delivery failed.'
        });
      }
    } catch (err: any) {
      setBrevoTestResult({
        status: 'FAILED',
        timestamp: new Date().toLocaleTimeString(),
        error: err.message || 'An unexpected error occurred.'
      });
    } finally {
      setSendingBrevoTest(false);
      await fetchIntegrations();
    }
  };

  // General testing
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; details?: any } | null>(null);
  const [testEmailInput, setTestEmailInput] = useState('hello.agentdesktech@gmail.com');
  const [testPhoneInput, setTestPhoneInput] = useState('+15551234567');

  const fetchGmailStatus = async () => {
    try {
      const data = await safeFetchJson('/api/integrations/google/status');
      if (data.success) {
        setGmailDetails({
          status: data.status,
          isConfigured: data.isConfigured,
          senderEmail: data.senderEmail || 'hello.agentdesktech@gmail.com',
          replyTo: data.replyTo || 'hello.agentdesktech@gmail.com',
          scope: data.scope || 'https://www.googleapis.com/auth/gmail.send',
          hasClientId: data.hasClientId,
          hasClientSecret: data.hasClientSecret,
          hasRefreshToken: data.hasRefreshToken,
          maskedClientId: data.maskedClientId,
          connectedAt: data.connectedAt,
          lastSuccessfulSendAt: data.lastSuccessfulSendAt,
          lastVerifiedAt: data.lastVerifiedAt,
          lastError: data.lastError,
          callbackUrl: data.callbackUrl,
          oauthStartUrl: data.oauthStartUrl
        });
      }
    } catch (err) {
      console.error('Failed to fetch Gmail status:', err);
    }
  };

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson('/api/platform/integrations');
      if (data.success && data.integrations) {
        setIntegrations(data.integrations);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for query parameters from OAuth redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const gmailStatusParam = params.get('gmail_status');
      const messageParam = params.get('message');

      if (gmailStatusParam === 'connected') {
        setOauthBanner({
          type: 'success',
          message: 'Google OAuth 2.0 authorization completed! Gmail is now CONNECTED with offline send permission.'
        });
        setActiveTab('gmail');
      } else if (gmailStatusParam === 'error') {
        setOauthBanner({
          type: 'error',
          message: messageParam || 'Google OAuth authorization was declined or encountered an error.'
        });
        setActiveTab('gmail');
      }

      if (gmailStatusParam) {
        // Clean URL without reloading page
        const newUrl = window.location.pathname + (params.get('tab') ? `?tab=${params.get('tab')}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }

    fetchGmailStatus();
    fetchIntegrations();
    fetchEnvStatus();
  }, []);

  const fetchEnvStatus = async () => {
    setLoadingEnv(true);
    try {
      const data = await safeFetchJson('/api/platform/environment-status');
      if (data.success && data.report) {
        setEnvReport(data.report);
      }
    } catch (err) {
      console.error('Failed to load environment status:', err);
    } finally {
      setLoadingEnv(false);
    }
  };

  // Connect Gmail: Redirects to Google OAuth start endpoint
  const handleConnectGmail = () => {
    if (!gmailDetails.hasClientId) {
      setShowCredentialsModal(true);
      return;
    }

    // The authenticated session is already stored in the HttpOnly cookie.
    // Never place the session token in the OAuth URL.
    window.location.href = '/api/integrations/google/start';
  };

  // Save Google OAuth Client Credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCredentials(true);
    try {
      const data = await safeFetchJson('/api/integrations/google/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: clientIdInput.trim(),
          clientSecret: clientSecretInput.trim()
        })
      });

      if (data.success) {
        setShowCredentialsModal(false);
        await fetchGmailStatus();
        await fetchIntegrations();

        // Immediately launch OAuth flow
        // Continue through the HttpOnly session cookie, not a query-string token.
        window.location.href = '/api/integrations/google/start';
      } else {
        alert(data.error || 'Failed to save credentials');
      }
    } catch (err: any) {
      alert(err.message || 'Unexpected error saving credentials');
    } finally {
      setSavingCredentials(false);
    }
  };

  // Disconnect Gmail
  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? The stored refresh token will be wiped.')) {
      return;
    }

    setDisconnectingGmail(true);
    try {
      const data = await safeFetchJson('/api/integrations/google/disconnect', {
        method: 'POST'
      });

      if (data.success) {
        setGmailDetails(prev => ({
          ...prev,
          status: 'NOT_CONNECTED',
          isConfigured: false,
          hasRefreshToken: false,
          connectedAt: undefined
        }));
        setGmailTestResult(null);
        setOauthBanner({
          type: 'success',
          message: 'Gmail disconnected. Status updated to NOT CONNECTED.'
        });
        await fetchIntegrations();
      } else {
        alert(data.error || 'Failed to disconnect Gmail');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect Gmail');
    } finally {
      setDisconnectingGmail(false);
    }
  };

  // Send Test Email via Gmail API
  const handleSendGmailTestEmail = async () => {
    const cleanRecipient = gmailTestRecipient.trim();
    if (!cleanRecipient) {
      alert('Please enter a recipient email address.');
      return;
    }

    setSendingGmailTest(true);
    setGmailTestResult(null);

    try {
      const data = await safeFetchJson('/api/integrations/google/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: cleanRecipient
        })
      });

      if (data.status === 'SUCCESS' && data.success) {
        setGmailTestResult({
          status: 'SUCCESS',
          messageId: data.messageId,
          timestamp: new Date().toLocaleTimeString(),
          message: data.message || `Test email accepted by Gmail. Message ID: ${data.messageId}`
        });
        await fetchGmailStatus();
      } else if (data.status === 'NOT_CONNECTED') {
        setGmailTestResult({
          status: 'NOT_CONNECTED',
          timestamp: new Date().toLocaleTimeString(),
          error: data.error || data.message || 'Gmail API is not connected.'
        });
      } else {
        setGmailTestResult({
          status: 'FAILED',
          timestamp: new Date().toLocaleTimeString(),
          error: data.error?.message || (typeof data.error === 'string' ? data.error : (data.message || 'Gmail dispatch rejected by Google API.'))
        });
      }
    } catch (err: any) {
      setGmailTestResult({
        status: 'FAILED',
        timestamp: new Date().toLocaleTimeString(),
        error: err.message || 'An unexpected error occurred.'
      });
    } finally {
      setSendingGmailTest(false);
    }
  };

  const runGenericTest = async (integrationId: string) => {
    setTestingId(integrationId);
    setTestResult(null);

    let endpoint = '';
    let body: any = {};

    switch (integrationId) {
      case 'resend_email':
        endpoint = '/api/platform/integrations/test-email';
        body = { to: testEmailInput };
        break;
      case 'twilio_communications':
        endpoint = '/api/platform/integrations/test-sms';
        body = { phone: testPhoneInput };
        break;
      case 'razorpay_payments':
        endpoint = '/api/platform/integrations/test-payment';
        body = { amount: 4900 };
        break;
      case 'sentry_monitoring':
        endpoint = '/api/platform/integrations/test-error';
        body = { message: 'Synthetic Sentry Telemetry Verification Event' };
        break;
      case 'posthog_analytics':
        endpoint = '/api/platform/integrations/test-analytics';
        body = { event: 'admin_dashboard_viewed' };
        break;
      default:
        endpoint = '/api/platform/integrations/test';
        body = { integrationId };
    }

    try {
      const result = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      setTestResult({
        id: integrationId,
        success: !!result.success,
        message: result.message || (result.success ? 'Test completed successfully' : 'Test failed'),
        details: result
      });
    } catch (err: any) {
      setTestResult({
        id: integrationId,
        success: false,
        message: err.message || 'Unexpected test execution error'
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Hierarchy */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span>Platform Admin</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span>Settings</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className={activeTab === 'brevo' || activeTab === 'gmail' || activeTab === 'env' ? 'text-slate-400' : 'text-slate-200'}>Integrations</span>
        {activeTab === 'brevo' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-blue-400 font-bold">Brevo</span>
          </>
        )}
        {activeTab === 'gmail' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-400 font-bold">Gmail (Legacy)</span>
          </>
        )}
        {activeTab === 'env' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-400 font-bold">Environment Requirements</span>
          </>
        )}
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('brevo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'brevo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Brevo Email</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              integrations.find(i => i.id === 'brevo_email')?.status === 'CONNECTED'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-amber-950 text-amber-300 border border-amber-700'
            }`}>
              {integrations.find(i => i.id === 'brevo_email')?.status || 'CHECKING'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gmail')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'gmail'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Gmail Legacy</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('env');
              fetchEnvStatus();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'env'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Core Environment & Modular Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>All Channel Integrations</span>
          </button>
        </div>

        <button
          onClick={() => {
            fetchGmailStatus();
            fetchIntegrations();
          }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* OAuth Callback / Feedback Banner */}
      {oauthBanner && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
          oauthBanner.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-800 text-rose-200'
        }`}>
          <div className="flex items-start gap-3">
            {oauthBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-xs sm:text-sm">
                {oauthBanner.type === 'success' ? 'Gmail OAuth Handshake Succeeded' : 'Gmail Authorization Notice'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">{oauthBanner.message}</p>
            </div>
          </div>
          <button 
            onClick={() => setOauthBanner(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GMAIL INTEGRATION VIEW (SPECIFIED REQUIREMENTS 2, 8, 9) */}
      {/* ========================================================================= */}
      {/* BREVO PRIMARY TRANSACTIONAL EMAIL VIEW */}
      {activeTab === 'brevo' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Brevo Transactional Email</h2>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-full border border-blue-500/30">
                      PRIMARY SENDER
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    AgentDesk transactional email delivery through the Brevo API. Google OAuth is not required.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {integrations.find(i => i.id === 'brevo_email')?.status === 'CONNECTED' ? 'Status: CONNECTED' : 'Status: NOT CONFIGURED'}
              </span>
            </div>

            <div className="py-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sender</span>
                  <div className="font-mono text-slate-100 font-semibold truncate">
                    {integrations.find(i => i.id === 'brevo_email')?.senderEmail || 'hello.agentdesktech@gmail.com'}
                  </div>
                  <span className="text-[10px] text-slate-400">Configured through EMAIL_FROM</span>
                </div>
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Transport</span>
                  <div className="font-semibold text-emerald-400">Brevo HTTP API</div>
                  <span className="text-[10px] text-slate-500">POST /v3/smtp/email</span>
                </div>
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Google OAuth</span>
                  <div className="font-semibold text-slate-300">Not required</div>
                  <span className="text-[10px] text-slate-500">Gmail remains optional legacy support</span>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">Test recipient</label>
                    <input
                      type="email"
                      value={brevoTestRecipient}
                      onChange={e => setBrevoTestRecipient(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="you@example.com"
                    />
                  </div>
                  <button
                    onClick={handleSendBrevoTestEmail}
                    disabled={sendingBrevoTest}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sendingBrevoTest ? 'Sending...' : 'Send Test Email'}
                  </button>
                </div>

                {brevoTestResult && (
                  <div className={`mt-4 rounded-xl border p-3 text-xs ${
                    brevoTestResult.status === 'SUCCESS'
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}>
                    <div className="font-bold">
                      {brevoTestResult.status === 'SUCCESS' ? 'Test accepted by Brevo' : 'Test failed'}
                    </div>
                    <div className="mt-1 opacity-90">
                      {brevoTestResult.message || brevoTestResult.error}
                    </div>
                    {brevoTestResult.messageId && (
                      <div className="mt-1 font-mono opacity-70">Message ID: {brevoTestResult.messageId}</div>
                    )}
                    <div className="mt-1 opacity-60">Checked at {brevoTestResult.timestamp}</div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-300">
                <div className="font-bold text-blue-300 mb-1">Environment</div>
                <div className="font-mono text-slate-400">BREVO_API_KEY: {integrations.find(i => i.id === 'brevo_email')?.isConfigured ? 'Configured' : 'Not configured'}</div>
                <div className="mt-1 text-slate-500">The API key is never displayed; only its configured state is shown.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gmail' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            {/* Top Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Gmail</h2>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-full border border-blue-500/30">
                      OFFICIAL SENDER
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    AgentDesk transactional email delivery via official Google OAuth 2.0 API.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {gmailDetails.status === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Status: CONNECTED
                  </span>
                ) : gmailDetails.status === 'REAUTHORIZATION_REQUIRED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Status: REAUTHORIZATION REQUIRED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Status: NOT CONNECTED
                  </span>
                )}
              </div>
            </div>

            {/* Connection Information Body */}
            {gmailDetails.status === 'CONNECTED' ? (
              <div className="py-6 space-y-6">
                {/* Specifications Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Connected Account</span>
                    <div className="font-mono text-slate-100 font-semibold truncate">{gmailDetails.senderEmail}</div>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Official AgentDesk Inbox
                    </span>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Scope</span>
                    <div className="font-mono text-purple-300 text-[11px] truncate">{gmailDetails.scope}</div>
                    <span className="text-[10px] text-slate-400">Strictly minimal send scope</span>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Permissions</span>
                    <div className="font-semibold text-slate-100">Send emails only</div>
                    <span className="text-[10px] text-blue-400">Transactional notifications</span>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Inbox Access</span>
                    <div className="font-semibold text-emerald-400">None</div>
                    <span className="text-[10px] text-slate-500">Zero read or search permissions</span>
                  </div>
                </div>

                {/* Additional Connection Timestamps */}
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-500">Connected At:</span>{' '}
                      <span className="text-slate-300 font-mono">
                        {gmailDetails.connectedAt ? new Date(gmailDetails.connectedAt).toLocaleString() : 'Active session'}
                      </span>
                    </div>
                    {gmailDetails.lastSuccessfulSendAt && (
                      <div>
                        <span className="text-slate-500">Last Send:</span>{' '}
                        <span className="text-emerald-300 font-mono">
                          {new Date(gmailDetails.lastSuccessfulSendAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Refresh token encrypted with AES-256-GCM server-side</span>
                  </div>
                </div>

                {/* Primary Action Buttons: Send Test Email & Disconnect */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {/* Test Email Input Bar */}
                  <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <input
                      type="email"
                      value={gmailTestRecipient}
                      onChange={(e) => setGmailTestRecipient(e.target.value)}
                      placeholder="Recipient email"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <button
                      onClick={handleSendGmailTestEmail}
                      disabled={sendingGmailTest}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      {sendingGmailTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send Test Email</span>
                    </button>
                  </div>

                  <button
                    onClick={handleDisconnectGmail}
                    disabled={disconnectingGmail}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 text-xs font-semibold rounded-xl border border-slate-700 hover:border-rose-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              /* NOT CONNECTED VIEW */
              <div className="py-8 space-y-6">
                <div className="max-w-xl space-y-2">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Connect the official AgentDesk Gmail account (<span className="font-mono text-blue-300">hello.agentdesktech@gmail.com</span>) to deliver automated booking notices, lead notifications, and security codes directly from Gmail.
                  </p>
                  <p className="text-xs text-slate-500">
                    Authorization grants only the <code className="text-purple-300">https://www.googleapis.com/auth/gmail.send</code> scope. AgentDesk never requests or reads your Gmail inbox.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleConnectGmail}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-blue-600/20 transition flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Connect Gmail</span>
                  </button>

                  <button
                    onClick={() => setShowCredentialsModal(true)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>{gmailDetails.hasClientId ? 'Configure Client Credentials' : 'Set OAuth Client ID & Secret'}</span>
                  </button>
                </div>

                {/* Test Email section while NOT CONNECTED */}
                <div className="pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-2 max-w-lg">
                    <input
                      type="email"
                      value={gmailTestRecipient}
                      onChange={(e) => setGmailTestRecipient(e.target.value)}
                      placeholder="Recipient email"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <button
                      onClick={handleSendGmailTestEmail}
                      disabled={sendingGmailTest}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Email</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Testing while NOT CONNECTED will accurately return the <span className="text-amber-400 font-semibold">NOT CONNECTED</span> status.
                  </p>
                </div>
              </div>
            )}

            {/* Test Email Result Banner (Requirement 8) */}
            {gmailTestResult && (
              <div className={`mt-6 p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                gmailTestResult.status === 'SUCCESS'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : gmailTestResult.status === 'NOT_CONNECTED'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                  : 'bg-rose-950/40 border-rose-800 text-rose-200'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {gmailTestResult.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : gmailTestResult.status === 'NOT_CONNECTED' ? (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span>Actual Result: {gmailTestResult.status}</span>
                  </div>

                  <div className="font-mono text-xs opacity-90 space-y-1">
                    {gmailTestResult.status === 'SUCCESS' && gmailTestResult.messageId && (
                      <div>Message ID: <span className="font-bold text-emerald-300">{gmailTestResult.messageId}</span></div>
                    )}
                    <div>Dispatched Timestamp: {gmailTestResult.timestamp}</div>
                    {gmailTestResult.message && (
                      <div className="font-sans text-xs opacity-90">{gmailTestResult.message}</div>
                    )}
                    {gmailTestResult.error && (
                      <div className="text-rose-300 font-sans mt-1">Details: {gmailTestResult.error}</div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setGmailTestResult(null)}
                  className="opacity-70 hover:opacity-100 text-xs p-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALL INTEGRATIONS GRID */}
      {/* ========================================================================= */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          {/* Test Feedback Notice */}
          {testResult && (
            <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-800 text-rose-200'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-xs sm:text-sm">
                    {testResult.success ? 'Operational Success' : 'Execution Notice'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                </div>
              </div>
              <button 
                onClick={() => setTestResult(null)}
                className="text-xs opacity-70 hover:opacity-100 p-1"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((item) => {
              const isConnected = item.status === 'CONNECTED';
              return (
                <div 
                  key={item.id} 
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-white">{item.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isConnected
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                    {item.id === 'gmail_oauth' ? (
                      <button
                        onClick={() => setActiveTab('gmail')}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold rounded-lg border border-blue-500/30 transition flex items-center gap-1.5"
                      >
                        <span>Manage Gmail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => runGenericTest(item.id)}
                        disabled={testingId === item.id}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {testingId === item.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span>Test Channel</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-slate-500">{item.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENVIRONMENT & REQUIREMENTS ARCHITECTURE VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'env' && (
        <div className="space-y-6">
          {/* Architecture Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Modular Integration Architecture</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    ISOLATION ENFORCED
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Only core infrastructure variables are mandatory for platform boot. All channel integrations
                  (Gmail, Razorpay, Twilio, PostHog, Sentry, S3, Firebase, WhatsApp) operate as independent,
                  modular plugins. Missing external credentials will <span className="font-semibold text-white">never</span> crash the system or block deployment.
                </p>
              </div>
            </div>
          </div>

          {/* Core Required vs Optional Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Core Required Variables */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">Core Mandatory Infrastructure</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {envReport ? (envReport.coreValid ? 'ALL CONFIGURED' : 'ACTION REQUIRED') : 'CORE SYSTEM'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                The minimum 5 variables required for AgentDesk to boot and authenticate administrators securely.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'DATABASE_URL', desc: 'Relational PostgreSQL connection string' },
                  { name: 'SESSION_SECRET', desc: 'Cryptographic session encryption secret' },
                  { name: 'APP_URL', desc: 'Canonical base URL for OAuth redirects' },
                  { name: 'PLATFORM_ADMIN_EMAIL', desc: 'Root administrator account email' },
                  { name: 'PLATFORM_ADMIN_INITIAL_PASSWORD', desc: 'Initial password (hashed on first boot, never overwritten)' }
                ].map((item) => {
                  const isConfigured = envReport?.core?.[item.name]?.configured ?? true;
                  return (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs font-bold text-slate-200">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isConfigured 
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      }`}>
                        {isConfigured ? 'CONFIGURED' : 'MISSING'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Gmail OAuth Requirements */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-white">Gmail Transactional Email</h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  gmailDetails.status === 'CONNECTED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}>
                  {gmailDetails.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official sender: <span className="text-white font-mono">{gmailDetails.senderEmail}</span>. Refresh tokens are acquired via OAuth and stored server-side.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-bold text-slate-200">GOOGLE_CLIENT_ID</div>
                    <div className="text-[11px] text-slate-400">OAuth 2.0 Web Application Client ID</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    gmailDetails.hasClientId 
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                      : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  }`}>
                    {gmailDetails.hasClientId ? 'CONFIGURED' : 'NOT SET'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-bold text-slate-200">GOOGLE_CLIENT_SECRET</div>
                    <div className="text-[11px] text-slate-400">OAuth 2.0 Client Secret</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    gmailDetails.hasClientSecret 
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                      : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  }`}>
                    {gmailDetails.hasClientSecret ? 'CONFIGURED' : 'NOT SET'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-bold text-slate-400">GOOGLE_REFRESH_TOKEN</div>
                    <div className="text-[11px] text-emerald-400 font-medium">NOT REQUIRED via env (Acquired via Connect Gmail flow)</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    gmailDetails.hasRefreshToken 
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {gmailDetails.hasRefreshToken ? 'TOKEN STORED' : 'NOT CONNECTED'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('gmail')}
                  className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold rounded-xl border border-blue-500/30 text-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>Open Gmail OAuth Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Optional Channel Integrations Status Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Modular Optional Services Matrix</h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">Zero startup blockage</span>
            </div>
            <p className="text-xs text-slate-400">
              These external services are optional. If not configured, the system logs their status as NOT_CONFIGURED and routes gracefully without crashing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: 'Razorpay Billing', vars: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'], desc: 'Payment Gateway & HMAC Webhooks' },
                { name: 'Twilio SMS & 2FA', vars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'], desc: 'SMS Dispatch & Two-Factor Auth' },
                { name: 'PostHog Analytics', vars: ['POSTHOG_API_KEY', 'POSTHOG_HOST'], desc: 'Product Telemetry & Usage Logs' },
                { name: 'Sentry Monitoring', vars: ['SENTRY_DSN'], desc: 'Error Tracking & Performance Tracing' },
                { name: 'S3 Object Storage', vars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'], desc: 'Knowledge Base Attachments' },
                { name: 'WhatsApp Business', vars: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'], desc: 'WhatsApp Cloud Business API' }
              ].map((svc) => (
                <div key={svc.name} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{svc.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400">
                        OPTIONAL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{svc.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 font-mono text-[10px] text-slate-500 space-y-0.5">
                    {svc.vars.map((v) => (
                      <div key={v} className="truncate">• {v}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GOOGLE CLIENT CREDENTIALS MODAL */}
      {/* ========================================================================= */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Configure Google OAuth Credentials</h3>
              </div>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your Google Cloud OAuth 2.0 Web Client credentials. After saving, you will be redirected to authorize <span className="text-blue-300 font-mono">hello.agentdesktech@gmail.com</span> with offline access.
            </p>

            <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 text-[11px] text-blue-200 space-y-1">
              <div><strong>Scope requested:</strong> https://www.googleapis.com/auth/gmail.send</div>
              <div><strong>Authorized Redirect URI:</strong> <code className="text-white font-mono">{gmailDetails.callbackUrl || '/api/integrations/google/callback'}</code></div>
              <div className="text-slate-400 text-[10px] mt-1">Note: Refresh tokens are retrieved through the OAuth flow and encrypted server-side.</div>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Google Client ID (GOOGLE_CLIENT_ID) *
                </label>
                <input
                  type="text"
                  required
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Google Client Secret (GOOGLE_CLIENT_SECRET) *
                </label>
                <input
                  type="password"
                  required
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="GOCSPX-xxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCredentials}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingCredentials && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Authorize Gmail</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
