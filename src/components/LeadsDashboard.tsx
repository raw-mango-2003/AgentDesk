import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  Filter, 
  Search, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  UserCheck, 
  Edit3,
  Sparkles 
} from 'lucide-react';
import { Business, Lead, LeadStatus } from '../types';
import { getLeads, updateLeadStatus } from '../lib/dbService';

interface LeadsDashboardProps {
  business: Business;
}

export const LeadsDashboard: React.FC<LeadsDashboardProps> = ({ business }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editingNotesLeadId, setEditingNotesLeadId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getLeads(business.id);
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    await updateLeadStatus(leadId, newStatus, undefined, business.id);
    loadData();
  };

  const handleSaveNotes = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      await updateLeadStatus(leadId, lead.status, tempNotes, business.id);
      setEditingNotesLeadId(null);
      loadData();
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            Leads & Contact Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            High-intent website visitors captured automatically by your 24/7 AI Receptionist for <span className="font-semibold text-slate-700">{business.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
            {leads.length} Total Captured
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search lead by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-slate-700"
          >
            <option value="all">All Lead Statuses</option>
            <option value="new">New Inquiry</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted Client</option>
          </select>
        </div>
      </div>

      {/* Bento Grid Cards for Leads */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs">Loading captured leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-sm mb-1">No leads found</h3>
          <p className="text-xs">Test the AI receptionist widget to submit a demo lead inquiry.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map(lead => (
            <div
              key={lead.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                      {lead.name.charAt(0)}
                    </div>
                    <span>{lead.name}</span>
                  </div>

                  <select
                    value={lead.status}
                    onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border focus:outline-none ${
                      lead.status === 'converted'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : lead.status === 'qualified'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : lead.status === 'contacted'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-purple-100 text-purple-800 border-purple-200'
                    }`}
                  >
                    <option value="new">NEW</option>
                    <option value="contacted">CONTACTED</option>
                    <option value="qualified">QUALIFIED</option>
                    <option value="converted">CONVERTED</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Captured: {new Date(lead.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed mb-3">
                  <span className="font-semibold text-slate-900 block mb-0.5">Inquiry Message:</span>
                  {lead.message || 'Requested callback from support team.'}
                </div>

                {/* Lead Internal Notes */}
                {editingNotesLeadId === lead.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={tempNotes}
                      onChange={e => setTempNotes(e.target.value)}
                      placeholder="Add team notes..."
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingNotesLeadId(null)}
                        className="text-[11px] text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveNotes(lead.id)}
                        className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded-lg"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="truncate max-w-[180px]">
                      {lead.notes ? `Note: ${lead.notes}` : 'No internal notes'}
                    </span>
                    <button
                      onClick={() => {
                        setEditingNotesLeadId(lead.id);
                        setTempNotes(lead.notes || '');
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Note</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
