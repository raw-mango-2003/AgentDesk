import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Send, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Trash2, 
  Sparkles, 
  Eye, 
  Check, 
  TrendingUp, 
  Share2, 
  AlertCircle,
  X
} from 'lucide-react';
import { Business, Estimate, EstimateItem, EstimateStatus } from '../types';
import { getEstimates, saveEstimate, addNotification, addAuditLog } from '../lib/dbService';
import { formatCurrency, formatDateTime, formatPhoneNumber } from '../lib/localization';

interface EstimatesDashboardProps {
  business: Business;
}

export function EstimatesDashboard({ business }: EstimatesDashboardProps) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showModal, setShowModal] = useState(false);

  // New Estimate Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [items, setItems] = useState<EstimateItem[]>([
    { id: '1', description: business.country === 'IN' ? 'Single-Sitting Rotary Root Canal' : 'Seasonal Heat Pump Replacement', quantity: 1, rate: business.country === 'IN' ? 6500 : 8900, total: business.country === 'IN' ? 6500 : 8900 }
  ]);

  useEffect(() => {
    loadEstimates();
  }, [business.id]);

  async function loadEstimates() {
    const list = await getEstimates(business.id);
    setEstimates(list);
    if (list.length > 0 && !selectedEstimate) {
      setSelectedEstimate(list[0]);
    }
  }

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: String(Date.now()),
        description: '',
        quantity: 1,
        rate: 500,
        total: 500
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof EstimateItem, val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      if (field === 'quantity' || field === 'rate') {
        updated.total = Number(updated.quantity) * Number(updated.rate);
      }
      return updated;
    }));
  };

  const calculatedTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;

    const newEst: Estimate = {
      id: `est-${Date.now()}`,
      businessId: business.id,
      estimateNumber: `EST-${Math.floor(1000 + Math.random() * 9000)}`,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim() || `${contactName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      contactPhone: contactPhone.trim() || (business.country === 'IN' ? '+91 98450 00000' : '+1 (512) 555-0199'),
      amount: calculatedTotal,
      currency: business.currency,
      items,
      dateSent: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'sent',
      nextFollowUpDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      salesOwner: business.agentSettings.agentName,
      followUpStep: 0,
      aiFollowUpDraft: `Hi ${contactName}, following up on your formal quote from ${business.name}. Let us know if you have any questions before work begins!`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveEstimate(newEst);
    await addNotification({
      businessId: business.id,
      type: 'estimate_followup',
      title: `📄 Estimate Created: ${newEst.estimateNumber}`,
      message: `Sent ${formatCurrency(newEst.amount, business.currency, business.country)} quote to ${newEst.contactName}.`
    });
    await addAuditLog(
      business.id,
      'sales-rep@revenueos.internal',
      'ESTIMATE_CREATED',
      newEst.estimateNumber,
      `Generated quote for ${newEst.contactName} (${newEst.amount})`
    );

    setShowModal(false);
    setContactName('');
    await loadEstimates();
    setSelectedEstimate(newEst);
  };

  const handleStatusChange = async (est: Estimate, newStatus: EstimateStatus) => {
    const updated: Estimate = { ...est, status: newStatus, updatedAt: new Date().toISOString() };
    await saveEstimate(updated);
    await loadEstimates();
    setSelectedEstimate(updated);
  };

  const totalOutstandingValue = estimates
    .filter(e => e.status !== 'accepted' && e.status !== 'rejected')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAcceptedValue = estimates
    .filter(e => e.status === 'accepted')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Automated Deal Acceleration
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              AI Follow-Up Engine
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Estimates & Quote Follow-Up</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Never let a proposal go cold. Generate professional digital quotes and automatically dispatch scheduled follow-up sequences across SMS, WhatsApp, and Email until the client approves.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Estimate</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Outstanding Proposals</div>
          <div className="text-2xl font-black text-white mt-1">
            {formatCurrency(totalOutstandingValue, business.currency, business.country)}
          </div>
          <div className="text-[10px] text-blue-400 mt-1">
            {estimates.filter(e => e.status === 'follow_up_due' || e.status === 'viewed').length} quotes currently awaiting follow-up
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Accepted Quotes Value</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(totalAcceptedValue, business.currency, business.country)}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>Closed & converting into active revenue</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Win Rate on Follow-Ups</div>
          <div className="text-2xl font-black text-purple-400 mt-1">68%</div>
          <div className="text-[10px] text-slate-400 mt-1">
            Compared to 31% industry average without automation
          </div>
        </div>
      </div>

      {/* Main Grid: Estimates List + Detailed Quote Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Quotes & Proposals ({estimates.length})</span>
            </h3>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {estimates.map(est => {
              const isSelected = selectedEstimate?.id === est.id;
              return (
                <div
                  key={est.id}
                  onClick={() => setSelectedEstimate(est)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{est.estimateNumber}</span>
                      <span className="text-[11px] text-slate-400">• {est.contactName}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      {formatCurrency(est.amount, business.currency, business.country)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Sent: {formatDateTime(est.dateSent, business.timezone, business.country)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      est.status === 'accepted'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : est.status === 'follow_up_due'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {est.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500">
                    Follow-Up Cadence: Step {est.followUpStep} of 4
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Estimate Document Viewer & Actions (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {selectedEstimate ? (
            <>
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-blue-400">{selectedEstimate.estimateNumber}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      selectedEstimate.status === 'accepted'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {selectedEstimate.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedEstimate.contactName}</h3>
                  <p className="text-xs text-slate-400">{selectedEstimate.contactEmail} • {formatPhoneNumber(selectedEstimate.contactPhone, business.country)}</p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">
                    {formatCurrency(selectedEstimate.amount, business.currency, business.country)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Line Items & Scope of Work
                </div>
                <div className="space-y-2">
                  {selectedEstimate.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80 last:border-0">
                      <div>
                        <div className="font-semibold text-white">{item.description}</div>
                        <div className="text-[10px] text-slate-400">Qty: {item.quantity} × {formatCurrency(item.rate, business.currency, business.country)}</div>
                      </div>
                      <div className="font-mono font-bold text-slate-200">
                        {formatCurrency(item.total, business.currency, business.country)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Follow-Up Automation Box */}
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>AI Automated Follow-Up Cadence</span>
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono">Step {selectedEstimate.followUpStep} Active</span>
                </div>
                <p className="text-xs text-slate-200 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  "{selectedEstimate.aiFollowUpDraft || 'Automated follow-up message queued.'}"
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedEstimate, 'accepted')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Accepted</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedEstimate, 'negotiating')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    Negotiating
                  </button>
                </div>

                <button
                  onClick={() => alert(`Estimate link shared to ${selectedEstimate.contactName} via ${business.country === 'IN' ? 'WhatsApp' : 'SMS'}.`)}
                  className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Resend Link</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-xs text-slate-500">
              Select an estimate from the left to view document details.
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Create New Estimate</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEstimate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder={business.country === 'IN' ? '+91 98450 00000' : '+1 (512) 555-0199'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="col-span-6">
                      <input
                        type="text"
                        placeholder="Description..."
                        value={item.description}
                        onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={e => handleUpdateItem(item.id, 'rate', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="text-right pt-2 font-mono font-bold text-emerald-400 text-sm">
                  Total: {formatCurrency(calculatedTotal, business.currency, business.country)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save & Dispatch Estimate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
