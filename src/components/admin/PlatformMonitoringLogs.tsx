import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Shield, 
  Layers, 
  AlertOctagon, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  Clock,
  Search,
  Filter
} from 'lucide-react';

export const PlatformMonitoringLogs: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'emails' | 'queue' | 'errors' | 'audit'>('emails');
  const [data, setData] = useState<{
    metrics: any;
    emailLogs: any[];
    auditLogs: any[];
    queueJobs: any[];
    recentErrors: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('agentdesk_session_token') || sessionStorage.getItem('agentdesk_session_token');
      const res = await fetch('/api/platform/monitoring', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Emails Dispatched</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {data?.metrics?.totalEmailsSent ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400">Background Jobs</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {data?.metrics?.totalQueueJobs ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400">Dead Letter Jobs</div>
          <div className={`text-xl font-bold mt-1 font-mono ${
            (data?.metrics?.deadLetterCount ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
          }`}>
            {data?.metrics?.deadLetterCount ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400">Security Audit Records</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {data?.metrics?.totalAuditLogs ?? 0}
          </div>
        </div>
      </div>

      {/* Main Monitoring Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveSubTab('emails')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'emails' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-blue-500" />
              Email Delivery Logs
            </button>
            <button
              onClick={() => setActiveSubTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'queue' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              Background Queue
            </button>
            <button
              onClick={() => setActiveSubTab('errors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'errors' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              Sentry Exceptions
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'audit' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Audit Stream
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter logs..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchMonitoringData}
              disabled={loading}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Email Delivery Logs */}
        {activeSubTab === 'emails' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Recipient</th>
                  <th className="py-2.5 px-4 font-semibold">Template / Subject</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Provider</th>
                  <th className="py-2.5 px-4 font-semibold">Message ID</th>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.emailLogs && data.emailLogs.length > 0 ? (
                  data.emailLogs
                    .filter(log => !filterQuery || log.to.toLowerCase().includes(filterQuery.toLowerCase()) || (log.subject && log.subject.toLowerCase().includes(filterQuery.toLowerCase())))
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-200 font-mono">
                          {log.to}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-300">
                            {log.template || 'Direct Email'}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{log.subject}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === 'SENT' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {log.status === 'SENT' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 uppercase">
                          {log.provider}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                          {log.messageId || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No transactional emails dispatched yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Background Queue */}
        {activeSubTab === 'queue' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Job ID</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Attempts</th>
                  <th className="py-2.5 px-4 font-semibold">Failure Details</th>
                  <th className="py-2.5 px-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.queueJobs && data.queueJobs.length > 0 ? (
                  data.queueJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {job.id}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {job.type}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' :
                          job.status === 'PENDING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' :
                          job.status === 'DEAD_LETTER' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        {job.attemptCount} / {job.maxAttempts}
                      </td>
                      <td className="py-2.5 px-4 text-rose-500 truncate max-w-xs text-[11px]">
                        {job.failureReason || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No queue jobs registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Sentry Exceptions */}
        {activeSubTab === 'errors' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.recentErrors && data.recentErrors.length > 0 ? (
              data.recentErrors.map((err) => (
                <div key={err.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      {err.message}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {err.stack && (
                    <pre className="mt-2 p-2.5 bg-slate-950 text-slate-300 rounded font-mono text-[10px] overflow-x-auto">
                      {err.stack}
                    </pre>
                  )}
                  {err.context && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      Context: {JSON.stringify(err.context)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No exceptions logged. Zero error monitoring events.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Audit Stream */}
        {activeSubTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Action</th>
                  <th className="py-2.5 px-4 font-semibold">Actor Email</th>
                  <th className="py-2.5 px-4 font-semibold">Tenant</th>
                  <th className="py-2.5 px-4 font-semibold">Entity</th>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.auditLogs && data.auditLogs.length > 0 ? (
                  data.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {log.actorEmail}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {log.tenantId || 'platform'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                        {log.entityType}: {log.entityId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No security audit logs recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
