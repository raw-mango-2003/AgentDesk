import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building, 
  Kanban, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Tag, 
  TrendingUp,
  FileText,
  UserCheck,
  Building2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Business, Contact, Company, Deal, DealStage } from '../types';
import { getContacts, saveContact, getDeals, saveDeal, addAuditLog } from '../lib/dbService';
import { formatCurrency, formatPhoneNumber, formatDateTime } from '../lib/localization';

interface CRMDashboardProps {
  business: Business;
}

const STAGES: Array<{ key: DealStage; label: string; color: string }> = [
  { key: 'lead_in', label: 'Lead In', color: 'border-white/[0.10] bg-white/[0.05]/40 text-slate-400' },
  { key: 'contacted', label: 'Contacted', color: 'border-pink-400/20 bg-pink-400/[0.07] text-pink-300' },
  { key: 'appointment_scheduled', label: 'Appointment / Demo', color: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  { key: 'proposal_sent', label: 'Estimate / Proposal', color: 'border-violet-400/20 bg-violet-400/[0.07] text-violet-300' },
  { key: 'negotiation', label: 'Negotiation', color: 'border-fuchsia-400/20 bg-fuchsia-400/[0.05] text-fuchsia-300' },
  { key: 'won', label: 'Closed Won', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  { key: 'lost', label: 'Closed Lost', color: 'border-rose-500/30 bg-rose-500/10 text-rose-300' }
];

export function CRMDashboard({ business }: CRMDashboardProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'deals'>('deals');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [newDealTitle, setNewDealTitle] = useState('');
  const [newDealContact, setNewDealContact] = useState('');
  const [newDealValue, setNewDealValue] = useState(business.country === 'IN' ? '45000' : '4500');
  const [newDealStage, setNewDealStage] = useState<DealStage>('lead_in');

  useEffect(() => {
    loadData();
  }, [business.id]);

  async function loadData() {
    const [cList, dList] = await Promise.all([
      getContacts(business.id),
      getDeals(business.id)
    ]);
    setContacts(cList);
    setDeals(dList);
    if (cList.length > 0 && !selectedContact) {
      setSelectedContact(cList[0]);
    }
  }

  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const updated = { ...deal, stage: newStage, updatedAt: new Date().toISOString() };
    await saveDeal(updated);
    await addAuditLog(
      business.id,
      'sales-rep@revenueos.internal',
      'DEAL_STAGE_CHANGED',
      deal.title,
      `Moved deal to stage: ${newStage.replace(/_/g, ' ')}`
    );
    await loadData();
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealTitle.trim() || !newDealContact.trim()) return;

    const val = parseFloat(newDealValue) || 1000;
    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      businessId: business.id,
      title: newDealTitle.trim(),
      contactName: newDealContact.trim(),
      value: val,
      stage: newDealStage,
      probability: newDealStage === 'won' ? 100 : newDealStage === 'proposal_sent' ? 70 : 40,
      expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveDeal(newDeal);
    setShowAddDealModal(false);
    setNewDealTitle('');
    setNewDealContact('');
    await loadData();
  };

  const totalPipelineValue = deals
    .filter(d => d.stage !== 'lost')
    .reduce((sum, d) => sum + d.value, 0);

  const totalWonValue = deals
    .filter(d => d.stage === 'won')
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="bg-[#101014] border border-white/[0.07] rounded-xl p-6 shadow-[0_24px_65px_rgba(0,0,0,.2)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-400/[0.06] text-violet-300 border border-violet-400/15">
              CUSTOMER INTELLIGENCE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-400/[0.06] text-pink-300 border border-pink-400/15">
              {business.name} Pipeline
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-300" />
            <span>CRM & Deals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Your pipeline, customer relationships and next steps, brought into one focused workspace.
          </p>
        </div>

        {/* View Switcher & Action */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.07] flex items-center gap-1">
            <button
              onClick={() => setActiveTab('deals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'deals' ? 'bg-pink-500 text-white shadow-[0_12px_30px_rgba(0,0,0,.18)]' : 'text-slate-500 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'contacts' ? 'bg-pink-500 text-white shadow-[0_12px_30px_rgba(0,0,0,.18)]' : 'text-slate-500 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contacts ({contacts.length})</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddDealModal(true)}
            className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Deal</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#101014] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">OPEN PIPELINE VALUE</div>
          <div className="text-2xl font-black text-white mt-1">
            {formatCurrency(totalPipelineValue, business.currency, business.country)}
          </div>
          <div className="text-[10px] text-pink-300 mt-1">
            Across {deals.filter(d => d.stage !== 'lost').length} active deals in progress
          </div>
        </div>

        <div className="bg-[#101014] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">WON REVENUE</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(totalWonValue, business.currency, business.country)}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Fully realized revenue</span>
          </div>
        </div>

        <div className="bg-[#101014] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">CUSTOMER DIRECTORY</div>
          <div className="text-2xl font-black text-white mt-1">{contacts.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {contacts.filter(c => c.status === 'customer').length} active paying customers
          </div>
        </div>
      </div>

      {/* SALES PIPELINE */}
      {activeTab === 'deals' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1200px]">
            {STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.key);
              const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

              return (
                <div
                  key={stage.key}
                  className="flex-1 bg-[#101014] border border-white/[0.07] rounded-xl p-4 flex flex-col min-h-[560px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] mb-3">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${stage.color}`}>
                        {stage.label}
                      </span>
                      <div className="text-xs font-bold text-white mt-1.5 font-mono">
                        {formatCurrency(stageValue, business.currency, business.country)}
                      </div>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-xs font-bold text-slate-400">
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Deals Cards in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {stageDeals.map(deal => (
                      <div
                        key={deal.id}
                        className="bg-[#0a0a0d] p-4 rounded-xl border border-white/[0.07] hover:border-white/[0.10] transition-all shadow-[0_12px_30px_rgba(0,0,0,.18)] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white leading-snug">{deal.title}</h4>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold whitespace-nowrap">
                            {formatCurrency(deal.value, business.currency, business.country)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Users className="w-3 h-3 text-pink-300" />
                          <span>{deal.contactName}</span>
                        </div>

                        {deal.companyName && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Building2 className="w-3 h-3" />
                            <span>{deal.companyName}</span>
                          </div>
                        )}

                        {/* Move Stage Quick Switcher */}
                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Stage:</span>
                          <select
                            value={deal.stage}
                            onChange={e => handleStageChange(deal.id, e.target.value as DealStage)}
                            className="bg-[#101014] border border-white/[0.10] rounded-lg px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:border-pink-400/40 cursor-pointer"
                          >
                            {STAGES.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}

                    {stageDeals.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-white/[0.07] rounded-xl flex items-center justify-center text-[11px] text-slate-600">
                        Nothing in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTACT INTELLIGENCE */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Contacts List (5 cols) */}
          <div className="lg:col-span-5 bg-[#101014] border border-white/[0.07] rounded-xl p-5 shadow-[0_24px_65px_rgba(0,0,0,.2)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-300" />
                <span>Contact Records ({contacts.length})</span>
              </h3>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full bg-[#0a0a0d] border border-white/[0.07] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-pink-400/40"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {contacts
                .filter(c => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    c.email.toLowerCase().includes(q) ||
                    c.phone.includes(q) ||
                    (c.company && c.company.toLowerCase().includes(q))
                  );
                })
                .map(contact => {
                  const isSelected = selectedContact?.id === contact.id;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-pink-400/[0.08] border-pink-400/30 shadow-[0_12px_30px_rgba(0,0,0,.18)]'
                          : 'bg-black/20 border-white/[0.06] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{contact.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          contact.status === 'customer'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-pink-400/[0.08] text-pink-300 border border-pink-400/20'
                        }`}>
                          {contact.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mb-2">
                        {contact.company || contact.email}
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">{formatPhoneNumber(contact.phone, business.country)}</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {formatCurrency(contact.totalRevenue, business.currency, business.country)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Contact 360° Profile & Timeline (7 cols) */}
          <div className="lg:col-span-7 bg-[#101014] border border-white/[0.07] rounded-xl p-6 shadow-[0_24px_65px_rgba(0,0,0,.2)] space-y-6">
            {selectedContact ? (
              <>
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-pink-400/[0.08] border border-pink-400/20 flex items-center justify-center text-pink-300 font-black text-lg">
                      {selectedContact.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{selectedContact.name}</h3>
                      <p className="text-xs text-slate-500">{selectedContact.company || 'Individual Client'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Revenue</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      {formatCurrency(selectedContact.totalRevenue, business.currency, business.country)}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0a0a0d] p-4 rounded-xl border border-white/[0.07] text-xs">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Email</div>
                    <div className="text-slate-300">{selectedContact.email}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Phone</div>
                    <div className="text-slate-300">{formatPhoneNumber(selectedContact.phone, business.country)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Preferred Channel</div>
                    <div className="text-pink-300 font-semibold">{selectedContact.preferredChannel}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Address</div>
                    <div className="text-slate-400">{selectedContact.address || 'Austin / Bangalore Metro'}</div>
                  </div>
                </div>

                {/* Tags */}
                {selectedContact.tags && selectedContact.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedContact.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/[0.05] text-slate-400 border border-white/[0.10] flex items-center gap-1"
                      >
                        <Tag className="w-2.5 h-2.5 text-pink-300" />
                        <span>{t}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* 360-Degree Activity Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Customer activity timeline ({selectedContact.timeline?.length || 0})</span>
                  </h4>

                  <div className="space-y-3 max-h-64 overflow-y-auto bg-[#0a0a0d] p-4 rounded-xl border border-white/[0.07]">
                    {selectedContact.timeline && selectedContact.timeline.length > 0 ? (
                      selectedContact.timeline.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 relative pb-3 last:pb-0">
                          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="font-bold text-white">{event.title}</span>
                              <span className="text-[10px] text-slate-500">
                                {formatDateTime(event.timestamp, business.timezone, business.country)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{event.description}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No activity events recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-xs text-slate-500">
                Select a contact from the directory to view their complete 360-degree timeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      {showAddDealModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101014] border border-white/[0.07] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-pink-300" />
                <span>Create a deal</span>
              </h3>
              <button
                onClick={() => setShowAddDealModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Deal Title</label>
                <input
                  type="text"
                  required
                  value={newDealTitle}
                  onChange={e => setNewDealTitle(e.target.value)}
                  placeholder="e.g. Dual Heat Pump Install / Full Aligner Package"
                  className="w-full bg-[#0a0a0d] border border-white/[0.07] rounded-xl p-2.5 text-slate-300 focus:outline-none focus:border-pink-400/40"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Primary Contact Name</label>
                <input
                  type="text"
                  required
                  value={newDealContact}
                  onChange={e => setNewDealContact(e.target.value)}
                  placeholder="e.g. Marcus Vance or Pooja Hegde"
                  className="w-full bg-[#0a0a0d] border border-white/[0.07] rounded-xl p-2.5 text-slate-300 focus:outline-none focus:border-pink-400/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Value ({business.currency})</label>
                  <input
                    type="number"
                    required
                    value={newDealValue}
                    onChange={e => setNewDealValue(e.target.value)}
                    className="w-full bg-[#0a0a0d] border border-white/[0.07] rounded-xl p-2.5 text-slate-300 focus:outline-none focus:border-pink-400/40"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Pipeline Stage</label>
                  <select
                    value={newDealStage}
                    onChange={e => setNewDealStage(e.target.value as DealStage)}
                    className="w-full bg-[#0a0a0d] border border-white/[0.07] rounded-xl p-2.5 text-slate-300 focus:outline-none focus:border-pink-400/40"
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
