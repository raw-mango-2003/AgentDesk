import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Eye,
  Download,
  X,
  Building2,
  DollarSign
} from 'lucide-react';
import { safeFetchJson } from '../../lib/dbService';

interface InvoiceItem {
  id: string;
  businessId?: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'DUE' | 'PENDING' | 'REFUNDED' | 'DRAFT' | string;
  dueDate?: string;
  paidAt?: string;
  createdAt?: string;
  invoiceUrl?: string;
  provider?: string;
  lineItems?: Array<{ description: string; amount: number; quantity?: number }>;
}

export const PlatformInvoicesSection: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetchJson('/api/billing/admin/invoices');
      if (res.success && Array.isArray(res.invoices)) {
        setInvoices(res.invoices);
      } else {
        setInvoices([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const getCurrencySymbol = (curr: string) => {
    if (curr === 'INR') return '₹';
    if (curr === 'GBP') return '£';
    return '$';
  };

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status.toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesId = inv.id.toLowerCase().includes(q);
      const matchesBiz = (inv.businessId || '').toLowerCase().includes(q);
      const matchesCust = (inv.customerName || '').toLowerCase().includes(q);
      const matchesEmail = (inv.customerEmail || '').toLowerCase().includes(q);
      return matchesId || matchesBiz || matchesCust || matchesEmail;
    }
    return true;
  });

  const totalPaidVolume = invoices
    .filter(i => i.status === 'PAID')
    .reduce((acc, i) => acc + (i.currency === 'USD' ? i.amount : 0), 0);

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Invoicing Hub
            </span>
            <span className="text-xs text-slate-400 font-mono">Multi-Tenant Invoice Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Customer Invoices
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit customer invoices, payment receipts, statutory tax breakdowns, and automated billing records
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadInvoices}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:opacity-75">×</button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice ID, tenant, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="due">Due / Pending</option>
            <option value="draft">Draft</option>
            <option value="refunded">Refunded</option>
          </select>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {filtered.length} Invoices
          </span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Tenant / Customer</th>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No invoices recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const symbol = getCurrencySymbol(inv.currency);
                  const isPaid = inv.status.toUpperCase() === 'PAID';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {inv.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white truncate max-w-[200px]">
                          {inv.customerName || inv.businessId}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                          {inv.customerEmail || inv.businessId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {inv.provider ? inv.provider.toUpperCase() : 'SYSTEM'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white text-sm">
                        {symbol}{inv.amount?.toLocaleString()} {inv.currency}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono text-slate-400">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Invoice Details</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400">INVOICE NUMBER</div>
                  <div className="font-mono text-base font-black text-white">{selectedInvoice.id}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedInvoice.status.toUpperCase() === 'PAID'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {selectedInvoice.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block">Customer:</span>
                  <span className="font-bold text-white">{selectedInvoice.customerName || selectedInvoice.businessId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Email:</span>
                  <span className="font-mono text-slate-200">{selectedInvoice.customerEmail || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Method:</span>
                  <span className="font-semibold text-purple-300 uppercase">{selectedInvoice.provider || 'Gateway'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date Issued:</span>
                  <span className="font-mono text-slate-200">
                    {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Items</div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                {(selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0) ? (
                  selectedInvoice.lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200">{item.description}</span>
                      <span className="font-bold text-white">
                        {getCurrencySymbol(selectedInvoice.currency)}{item.amount}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200">SaaS Plan Subscription & Services</span>
                    <span className="font-bold text-white">
                      {getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.amount}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-white">
                  <span>Total Amount</span>
                  <span className="text-emerald-400">
                    {getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.amount} {selectedInvoice.currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
