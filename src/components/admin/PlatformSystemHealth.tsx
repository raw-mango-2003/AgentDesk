import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Server, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  Play, 
  AlertTriangle,
  Zap,
  Terminal,
  Lock
} from 'lucide-react';

interface SystemHealthData {
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  subsystems: Record<string, {
    status: string;
    label: string;
    details: Record<string, any>;
  }>;
}

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

export const PlatformSystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState<{
    allPassed: boolean;
    passedCount: number;
    totalCount: number;
    testResults: TestResult[];
  } | null>(null);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/platform/system-health', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const runProductionTests = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/system/run-production-tests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        setTestSuiteResults(data);
      }
    } catch (err) {
      console.error('Failed to run production tests:', err);
    } finally {
      setRunningTests(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Health Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">System Status</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Operational
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Server Uptime</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
              {health ? formatUptime(health.uptimeSeconds) : '...'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600 dark:text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Memory Allocation</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
              {health ? `${health.memory.heapUsedMb} MB / ${health.memory.heapTotalMb} MB` : '...'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Environment</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 capitalize">
              {health?.environment || 'Production'}
            </div>
          </div>
        </div>
      </div>

      {/* Automated Production Test Suite Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-500/40 flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                Live Verification Suite
              </span>
              <span className="text-slate-400 text-xs font-mono">CI/CD Standard</span>
            </div>
            <h3 className="text-xl font-bold mt-2 text-white">Automated Production E2E Test Suite</h3>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Executes deterministic verification across Scrypt hashing, Resend template rendering, Twilio OTP challenges, Razorpay HMAC signature checks, background queue backoffs, and PII redaction.
            </p>
          </div>

          <button
            onClick={runProductionTests}
            disabled={runningTests}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md transition disabled:opacity-50"
          >
            {runningTests ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Executing Tests...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Run Production Test Suite
              </>
            )}
          </button>
        </div>

        {/* Test Results Table */}
        {testSuiteResults && (
          <div className="mt-6 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {testSuiteResults.allPassed ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    All {testSuiteResults.totalCount} Automated Tests Passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {testSuiteResults.passedCount} / {testSuiteResults.totalCount} Tests Passed
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Execution Completed at {new Date().toLocaleTimeString()}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 mt-2">
              {testSuiteResults.testResults.map((t, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    {t.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-200">
                        {t.name}
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                          {t.category}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-0.5">{t.details}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                    t.passed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                  }`}>
                    {t.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subsystems Health Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Subsystem Diagnostic Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              State inspection of core isolated processes and background queue handlers.
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loadingHealth}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {health && Object.entries(health.subsystems).map(([key, sys]: [string, any]) => {
            const isHealthy = sys.status === 'HEALTHY' || (typeof sys.status === 'string' && sys.status.includes('ACTIVE'));
            return (
              <div 
                key={key}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                      {sys.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      isHealthy 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}>
                      {sys.status}
                    </span>
                  </div>

                  {/* Details metadata */}
                  <div className="mt-3 space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {Object.entries(sys.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
