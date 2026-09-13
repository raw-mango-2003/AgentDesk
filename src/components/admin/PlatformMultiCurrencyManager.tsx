import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Coins, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Edit3, 
  TrendingUp, 
  Lock,
  ArrowUpDown
} from 'lucide-react';
import { PlatformCurrencyRecord, PlanPriceRecord, CurrencyCode } from '../../types';

export const PlatformMultiCurrencyManager: React.FC = () => {
  const [currencies, setCurrencies] = useState<PlatformCurrencyRecord[]>([]);
  const [planPrices, setPlanPrices] = useState<PlanPriceRecord[]>([]);
  const [analytics, setAnalytics] = useState<Record<CurrencyCode, {
    currency: CurrencyCode;
    symbol: string;
    totalRevenue: number;
    transactionCount: number;
    activeSubscriptions: number;
  }> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editing state for plan prices: { [priceId]: { setup_fee, monthly_fee } }
  const [editingPrices, setEditingPrices] = useState<Record<string, { setup_fee: number; monthly_fee: number }>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [togglingCurrency, setTogglingCurrency] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [curRes, priceRes, analyticsRes] = await Promise.all([
        fetch('/api/billing/currencies'),
        fetch('/api/billing/plan-prices'),
        fetch('/api/billing/revenue-analytics')
      ]);

      const [curData, priceData, analyticsData] = await Promise.all([
        curRes.json(),
        priceRes.json(),
        analyticsRes.json()
      ]);

      if (curData.success) {
        setCurrencies(curData.currencies || []);
      }
      if (priceData.success) {
        setPlanPrices(priceData.planPrices || []);
        // Initialize editing state
        const initialEdits: Record<string, { setup_fee: number; monthly_fee: number }> = {};
        for (const p of priceData.planPrices || []) {
          initialEdits[p.id] = {
            setup_fee: p.setup_fee,
            monthly_fee: p.monthly_fee
          };
        }
        setEditingPrices(initialEdits);
      }
      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load multi-currency configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCurrency = async (code: CurrencyCode, currentEnabled: boolean) => {
    try {
      setTogglingCurrency(code);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/billing/currencies/${code}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Could not toggle ${code}`);
      }

      setSuccessMsg(`Currency ${code} status updated successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingCurrency(null);
    }
  };

  const handlePriceChange = (priceId: string, field: 'setup_fee' | 'monthly_fee', value: number) => {
    setEditingPrices(prev => ({
      ...prev,
      [priceId]: {
        ...prev[priceId],
        [field]: isNaN(value) ? 0 : value
      }
    }));
  };

  const handleSavePrice = async (priceRecord: PlanPriceRecord) => {
    const edit = editingPrices[priceRecord.id];
    if (!edit) return;

    try {
      setSavingPriceId(priceRecord.id);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch('/api/billing/plan-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: priceRecord.plan_id,
          currency: priceRecord.currency,
          setupFee: edit.setup_fee,
          monthlyFee: edit.monthly_fee,
          active: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update plan pricing.');
      }

      setSuccessMsg(`Updated ${priceRecord.plan_id.toUpperCase()} pricing for ${priceRecord.currency}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPriceId(null);
    }
  };

  const getCurrencySymbol = (code: CurrencyCode) => {
    switch (code) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'GBP': return '£';
      default: return code;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Multi-Currency & Regional Plan Pricing Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure regional currencies, authoritative one-time setup fees, monthly subscriptions, and currency-isolated coupon policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Pricing</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Revenue Analytics Segmented by Currency */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['INR', 'USD', 'GBP'] as CurrencyCode[]).map(curCode => {
            const stat = analytics[curCode];
            const isINR = curCode === 'INR';
            return (
              <div 
                key={curCode} 
                className={`p-5 rounded-2xl border ${
                  isINR 
                    ? 'bg-blue-50/50 border-blue-200' 
                    : 'bg-white border-slate-200'
                } shadow-xs relative overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {curCode === 'INR' ? '🇮🇳' : curCode === 'USD' ? '🇺🇸' : '🇬🇧'}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{curCode} Revenue Ledger</h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {curCode === 'INR' ? 'Domestic Razorpay' : 'Cross-border Corporate'}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isINR ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {curCode}
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500 font-medium">Captured Revenue:</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {stat ? `${stat.symbol}${(stat.totalRevenue || 0).toLocaleString()}` : '0'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span>Transactions Captured:</span>
                    <span className="font-bold text-slate-800">{stat?.transactionCount || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Active Subscriptions:</span>
                    <span className="font-bold text-slate-800">{stat?.activeSubscriptions || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Platform Supported Currencies Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              Supported Platform Currencies
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control which currencies are enabled across checkouts, coupon discounts, and invoices.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Currency</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Country / Region</th>
                <th className="py-2.5 px-3">Supported Providers</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currencies.map(cur => {
                const isINR = cur.code === 'INR';
                return (
                  <tr key={cur.code} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cur.flag}</span>
                        <div>
                          <span className="font-bold text-slate-900">{cur.code}</span>
                          <span className="text-slate-400 text-[11px] ml-1.5">({cur.name})</span>
                          {cur.isDefault && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[9px]">
                              DEFAULT
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-sm">
                      {cur.symbol}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {cur.countryName} ({cur.countryCode})
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {cur.supportedProviders.map(p => (
                          <span key={p} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono capitalize">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        cur.enabled 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {cur.enabled ? <Check className="w-3 h-3" /> : null}
                        <span>{cur.enabled ? 'Enabled' : 'Disabled'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isINR ? (
                        <span className="text-[11px] text-slate-400 italic flex items-center justify-end gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Required (Domestic)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleCurrency(cur.code, cur.enabled)}
                          disabled={togglingCurrency === cur.code}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            cur.enabled 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {togglingCurrency === cur.code ? 'Updating...' : cur.enabled ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Authoritative Plan Pricing Matrix (plan_prices) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Regional Plan Price Overrides (`plan_prices`)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live server database values for One-Time Setup Fees and Monthly Recurring subscriptions per currency.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Plan</th>
                <th className="py-2.5 px-3">Currency</th>
                <th className="py-2.5 px-3">One-Time Setup Fee</th>
                <th className="py-2.5 px-3">Monthly Subscription</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planPrices.map(item => {
                const edit = editingPrices[item.id] || { setup_fee: item.setup_fee, monthly_fee: item.monthly_fee };
                const isSaving = savingPriceId === item.id;
                const sym = getCurrencySymbol(item.currency);
                const hasChanged = edit.setup_fee !== item.setup_fee || edit.monthly_fee !== item.monthly_fee;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 capitalize text-sm">{item.plan_id}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.currency} ({sym})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono font-bold">{sym}</span>
                        <input
                          type="number"
                          min="0"
                          value={edit.setup_fee}
                          onChange={e => handlePriceChange(item.id, 'setup_fee', parseFloat(e.target.value))}
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono font-bold">{sym}</span>
                        <input
                          type="number"
                          min="0"
                          value={edit.monthly_fee}
                          onChange={e => handlePriceChange(item.id, 'monthly_fee', parseFloat(e.target.value))}
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleSavePrice(item)}
                        disabled={isSaving || !hasChanged}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                          hasChanged
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isSaving ? 'Saving...' : 'Update Price'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Currency Isolation & Coupon Rule Explanation Card */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Currency Isolation & Promotional Discount Standards</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          To prevent currency conversion arbitrage:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          <li><strong>Fixed Amount Discounts:</strong> Explicitly tied to a specific currency (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">FLAT5000</code> applies only to INR; <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">SAVE50</code> applies only to USD; <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">UK50</code> applies only to GBP). Orders in differing currencies reject mismatched fixed codes.</li>
          <li><strong>Percentage Discounts:</strong> Relative percentage codes (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">SCALE25</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">WELCOME10</code>) compute dynamically across all currencies based on the plan’s local currency pricing.</li>
          <li><strong>One-Time vs. Recurring:</strong> Discounts designated for <code className="text-slate-800 font-mono">setup</code> affect only the white-glove fee today; discounts designated for <code className="text-slate-800 font-mono">recurring</code> discount the ongoing monthly subscription.</li>
        </ul>
      </div>
    </div>
  );
};
