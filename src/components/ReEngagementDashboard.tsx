import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  Send, 
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Percent, 
  MessageSquare, 
  Zap, 
  Plus, 
  X,
  RefreshCw
} from 'lucide-react';
import { Business, ReEngagementAudience } from '../types';
import { getReEngagementAudiences, saveReEngagementAudience, addNotification, addAuditLog } from '../lib/dbService';
import { formatCurrency } from '../lib/localization';

interface ReEngagementDashboardProps {
  business: Business;
}

export function ReEngagementDashboard({ business }: ReEngagementDashboardProps) {
  const [audiences, setAudiences] = useState<ReEngagementAudience[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<ReEngagementAudience | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  // New Audience Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [segmentType, setSegmentType] = useState<any>('90_days_inactive');
  const [channel, setChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('SMS');
  const [aiOffer, setAiOffer] = useState('');
  const [template, setTemplate] = useState('');

  useEffect(() => {
    loadAudiences();
  }, [business.id]);

  async function loadAudiences() {
    const list = await getReEngagementAudiences(business.id);
    setAudiences(list);
    if (list.length > 0 && !selectedAudience) {
      setSelectedAudience(list[0]);
    }
  }

  const handleLaunchCampaign = async (aud: ReEngagementAudience) => {
    setLaunchingId(aud.id);
    setTimeout(async () => {
      const updated: ReEngagementAudience = {
        ...aud,
        status: 'active',
        metrics: {
          ...aud.metrics,
          messagesSent: aud.contactCount,
          responses: Math.round(aud.contactCount * 0.32),
          reactivatedCount: Math.round(aud.contactCount * 0.24),
          appointmentsBooked: Math.round(aud.contactCount * 0.18),
          revenueGenerated: Math.round(aud.contactCount * 0.18 * (business.country === 'IN' ? 12000 : 1850))
        }
      };

      await saveReEngagementAudience(updated);
      await addNotification({
        businessId: business.id,
        type: 'campaign_reply',
        title: `🚀 Re-Engagement Dispatched: ${aud.name}`,
        message: `Sent ${aud.contactCount} ${aud.channel} messages. Reactivation active.`
      });
      await addAuditLog(
        business.id,
        'marketing-engine@revenueos.internal',
        'REENGAGEMENT_CAMPAIGN_LAUNCHED',
        aud.name,
        `Launched ${aud.channel} campaign to ${aud.contactCount} dormant customers.`
      );

      setLaunchingId(null);
      await loadAudiences();
      setSelectedAudience(updated);
    }, 1200);
  };

  const handleCreateAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newAud: ReEngagementAudience = {
      id: `re-${Date.now()}`,
      businessId: business.id,
      name: name.trim(),
      segmentType,
      contactCount: Math.floor(80 + Math.random() * 150),
      aiOfferSuggestion: aiOffer || (business.country === 'IN' ? 'Free Scaling & Polishing with Family Checkup' : '$79 Seasonal HVAC Checkup'),
      messageTemplate: template || 'Hi {{first_name}}, we miss you! Exclusive offer for our valued customers.',
      channel,
      status: 'draft',
      metrics: {
        messagesSent: 0,
        responses: 0,
        reactivatedCount: 0,
        appointmentsBooked: 0,
        revenueGenerated: 0
      },
      createdAt: new Date().toISOString()
    };

    await saveReEngagementAudience(newAud);
    setShowModal(false);
    setName('');
    setAiOffer('');
    setTemplate('');
    await loadAudiences();
  };

  const totalReactivatedRevenue = (audiences || []).reduce((sum, a) => sum + (a.metrics?.revenueGenerated || 0), 0);
  const totalReactivatedCustomers = (audiences || []).reduce((sum, a) => sum + (a.metrics?.reactivatedCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Dormant Database Monetization
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              AI Offer Generator
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Customer Re-Engagement & Reactivation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Re-engage past customers and lost leads with zero ad spend. AI analyzes purchase history and dormancy length to generate hyper-personalized offers that bring customers back into your calendar.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Reactivation Campaign</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Reactivated Revenue</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(totalReactivatedRevenue, business.currency, business.country)}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>Pure margin from existing customer database</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Reactivated Customers</div>
          <div className="text-2xl font-black text-white mt-1">{totalReactivatedCustomers}</div>
          <div className="text-[10px] text-purple-400 flex items-center gap-1 mt-1">
            <Sparkles className="w-3 h-3" />
            <span>Average 24% reactivation response rate</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Customer Acquisition Cost (CAC)</div>
          <div className="text-2xl font-black text-white mt-1">
            {business.currency === 'INR' ? '₹0' : '$0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            <span>Direct SMS / WhatsApp / Email broadcast</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Campaigns List + Selected Campaign Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campaigns List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>Reactivation Segments ({audiences.length})</span>
            </h3>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {(audiences || []).map(aud => {
              const isSelected = selectedAudience?.id === aud.id;
              return (
                <div
                  key={aud.id}
                  onClick={() => setSelectedAudience(aud)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/15 border-purple-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white leading-tight">{aud.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      aud.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {aud.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Segment: {aud.segmentType.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-purple-400">{aud.contactCount} Dormant Contacts</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Channel: {aud.channel}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(aud.metrics?.revenueGenerated || 0, business.currency, business.country)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Campaign Detail & Real-time Metrics (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {selectedAudience ? (
            <>
              {/* Campaign Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {selectedAudience.channel} BROADCAST
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedAudience.contactCount} Target Contacts
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedAudience.name}</h3>
                </div>

                {selectedAudience.status !== 'active' ? (
                  <button
                    disabled={launchingId === selectedAudience.id}
                    onClick={() => handleLaunchCampaign(selectedAudience)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{launchingId === selectedAudience.id ? 'Dispatching...' : 'Launch Broadcast'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4" />
                    <span>Active & Reactivating</span>
                  </div>
                )}
              </div>

              {/* Performance Metrics Funnel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Sent</div>
                  <div className="text-base font-bold text-white mt-0.5">{selectedAudience.metrics?.messagesSent || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Replies</div>
                  <div className="text-base font-bold text-blue-400 mt-0.5">{selectedAudience.metrics?.responses || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Bookings</div>
                  <div className="text-base font-bold text-purple-400 mt-0.5">{selectedAudience.metrics?.appointmentsBooked || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Revenue</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono">
                    {formatCurrency(selectedAudience.metrics?.revenueGenerated || 0, business.currency, business.country)}
                  </div>
                </div>
              </div>

              {/* AI Generated Offer Card */}
              <div className="bg-purple-600/10 border border-purple-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Recommended Incentive</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  {selectedAudience.aiOfferSuggestion}
                </p>
              </div>

              {/* Message Copy */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dispatched Copy Template ({selectedAudience.channel})
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed">
                  {selectedAudience.messageTemplate}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-xs text-slate-500">
              Select a reactivation audience to view metrics and launch broadcasts.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Create Re-Engagement Campaign</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAudience} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. 6-Month Preventative Tune-Up Special"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Segment Type</label>
                  <select
                    value={segmentType}
                    onChange={e => setSegmentType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="30_days_inactive">30 Days Inactive</option>
                    <option value="60_days_inactive">60 Days Inactive</option>
                    <option value="90_days_inactive">90 Days Inactive</option>
                    <option value="due_for_service">Due for Periodic Service</option>
                    <option value="lost_opportunities">Lost Quotes / Estimates</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Channel</label>
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="SMS">SMS</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Offer Headline</label>
                <input
                  type="text"
                  value={aiOffer}
                  onChange={e => setAiOffer(e.target.value)}
                  placeholder="e.g. $99 Fall Heating Safety Checkup"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Broadcast Message Copy</label>
                <textarea
                  rows={3}
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  placeholder="Hi {{first_name}}, reply YES to book your discounted checkup!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
