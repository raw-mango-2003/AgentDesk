import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Mail, 
  Play, 
  Pause, 
  ShieldCheck, 
  Activity, 
  Send,
  Layers,
  FileText,
  Clock,
  Filter,
  Check
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  triggerEvent: string;
  action: string;
  channel: 'Email' | 'Multi-Channel' | 'In-App' | 'Webhook';
  templateId?: string;
  active: boolean;
  successRate: number;
  totalExecutions: number;
  lastExecutedAt?: string;
}

interface AutomationStats {
  totalAutomations: number;
  activeAutomations: number;
  pausedAutomations: number;
  emailsSentToday: number;
  failureRate: number;
}

interface DeliveryLog {
  id: string;
  to: string;
  subject: string;
  templateId?: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  provider: string;
  messageId?: string;
  error?: string;
  retryCount: number;
  timestamp: string;
}

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

export const PlatformAutomationsDashboard: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<AutomationStats>({
    totalAutomations: 28,
    activeAutomations: 28,
    pausedAutomations: 0,
    emailsSentToday: 0,
    failureRate: 0.0
  });
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Verification Test Suite State
  const [runningTestSuite, setRunningTestSuite] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState<{
    allPassed: boolean;
    passedCount: number;
    totalCount: number;
    testResults: TestResult[];
  } | null>(null);

  // Delivery Logs State
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'test_runner' | 'logs'>('rules');

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('agentdesk_session_token') || sessionStorage.getItem('agentdesk_session_token');
      const res = await fetch('/api/platform/automations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAutomations(data.automations || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load automations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('agentdesk_session_token') || sessionStorage.getItem('agentdesk_session_token');
      const res = await fetch('/api/platform/email-logs?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const token = localStorage.getItem('agentdesk_session_token') || sessionStorage.getItem('agentdesk_session_token');
      const res = await fetch(`/api/platform/automations/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.rule) {
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: data.rule.active } : a));
        // Update stats
        setStats(prev => ({
          ...prev,
          activeAutomations: prev.activeAutomations + (data.rule.active ? 1 : -1),
          pausedAutomations: prev.pausedAutomations + (data.rule.active ? -1 : 1)
        }));
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const runVerificationTestSuite = async () => {
    setRunningTestSuite(true);
    setTestSuiteResults(null);
    try {
      const token = localStorage.getItem('agentdesk_session_token') || sessionStorage.getItem('agentdesk_session_token');
      const res = await fetch('/api/platform/automations/test-suite', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTestSuiteResults({
          allPassed: data.allPassed,
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          testResults: data.testResults || []
        });
      }
    } catch (err: any) {
      console.error('Failed to run test suite:', err);
    } finally {
      setRunningTestSuite(false);
    }
  };

  const filteredAutomations = automations.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rule.triggerEvent.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rule.action.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterCategory === 'ACTIVE') return matchesSearch && rule.active;
    if (filterCategory === 'PAUSED') return matchesSearch && !rule.active;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Internal Engine & Gmail Hub
            </span>
            <span className="text-slate-400 text-xs">Zero External Service Dependencies</span>
          </div>
          <h2 className="text-xl font-bold mt-2 text-white">Platform Automation & Notification Engine</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            28 central automation workflows executing seamlessly via official Gmail API (hello.agentdesktech@gmail.com). Event deduplication, SHA-256 token security, and in-memory delivery audit logging.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setActiveSubTab('test_runner'); runVerificationTestSuite(); }}
            disabled={runningTestSuite}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${runningTestSuite ? 'animate-spin' : ''}`} />
            <span>Run 10-Check Test Suite</span>
          </button>
          <button
            onClick={() => { fetchAutomations(); if (activeSubTab === 'logs') fetchLogs(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total Automations</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {stats.totalAutomations}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Core Platform Workflows</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Active Automations</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {stats.activeAutomations}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Ready for Event Dispatch</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Paused Automations</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {stats.pausedAutomations}
          </div>
          <span className="text-[10px] text-slate-400">User paused</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Emails Sent Today</span>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">
            {stats.emailsSentToday}
          </div>
          <span className="text-[10px] text-slate-400">via Official Gmail API</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Failure Rate</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {stats.failureRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Deduplicated & Retried</span>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'rules'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Automations List ({automations.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('test_runner'); if (!testSuiteResults && !runningTestSuite) runVerificationTestSuite(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'test_runner'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verification Test Suite (10 Checks)</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('logs'); fetchLogs(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'logs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Email Delivery Logs</span>
          </button>
        </div>
      </div>

      {/* 1. AUTOMATIONS RULES LIST */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search automations by name, trigger event, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                onClick={() => setFilterCategory('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  filterCategory === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({automations.length})
              </button>
              <button
                onClick={() => setFilterCategory('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  filterCategory === 'ACTIVE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Active ({stats.activeAutomations})
              </button>
              <button
                onClick={() => setFilterCategory('PAUSED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  filterCategory === 'PAUSED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Paused ({stats.pausedAutomations})
              </button>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Workflow Name</th>
                    <th className="px-4 py-3">Trigger Event</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Success Rate</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAutomations.map((rule) => (
                    <tr 
                      key={rule.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${rule.active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span>{rule.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-purple-600 dark:text-purple-400">
                        {rule.triggerEvent}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {rule.action}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                          <Mail className="w-2.5 h-2.5" />
                          {rule.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {rule.successRate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        {rule.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Pause className="w-2.5 h-2.5" />
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggle(rule.id)}
                          disabled={togglingId === rule.id}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                            rule.active
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                          }`}
                        >
                          {togglingId === rule.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : rule.active ? (
                            <>
                              <Pause className="w-3 h-3" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. AUTOMATED VERIFICATION TEST SUITE RUNNER */}
      {activeSubTab === 'test_runner' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                10-Point Automation & Security Verification Suite
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Executes end-to-end verification of Gmail OAuth, Password Reset hashes, Account Setup, Deduplication, and Non-mandatory Resilience.
              </p>
            </div>
            <button
              onClick={runVerificationTestSuite}
              disabled={runningTestSuite}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningTestSuite ? 'animate-spin' : ''}`} />
              <span>{runningTestSuite ? 'Executing Tests...' : 'Re-Run All Checks'}</span>
            </button>
          </div>

          {runningTestSuite && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">Executing Automated Verification Test Suite...</p>
              <p className="text-xs text-slate-500">Testing SHA-256 token hashing, single-use, Gmail OAuth send, and deduplication</p>
            </div>
          )}

          {testSuiteResults && !runningTestSuite && (
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                testSuiteResults.allPassed
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              }`}>
                <div className="flex items-center gap-3">
                  {testSuiteResults.allPassed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {testSuiteResults.allPassed ? 'All 10 Verification Checks Passed Successfully' : 'Some Verification Checks Failed'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      {testSuiteResults.passedCount} of {testSuiteResults.totalCount} tests passed with complete cryptographic and functional isolation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testSuiteResults.testResults.map((t, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-xl p-4 flex flex-col justify-between ${
                      t.passed
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-rose-50/20 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {t.name}
                          </span>
                        </div>
                        {t.passed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3" /> FAIL
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-1">
                        Category: {t.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed font-mono text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      {t.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. EMAIL DELIVERY LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Email Delivery Audit Records
              </h3>
              <p className="text-xs text-slate-500">
                In-memory delivery records (last 50). Zero passwords or raw authentication tokens are logged.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Retries</th>
                    <th className="px-4 py-3">Message ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No delivery logs recorded yet. Send a test email from the Gmail Integration page.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                          {log.to}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {log.subject}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {log.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.status === 'SENT' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> SENT
                            </span>
                          ) : log.status === 'QUEUED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                              <Clock className="w-2.5 h-2.5" /> QUEUED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                              <XCircle className="w-2.5 h-2.5" /> FAILED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {log.retryCount}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                          {log.messageId || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
