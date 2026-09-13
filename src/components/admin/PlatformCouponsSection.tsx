import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  X,
  Sliders,
  DollarSign,
  Percent
} from 'lucide-react';
import { safeFetchJson } from '../../lib/dbService';

interface PromoCode {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'fixed_amount';
  discountValue: number;
  currency?: string;
  description?: string;
  expiryDate?: string;
  maxUses?: number;
  usageLimit?: number;
  usedCount?: number;
  usageCount?: number;
  active: boolean;
  appliesTo?: 'all' | 'setup' | 'monthly';
  applicablePlans?: string[];
  createdAt?: string;
}

export const PlatformCouponsSection: React.FC = () => {
  const [coupons, setCoupons] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PromoCode | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [currency, setCurrency] = useState('USD');
  const [appliesTo, setAppliesTo] = useState<'all' | 'setup' | 'monthly'>('all');
  const [maxUses, setMaxUses] = useState<number>(100);
  const [expiryDate, setExpiryDate] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetchJson('/api/billing/promo-codes');
      if (res.success && Array.isArray(res.promoCodes)) {
        setCoupons(res.promoCodes);
      } else {
        setCoupons([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue(15);
    setCurrency('INR');
    setAppliesTo('all');
    setMaxUses(100);
    setExpiryDate('');
    setActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (c: PromoCode) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDescription(c.description || '');
    setDiscountType((c.discountType === 'fixed' || c.discountType === 'fixed_amount') ? 'fixed' : 'percentage');
    setDiscountValue(c.discountValue);
    setCurrency(c.currency || 'INR');
    setAppliesTo(c.appliesTo || 'all');
    setMaxUses(c.usageLimit || c.maxUses || 100);
    setExpiryDate(c.expiryDate ? c.expiryDate.split('T')[0] : '');
    setActive(c.active);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || discountValue <= 0) {
      setError('Please provide a valid coupon code and discount value.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        description,
        discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(discountValue),
        currency: discountType === 'fixed' ? currency : undefined,
        appliesTo,
        usageLimit: Number(maxUses) || 100,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        active
      };

      if (editingCoupon) {
        await safeFetchJson(`/api/billing/promo-codes/${editingCoupon.code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await safeFetchJson('/api/billing/promo-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      await loadCoupons();
    } catch (err: any) {
      setError(err.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: PromoCode) => {
    try {
      await safeFetchJson(`/api/billing/promo-codes/${c.code}/toggle`, { method: 'POST' });
      setCoupons(prev => prev.map(item => item.code === c.code ? { ...item, active: !item.active } : item));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (c: PromoCode) => {
    if (!window.confirm(`Are you sure you want to permanently delete coupon "${c.code}"?`)) return;
    try {
      await safeFetchJson(`/api/billing/promo-codes/${c.code}`, { method: 'DELETE' });
      setCoupons(prev => prev.filter(item => item.code !== c.code));
    } catch (err: any) {
      setError(err.message || 'Failed to delete coupon');
    }
  };

  const filtered = coupons.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-amber-400" />
              Promotion Rules
            </span>
            <span className="text-xs text-slate-400 font-mono">Real-Time Discount Validation Engine</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Coupons & Promo Codes
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure promotional vouchers, percentage discounts, currency-locked deductions, and usage quotas
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadCoupons}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
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

      {/* Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coupon code or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          {filtered.length} coupons registered
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Redemptions</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No promo codes found. Click "+ Create Coupon" to generate one.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-black text-sm text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {c.discountType === 'percentage' ? (
                        <span className="text-emerald-400">{c.discountValue}% OFF</span>
                      ) : (
                        <span className="text-blue-400">
                          {c.currency === 'INR' ? '₹' : (c.currency === 'GBP' ? '£' : '$')}
                          {Number(c.discountValue).toLocaleString()} OFF ({c.currency || 'USD'})
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 font-normal">
                        {c.appliesTo === 'setup' ? 'Setup Fee Only' : (c.appliesTo === 'monthly' ? 'Subscription Only' : 'Entire Order')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {c.description || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {c.usageCount ?? c.usedCount ?? 0} / {c.usageLimit ?? c.maxUses ?? '∞'}
                      </div>
                      <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (((c.usageCount ?? c.usedCount ?? 0) / (c.usageLimit ?? c.maxUses ?? 100)) * 100)
                            )}%`
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono text-slate-400">
                      {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          c.active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit coupon"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          title="Delete coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-purple-400" />
                {editingCoupon ? 'Edit Coupon Code' : 'Create New Coupon'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME2025"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-hidden focus:border-purple-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional internal note or customer banner"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Currency)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={discountType === 'percentage' ? 100 : 1000000}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Applies To</label>
                  <select
                    value={appliesTo}
                    onChange={(e) => setAppliesTo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  >
                    <option value="all">Entire Order (Setup + 1st Month)</option>
                    <option value="setup">Setup & Implementation Fee Only</option>
                    <option value="monthly">First Month Subscription Only</option>
                  </select>
                </div>

                {discountType === 'fixed' ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Max Redemptions</label>
                    <input
                      type="number"
                      min="1"
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {discountType === 'fixed' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="coupon_active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="coupon_active" className="text-xs font-medium text-slate-300 cursor-pointer">
                  Activate coupon immediately for checkout
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
