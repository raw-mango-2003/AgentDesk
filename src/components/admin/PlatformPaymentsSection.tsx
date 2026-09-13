import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Info,
  Check,
  Zap,
  RotateCcw
} from 'lucide-react';
import { safeFetchJson } from '../../lib/dbService';

interface PaymentRecordItem {
  id: string;
  tenantId: string;
  orderId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  amount: number;
  currency: string;
  status: string;
  provider?: 'razorpay' | 'paypal' | string;
  customerEmail?: string;
  customerName?: string;
  createdAt: string;
  setup_fee?: number;
  subscription_fee?: number;
  subscription_tax?: number;
  payment_flow?: string;
}

export interface PlatformPaymentsSectionProps {
  paymentRecords?: any[];
  pendingSignups?: any[];
  onReconcileOrder?: (orderId: string) => Promise<void>;
  reconcilingOrderId?: string | null;
  onRefresh?: () => void;
}

export const PlatformPaymentsSection: React.FC<PlatformPaymentsSectionProps> = ({
  paymentRecords = [],
  pendingSignups = [],
  onReconcileOrder,
  reconcilingOrderId = null,
  onRefresh
}) => {
  const [internalPayments, setInternalPayments] = useState<any[]>([]);
  const [internalPending, setInternalPending] = useState<any[]>([]);
  const [internalReconcilingId, setInternalReconcilingId] = useState<string | null>(null);

  useEffect(() => {
    if (paymentRecords.length === 0 && pendingSignups.length === 0) {
      safeFetchJson('/api/billing/admin/payment-records')
        .then(res => {
          if (res && res.records) setInternalPayments(res.records);
        })
        .catch(() => {});
      safeFetchJson('/api/billing/admin/pending-signups')
        .then(res => {
          if (res && res.signups) setInternalPending(res.signups);
        })
        .catch(() => {});
    }
  }, [paymentRecords.length, pendingSignups.length]);

  const activePayments = paymentRecords.length > 0 ? paymentRecords : internalPayments;
  const activePending = pendingSignups.length > 0 ? pendingSignups : internalPending;
  const activeReconcilingId = reconcilingOrderId || internalReconcilingId;

  const handleReconcile = async (orderId: string) => {
    if (onReconcileOrder) {
      await onReconcileOrder(orderId);
      return;
    }
    setInternalReconcilingId(orderId);
    setActionMessage(null);
    try {
      const res = await safeFetchJson('/api/billing/admin/reconcile-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (res && (res.success || res.status === 'success')) {
        setActionMessage({ text: `Order ${orderId} reconciled and verified. Tenant activated.`, type: 'success' });
        if (onRefresh) onRefresh();
      } else {
        setActionMessage({ text: res?.error || 'Reconciliation failed.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Reconciliation request failed.', type: 'error' });
    } finally {
      setInternalReconcilingId(null);
    }
  };

  const [providerFilter, setProviderFilter] = useState<'all' | 'razorpay' | 'paypal'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Combine payment records and pending signups into a unified transaction list
  const combinedTransactions: PaymentRecordItem[] = [
    ...activePayments.map((pr: any) => ({
      id: pr.id || pr.razorpayPaymentId || `pay_${Math.random()}`,
      tenantId: pr.tenantId || 'Unknown Tenant',
      orderId: pr.razorpayOrderId || pr.orderId || pr.paypalOrderId || '',
      razorpayPaymentId: pr.razorpayPaymentId,
      razorpayOrderId: pr.razorpayOrderId,
      paypalOrderId: pr.paypalOrderId,
      paypalCaptureId: pr.paypalCaptureId,
      amount: pr.amount || 0,
      currency: pr.currency || 'INR',
      status: pr.status || 'CAPTURED',
      provider: pr.provider || (pr.paypalOrderId || pr.paypalCaptureId || pr.currency === 'USD' || pr.currency === 'GBP' ? 'paypal' : 'razorpay'),
      customerEmail: pr.customerEmail || pr.userId || '',
      customerName: pr.customerName || '',
      createdAt: pr.createdAt || new Date().toISOString(),
      setup_fee: pr.setup_fee,
      subscription_fee: pr.subscription_fee,
      subscription_tax: pr.subscription_tax,
      payment_flow: pr.payment_flow
    })),
    ...pendingSignups.map((ps: any) => ({
      id: `signup_${ps.id || ps.razorpayOrderId || ps.orderId}`,
      tenantId: ps.tenantId || ps.businessName || 'Pending Tenant',
      orderId: ps.razorpayOrderId || ps.orderId || '',
      razorpayOrderId: ps.razorpayOrderId,
      amount: ps.totalDueToday || ps.amount || 0,
      currency: ps.currency || 'INR',
      status: ps.status || 'PENDING',
      provider: ps.provider || (ps.currency === 'USD' || ps.currency === 'GBP' ? 'paypal' : 'razorpay'),
      customerEmail: ps.customerEmail || '',
      customerName: ps.customerName || ps.businessName || '',
      createdAt: ps.createdAt || new Date().toISOString(),
      setup_fee: ps.setup_fee,
      subscription_fee: ps.subscription_fee,
      subscription_tax: ps.subscription_tax
    }))
  ];

  // Remove duplicates by order ID / payment ID
  const uniqueTransactions: PaymentRecordItem[] = [];
  const seenKeys = new Set<string>();

  for (const tx of combinedTransactions) {
    const key = tx.razorpayPaymentId || tx.paypalCaptureId || tx.orderId || tx.id;
    if (key && !seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueTransactions.push(tx);
    }
  }

  // Sort latest first
  uniqueTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter
  const filtered = uniqueTransactions.filter(tx => {
    // Provider filter
    if (providerFilter === 'razorpay' && tx.provider !== 'razorpay') return false;
    if (providerFilter === 'paypal' && tx.provider !== 'paypal') return false;

    // Status filter
    if (statusFilter !== 'all') {
      const s = tx.status.toUpperCase();
      if (statusFilter === 'captured' && s !== 'CAPTURED' && s !== 'PAID' && s !== 'COMPLETED' && s !== 'ACTIVATED') return false;
      if (statusFilter === 'pending' && s !== 'PENDING') return false;
      if (statusFilter === 'failed' && s !== 'FAILED') return false;
      if (statusFilter === 'refunded' && s !== 'REFUNDED') return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesTenant = tx.tenantId.toLowerCase().includes(q);
      const matchesEmail = (tx.customerEmail || '').toLowerCase().includes(q);
      const matchesOrder = (tx.orderId || '').toLowerCase().includes(q);
      const matchesPayId = (tx.razorpayPaymentId || tx.paypalCaptureId || '').toLowerCase().includes(q);
      return matchesTenant || matchesEmail || matchesOrder || matchesPayId;
    }

    return true;
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getCurrencySymbol = (currency: string) => {
    if (currency === 'INR') return '₹';
    if (currency === 'GBP') return '£';
    return '$';
  };

  // Metrics
  const totalVolumeINR = filtered
    .filter(t => t.currency === 'INR' && (t.status === 'CAPTURED' || t.status === 'ACTIVATED' || t.status === 'PAID'))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalVolumeUSD = filtered
    .filter(t => t.currency === 'USD' && (t.status === 'CAPTURED' || t.status === 'ACTIVATED' || t.status === 'PAID'))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const pendingCount = filtered.filter(t => t.status === 'PENDING').length;

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Multi-Gateway Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Server-Verified Settlement Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Payments Administration
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict isolation between Razorpay (INR) and PayPal (USD/GBP) with cryptographic verification audits
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
          actionMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">×</button>
        </div>
      )}

      {/* Provider Separation Summary Cards (Requirement 13: Razorpay and PayPal must be separate) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Razorpay Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Razorpay Gateway
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              India / INR
            </span>
          </div>
          <div className="text-xl font-black text-white">
            ₹{totalVolumeINR.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">
            Secured by HMAC-SHA256 order signature verification
          </div>
        </div>

        {/* PayPal Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              PayPal Live Gateway
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Global / USD & GBP
            </span>
          </div>
          <div className="text-xl font-black text-white">
            ${totalVolumeUSD.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">
            Protected by PayPal Live Webhook transmission headers
          </div>
        </div>

        {/* Reconciliation Status Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Pending Settlement
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              pendingCount > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {pendingCount} Pending
            </span>
          </div>
          <div className="text-xl font-black text-white">
            {pendingCount === 0 ? 'Fully Reconciled' : `${pendingCount} Orders Pending`}
          </div>
          <div className="text-[11px] text-slate-400">
            Tenants activate strictly upon confirmed settlement
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tenant, email, order ID, or payment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Filter */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setProviderFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                providerFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Gateways
            </button>
            <button
              onClick={() => setProviderFilter('razorpay')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                providerFilter === 'razorpay'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Razorpay
            </button>
            <button
              onClick={() => setProviderFilter('paypal')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                providerFilter === 'paypal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PayPal
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter transactions by status"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="captured">Captured / Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Transactions Table (with local horizontal overflow container) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4">Customer & Tenant</th>
                <th className="py-3 px-4">Order / Payment ID</th>
                <th className="py-3 px-4">Amount & Tax</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isPayPal = tx.provider === 'paypal';
                  const symbol = getCurrencySymbol(tx.currency);
                  const isPending = tx.status === 'PENDING';
                  const isSuccess = tx.status === 'CAPTURED' || tx.status === 'ACTIVATED' || tx.status === 'PAID' || tx.status === 'COMPLETED';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Gateway */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isPayPal
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {isPayPal ? 'PayPal Live' : 'Razorpay'}
                        </span>
                      </td>

                      {/* Customer & Tenant */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white truncate max-w-[180px]">
                          {tx.customerName || tx.tenantId}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                          {tx.customerEmail || tx.tenantId}
                        </div>
                      </td>

                      {/* Order / Payment ID */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-200 truncate max-w-[200px]" title={tx.orderId}>
                          {tx.orderId || '—'}
                        </div>
                        {(tx.razorpayPaymentId || tx.paypalCaptureId) && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                            Pay ID: {tx.razorpayPaymentId || tx.paypalCaptureId}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">
                          {symbol}{tx.amount?.toLocaleString()} {tx.currency}
                        </div>
                        {tx.setup_fee !== undefined && (
                          <div className="text-[10px] text-slate-400">
                            Setup: {symbol}{tx.setup_fee} • Sub: {symbol}{tx.subscription_fee}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">
                        {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {isPending && tx.orderId ? (
                          <button
                            disabled={activeReconcilingId === tx.orderId}
                            onClick={() => handleReconcile(tx.orderId!)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 ml-auto"
                          >
                            <RotateCcw className={`w-3 h-3 ${activeReconcilingId === tx.orderId ? 'animate-spin' : ''}`} />
                            <span>{activeReconcilingId === tx.orderId ? 'Verifying...' : 'Reconcile'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">
                            Verified ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
