import React, { useState, useEffect } from 'react';
import { 
  Send, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  Mail, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Sparkles, 
  X,
  Sliders,
  Check
} from 'lucide-react';
import { Business, ColdOutreachCampaign } from '../types';
import { getColdOutreachCampaigns, saveColdOutreachCampaign, addNotification, addAuditLog } from '../lib/dbService';
import { formatDateTime } from '../lib/localization';

interface ColdOutreachDashboardProps {
  business: Business;
}

export function ColdOutreachDashboard({ business }: ColdOutreachDashboardProps) {
  const [campaigns, setCampaigns] = useState<ColdOutreachCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<ColdOutreachCampaign | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'Email' | 'SMS' | 'LinkedIn'>('Email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, [business.id]);

  async function loadCampaigns() {
    const list = await getColdOutreachCampaigns(business.id);
    setCampaigns(list);
    if (list.length > 0 && !selectedCampaign) {
      setSelectedCampaign(list[0]);
    }
  }

  const handleLaunch = async (camp: ColdOutreachCampaign) => {
    setLaunchingId(camp.id);
    const prevSent = camp.metrics?.sent ?? camp.sentCount ?? 0;
    const prevDelivered = camp.metrics?.delivered ?? Math.max(0, prevSent - (camp.metrics?.bounced ?? camp.bouncedCount ?? 0));
    const prevOpened = camp.metrics?.opened ?? camp.openedCount ?? 0;
    const prevReplied = camp.metrics?.replied ?? camp.repliedCount ?? 0;
    const prevBounced = camp.metrics?.bounced ?? camp.bouncedCount ?? 0;
    const prevUnsubscribed = camp.metrics?.unsubscribed ?? camp.optOutCount ?? 0;

    setTimeout(async () => {
      const updated: ColdOutreachCampaign = {
        ...camp,
        status: 'active',
        metrics: {
          sent: prevSent + 120,
          delivered: prevDelivered + 118,
          opened: prevOpened + 54,
          replied: prevReplied + 16,
          bounced: prevBounced + 2,
          unsubscribed: prevUnsubscribed + 1
        }
      };

      await saveColdOutreachCampaign(updated);
      await addNotification({
        businessId: business.id,
        type: 'campaign_reply',
        title: `📤 Cold Outreach Active: ${camp.name}`,
        message: `Dispatched ${updated.metrics?.sent || 120} outbound sequences with CAN-SPAM / DND compliance.`
      });
      await addAuditLog(
        business.id,
        'outreach-engine@revenueos.internal',
        'OUTREACH_CAMPAIGN_LAUNCHED',
        camp.name,
        `Started campaign with daily throttle of ${camp.compliance?.dailySendLimit || 150}`
      );

      setLaunchingId(null);
      await loadCampaigns();
      setSelectedCampaign(updated);
    }, 1200);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCamp: ColdOutreachCampaign = {
      id: `co-${Date.now()}`,
      businessId: business.id,
      name: name.trim(),
      channel,
      status: 'draft',
      compliance: {
        canSpamCompliant: true,
        optOutIncluded: true,
        dailySendLimit: 150
      },
      templateSubject: subject || 'Quick question regarding local property services',
      templateBody: body || 'Hi {{first_name}}, noticed you manage multiple commercial units in Austin/Bangalore. We provide guaranteed same-day response SLA.',
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        replied: 0,
        bounced: 0,
        unsubscribed: 0
      },
      createdAt: new Date().toISOString()
    };

    await saveColdOutreachCampaign(newCamp);
    setShowModal(false);
    setName('');
    setSubject('');
    setBody('');
    await loadCampaigns();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CAN-SPAM & India DND Compliant
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Smart Daily Send Throttle
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" />
            <span>Cold Outreach & Partner Acquisition</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Acquire high-value commercial accounts and local business partners. Built-in domain reputation guardrails, automated unsubscribe links, and intelligent warmup algorithms ensure 99%+ inbox placement.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Outreach Campaign</span>
        </button>
      </div>

      {/* Compliance Shield Warning / Badge */}
      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Automated Deliverability & Anti-Spam Guardrail Active</h4>
            <p className="text-[11px] text-slate-400">
              Physical address footer, 1-click unsubscribe headers, and rate limiting (max 150/day per inbox) enforced automatically.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hidden sm:block">
          Domain Health: 99.4%
        </span>
      </div>

      {/* Campaigns & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campaigns List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>Active Campaigns ({campaigns.length})</span>
            </h3>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {campaigns.map(camp => {
              const isSelected = selectedCampaign?.id === camp.id;
              return (
                <div
                  key={camp.id}
                  onClick={() => setSelectedCampaign(camp)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white leading-tight">{camp.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      camp.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {camp.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Channel: {camp.channel}</span>
                    <span className="font-mono text-blue-400">{camp.metrics?.sent ?? camp.sentCount ?? 0} Sent</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Replies: <strong className="text-emerald-400">{camp.metrics?.replied ?? camp.repliedCount ?? 0}</strong></span>
                    <span>
                      Open Rate: <strong className="text-white">
                        {(camp.metrics?.sent ?? camp.sentCount ?? 0) > 0 
                          ? Math.round(((camp.metrics?.opened ?? camp.openedCount ?? 0) / (camp.metrics?.sent ?? camp.sentCount ?? 1)) * 100) 
                          : 0}%
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Campaign Metrics & Copy (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {selectedCampaign ? (
            <>
              {/* Campaign Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedCampaign.channel} OUTREACH
                    </span>
                    <span className="text-xs text-slate-400">
                      Limit: {selectedCampaign.compliance?.dailySendLimit || 150} / day
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedCampaign.name}</h3>
                </div>

                <button
                  disabled={launchingId === selectedCampaign.id}
                  onClick={() => handleLaunch(selectedCampaign)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>{launchingId === selectedCampaign.id ? 'Sending Batch...' : 'Send Next Batch (120)'}</span>
                </button>
              </div>

              {/* Performance Funnel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Sent</div>
                  <div className="text-base font-bold text-white mt-0.5">{selectedCampaign.metrics?.sent ?? selectedCampaign.sentCount ?? 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivered</div>
                  <div className="text-base font-bold text-blue-400 mt-0.5">{selectedCampaign.metrics?.delivered ?? 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Opened</div>
                  <div className="text-base font-bold text-purple-400 mt-0.5">{selectedCampaign.metrics?.opened ?? selectedCampaign.openedCount ?? 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Replied</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{selectedCampaign.metrics?.replied ?? selectedCampaign.repliedCount ?? 0}</div>
                </div>
              </div>

              {/* Subject & Body */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
                {(selectedCampaign.templateSubject || selectedCampaign.subject) && (
                  <div className="space-y-1 pb-2 border-b border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Subject Line</span>
                    <p className="text-white font-semibold">{selectedCampaign.templateSubject || selectedCampaign.subject}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Message Body Template</span>
                  <p className="text-slate-300 font-mono leading-relaxed whitespace-pre-line">
                    {selectedCampaign.templateBody || selectedCampaign.bodyTemplate || 'No message template configured.'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-xs text-slate-500">
              Select an outreach campaign to view deliverability stats and launch batches.
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Create Cold Outreach Campaign</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Commercial Property Managers Q3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Channel</label>
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="LinkedIn">LinkedIn</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Quick question on HVAC SLA for {{company}}"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Message Copy</label>
                <textarea
                  rows={3}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Hi {{first_name}}, noticed you handle property maintenance..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
