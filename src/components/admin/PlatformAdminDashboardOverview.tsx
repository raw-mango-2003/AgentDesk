import React from 'react';
import {
  Building2,
  Bot,
  MessageSquare,
  Users,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Clock,
  Zap,
  ArrowUpRight,
  Plus,
  Mail,
  CheckCircle2,
  DollarSign,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Business, AIAgent, AnalyticsSummary } from '../../types';
import { getAnalyticsSummary, safeFetchJson } from '../../lib/dbService';

interface PlatformAdminDashboardOverviewProps {
  businesses: Business[];
  agents?: AIAgent[];
  subscriptionsCount?: number;
  subscriptionsList?: any[];
  paymentRecords?: any[];
  pendingSignups?: any[];
  onNavigateSection: (sectionKey: any) => void;
  onOpenCreateBusiness: () => void;
  onOpenInviteOwner: () => void;
}

export const PlatformAdminDashboardOverview: React.FC<PlatformAdminDashboardOverviewProps> = ({
  businesses = [],
  agents = [],
  subscriptionsCount,
  subscriptionsList = [],
  paymentRecords = [],
  pendingSignups = [],
  onNavigateSection,
  onOpenCreateBusiness,
  onOpenInviteOwner
}) => {
  const [tenantAnalytics, setTenantAnalytics] = React.useState<Record<string, AnalyticsSummary>>({});
  const [systemHealth, setSystemHealth] = React.useState<{ status: string; uptimeSeconds?: number } | null>(null);

  const activeBusinessesCount = businesses.filter(b => ['active', 'trial', 'ACTIVE', 'TRIAL'].includes(String(b.status))).length;
  const activeSubscriptions = subscriptionsList.filter((s: any) => ['active', 'ACTIVE', 'trial', 'TRIAL'].includes(String(s.status))).length;
  const actualSubsCount = subscriptionsCount ?? activeSubscriptions;

  React.useEffect(() => {
    let cancelled = false;
    const loadOperationalStats = async () => {
      const results = await Promise.all(
        businesses.map(async (business) => {
          try {
            return [business.id, await getAnalyticsSummary(business.id)] as const;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, AnalyticsSummary> = {};
      results.forEach((result) => {
        if (result) next[result[0]] = result[1];
      });
      setTenantAnalytics(next);
      try {
        const health = await safeFetchJson('/api/platform/system-health');
        if (!cancelled && health?.success) {
          setSystemHealth({ status: health.environment ? 'HEALTHY' : 'UNKNOWN', uptimeSeconds: health.uptimeSeconds });
        }
      } catch {
        if (!cancelled) setSystemHealth(null);
      }
    };
    if (businesses.length > 0) loadOperationalStats();
    else {
      setTenantAnalytics({});
      setSystemHealth(null);
    }
    return () => { cancelled = true; };
  }, [businesses]);

  const analyticsValues = Object.values(tenantAnalytics);
  const totalConversations = analyticsValues.reduce((sum, item) => sum + item.totalConversations, 0);
  const leadsCaptured = analyticsValues.reduce((sum, item) => sum + (item.leadsCapturedCount || 0), 0);
  const activeBillingRecords = subscriptionsList.filter((s: any) => ['active', 'ACTIVE', 'trial', 'TRIAL'].includes(String(s.status)));
  const billingCurrencies = Array.from(new Set(activeBillingRecords.map((s: any) => s.currency).filter(Boolean)));
  const mrrAmount = activeBillingRecords.reduce((sum: number, s: any) => sum + (Number(s.monthlyFee) || Number(s.recurring_base_amount) || 0), 0);
  const mrrDisplay = billingCurrencies.length === 1
    ? billingCurrencies[0] + ' ' + mrrAmount.toLocaleString()
    : billingCurrencies.length > 1 ? 'Mixed currencies' : 'N/A';

  // Payments today
  const todayDateString = new Date().toISOString().split('T')[0];
  const paymentsToday = paymentRecords.filter(p => {
    const d = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '';
    return d === todayDateString;
  });

  const failedPayments = paymentRecords.filter(p => p.status === 'FAILED');
  const pendingPaymentsCount = pendingSignups.filter(s => s.status === 'PENDING').length;
  const openDisputesCount = 0; // disputes managed via PayPal/Razorpay portals

  const kpis = [
    {
      id: 'active-businesses',
      title: 'Active Businesses',
      value: activeBusinessesCount.toString(),
      subtext: `${businesses.length} total registered tenants`,
      icon: Building2,
      color: 'blue',
      sectionKey: 'workspaces'
    },
    {
      id: 'ai-conversations',
      title: 'Total AI Conversations',
      value: totalConversations.toLocaleString(),
      subtext: 'Across all active receptionists',
      icon: MessageSquare,
      color: 'purple',
      sectionKey: 'agents'
    },
    {
      id: 'leads-captured',
      title: 'Leads Captured',
      value: leadsCaptured.toLocaleString(),
      subtext: 'Autonomous lead extraction',
      icon: Users,
      color: 'emerald',
      sectionKey: 'workspaces'
    },
    {
      id: 'ai-uptime',
      title: 'AI Uptime',
      value: systemHealth?.status === 'HEALTHY' ? 'Healthy' : 'N/A',
      subtext: systemHealth?.uptimeSeconds !== undefined ? `Uptime ${Math.floor(systemHealth.uptimeSeconds / 3600)}h` : 'Live health check unavailable',
      icon: Activity,
      color: 'indigo',
      sectionKey: 'system_health'
    },
    {
      id: 'mrr',
      title: 'Estimated MRR',
      value: mrrDisplay,
      subtext: 'Monthly recurring revenue baseline',
      icon: TrendingUp,
      color: 'emerald',
      sectionKey: 'subscriptions'
    },
    {
      id: 'active-subscriptions',
      title: 'Active Subscriptions',
      value: actualSubsCount.toString(),
      subtext: 'Razorpay recurring plans & checkout',
      icon: CreditCard,
      color: 'blue',
      sectionKey: 'subscriptions'
    },
    {
      id: 'payments-today',
      title: 'Payments Today',
      value: paymentsToday.length.toString(),
      subtext: `${paymentRecords.length} lifetime transactions`,
      icon: DollarSign,
      color: 'emerald',
      sectionKey: 'payments'
    },
    {
      id: 'failed-payments',
      title: 'Failed Payments',
      value: failedPayments.length.toString(),
      subtext: failedPayments.length === 0 ? 'Zero active payment failures' : 'Requires review',
      icon: AlertCircle,
      color: failedPayments.length > 0 ? 'rose' : 'slate',
      sectionKey: 'payments'
    },
    {
      id: 'pending-payments',
      title: 'Pending Payments',
      value: pendingPaymentsCount.toString(),
      subtext: pendingPaymentsCount === 0 ? 'All checkouts activated' : 'Awaiting confirmation',
      icon: Clock,
      color: pendingPaymentsCount > 0 ? 'amber' : 'slate',
      sectionKey: 'payments'
    },
    {
      id: 'open-disputes',
      title: 'Open Disputes',
      value: openDisputesCount === 0 ? 'N/A' : openDisputesCount.toString(),
      subtext: 'Provider dispute feed not connected',
      icon: ShieldCheck,
      color: 'emerald',
      sectionKey: 'payments'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'purple':
        return {
          border: 'border-purple-500/20',
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          badge: 'bg-purple-500/20 text-purple-300'
        };
      case 'emerald':
        return {
          border: 'border-emerald-500/20',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300'
        };
      case 'indigo':
        return {
          border: 'border-indigo-500/20',
          bg: 'bg-indigo-500/10',
          text: 'text-indigo-400',
          badge: 'bg-indigo-500/20 text-indigo-300'
        };
      case 'amber':
        return {
          border: 'border-amber-500/20',
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300'
        };
      case 'rose':
        return {
          border: 'border-rose-500/20',
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          badge: 'bg-rose-500/20 text-rose-300'
        };
      case 'blue':
      default:
        return {
          border: 'border-blue-500/20',
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-300'
        };
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Platform Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              SaaS Control Plane
            </span>
            <span className="text-xs text-slate-400 font-mono">v3.4 Multi-Tenant Engine</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Platform Administration
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Global multi-tenant control center • Autonomous receptionists, billing, credentials, and telemetry
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={onOpenInviteOwner}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>Invite Owner</span>
          </button>
          <button
            onClick={onOpenCreateBusiness}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Business</span>
          </button>
        </div>
      </div>

      {/* KPI Grid (Requirement 8: Responsive CSS grid: Desktop 4, Tablet 2, Mobile 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const colors = getColorClasses(kpi.color);
          return (
            <div
              key={kpi.id}
              onClick={() => onNavigateSection(kpi.sectionKey)}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                  {kpi.title}
                </span>
                <div className={`w-8 h-8 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl font-black text-white tracking-tight">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{kpi.subtext}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Operational Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Payment Gateways Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Payment Gateways</h3>
            </div>
            <button
              onClick={() => onNavigateSection('settings')}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
            >
              Configure →
            </button>
          </div>

          <div className="space-y-3">
            {/* Razorpay Status */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  RZ
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Razorpay (Domestic & International)</div>
                  <div className="text-[10px] text-slate-400">Cards, UPI, Netbanking, International Currencies</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active
              </span>
            </div>

            {/* Razorpay Webhook Status */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  WH
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Razorpay Live Webhook</div>
                  <div className="text-[10px] text-slate-400">HMAC-SHA256 Server Signature Verification</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Ready
              </span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-slate-800">
            Cryptographic signature verification ensures tenants are activated strictly upon confirmed payment receipts.
          </div>
        </div>

        {/* Quick Businesses / Tenants Overview */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Recent Customer Workspaces</h3>
            </div>
            <button
              onClick={() => onNavigateSection('workspaces')}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
            >
              View All ({businesses.length}) →
            </button>
          </div>

          <div className="space-y-2">
            {businesses.slice(0, 4).map((b) => (
              <div
                key={b.id}
                onClick={() => onNavigateSection('workspaces')}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/60 border border-slate-800/80 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                    style={{ backgroundColor: b.primaryColor || '#6366f1' }}
                  >
                    {b.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                      {b.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {b.industry} • Plan: {b.plan?.toUpperCase()} • {b.currency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {b.country}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    b.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {b.status || 'ACTIVE'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span>Every tenant is protected by cryptographic database isolation.</span>
            <button
              onClick={() => onNavigateSection('isolation_tests')}
              className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
            >
              Run Isolation Tests →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
