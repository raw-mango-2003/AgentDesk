import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  User,
  Bot,
  Filter,
  Search,
  UserCheck,
  Phone,
  Mail,
  ArrowUpRight,
} from 'lucide-react';
import { Business, Conversation, ConversationStatus } from '../types';
import { getConversations, updateConversationStatus } from '../lib/dbService';

interface ConversationsDashboardProps {
  business: Business;
}

export const ConversationsDashboard: React.FC<ConversationsDashboardProps> = ({ business }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getConversations(business.id);
      setConversations(data);
      setSelectedConv(current => {
        if (!data.length) return null;
        return data.find(conv => conv.id === current?.id) || data[0];
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedConv(null);
    loadData();
  }, [business.id]);

  const handleStatusChange = async (convId: string, newStatus: ConversationStatus) => {
    await updateConversationStatus(convId, newStatus, business.id);
    setSelectedConv(current => current?.id === convId ? { ...current, status: newStatus } : current);
    await loadData();
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesStatus = filterStatus === 'ALL' || conv.status === filterStatus;
    const query = search.trim().toLowerCase();
    const nameMatch = (conv.customerName || 'Anonymous').toLowerCase().includes(query);
    const emailMatch = (conv.customerEmail || '').toLowerCase().includes(query);
    return matchesStatus && (!query || nameMatch || emailMatch);
  });

  const statusLabel = (status: string) => (status || 'OPEN').replace(/_/g, ' ');
  const statusClass = (status: string) => {
    if (status === 'RESOLVED') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
    if (status === 'HUMAN_REQUIRED') return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
    if (status === 'HUMAN_ACTIVE') return 'border-sky-400/20 bg-sky-400/10 text-sky-300';
    return 'border-pink-400/20 bg-pink-400/10 text-pink-300';
  };

  return (
    <div className="space-y-5 animate-fadeIn text-slate-200">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-pink-300">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
            Customer operations
          </div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <MessageSquare className="h-6 w-6 text-pink-300" />
            Conversations
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review customer interactions and manage handoffs for <span className="font-medium text-slate-200">{business.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-slate-400 sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-pink-400" />
          <span>{filteredConversations.length} {filteredConversations.length === 1 ? 'conversation' : 'conversations'}</span>
        </div>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search customers by name or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/[0.09] bg-[#111115] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-pink-400/50 focus:ring-2 focus:ring-pink-500/10"
          />
        </div>
        <div className="relative flex items-center gap-2 rounded-lg border border-white/[0.09] bg-[#111115] px-3">
          <Filter className="h-4 w-4 shrink-0 text-slate-500" />
          <select
            aria-label="Filter conversations by status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="min-w-[150px] flex-1 bg-transparent py-3 pr-5 text-sm font-medium text-slate-200 outline-none"
          >
            <option className="bg-[#111115]" value="ALL">All statuses</option>
            <option className="bg-[#111115]" value="AI_ACTIVE">AI active</option>
            <option className="bg-[#111115]" value="HUMAN_REQUIRED">Human required</option>
            <option className="bg-[#111115]" value="HUMAN_ACTIVE">Human active</option>
            <option className="bg-[#111115]" value="RESOLVED">Resolved</option>
          </select>
        </div>
      </section>

      <section className="grid min-h-[620px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#101014] lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.7fr)]">
        <aside className="flex min-h-0 flex-col border-b border-white/[0.08] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Inbox</span>
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-slate-400">{filteredConversations.length} total</span>
          </div>
          <div className="max-h-[620px] flex-1 space-y-1 overflow-y-auto p-2">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">Loading conversations…</div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <MessageSquare className="mx-auto mb-3 h-6 w-6 text-slate-600" />
                <p className="text-sm font-medium text-slate-300">No conversations found</p>
                <p className="mt-1 text-xs text-slate-500">Try another search or status filter.</p>
              </div>
            ) : filteredConversations.map(conv => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedConv(conv)}
                aria-pressed={selectedConv?.id === conv.id}
                className={`group w-full rounded-lg border p-3.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/30 ${
                  selectedConv?.id === conv.id
                    ? 'border-pink-400/30 bg-pink-400/[0.07]'
                    : 'border-transparent bg-transparent hover:border-white/[0.06] hover:bg-white/[0.025]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-slate-300">
                    {(conv.customerName || 'A').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-100">{conv.customerName || 'Anonymous visitor'}</span>
                      <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${selectedConv?.id === conv.id ? 'text-pink-300' : 'text-slate-600 group-hover:text-slate-400'}`} />
                    </div>
                    <p className="mt-1 truncate text-xs leading-5 text-slate-500">{conv.messages?.[conv.messages.length - 1]?.text || 'No messages yet'}</p>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500">{new Date(conv.createdAt).toLocaleDateString()}</span>
                      <span className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${statusClass(conv.status)}`}>{statusLabel(conv.status)}</span>
                    </div>
                    {conv.leadCaptured && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-pink-300">
                        <UserCheck className="h-3 w-3" /> Lead captured
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-[480px] min-w-0 flex-col">
          {selectedConv ? (
            <>
              <div className="flex flex-col gap-4 border-b border-white/[0.08] bg-white/[0.015] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-white">{selectedConv.customerName || 'Anonymous customer'}</h2>
                    <span className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${statusClass(selectedConv.status)}`}>{statusLabel(selectedConv.status)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    {selectedConv.customerEmail && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selectedConv.customerEmail}</span>}
                    {selectedConv.customerPhone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selectedConv.customerPhone}</span>}
                  </div>
                  <p className="mt-2 truncate font-mono text-[10px] text-slate-600">Conversation ID · {selectedConv.id}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                  Status
                  <select
                    aria-label="Update conversation status"
                    value={selectedConv.status}
                    onChange={e => handleStatusChange(selectedConv.id, e.target.value as ConversationStatus)}
                    className="rounded-md border border-white/[0.1] bg-[#17171c] px-2.5 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-pink-400/50"
                  >
                    <option className="bg-[#17171c]" value="AI_ACTIVE">AI active</option>
                    <option className="bg-[#17171c]" value="HUMAN_REQUIRED">Human required</option>
                    <option className="bg-[#17171c]" value="HUMAN_ACTIVE">Human active</option>
                    <option className="bg-[#17171c]" value="RESOLVED">Resolved</option>
                  </select>
                </label>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto bg-[#0c0c0f] px-4 py-6 sm:px-6">
                <div className="mx-auto flex max-w-max items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                  Transcript · {selectedConv.messages?.length || 0} messages
                </div>
                {(selectedConv.messages || []).length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-500">There are no messages in this conversation yet.</div>
                ) : (selectedConv.messages || []).map((msg, idx) => {
                  const isCustomer = msg.sender === 'user';
                  const isHuman = msg.sender === 'human_support';
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}>
                      <div className={`mb-1.5 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${isCustomer ? 'flex-row-reverse text-pink-300' : isHuman ? 'text-emerald-300' : 'text-slate-500'}`}>
                        {isCustomer ? <User className="h-3 w-3" /> : isHuman ? <UserCheck className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        {isCustomer ? 'Customer' : isHuman ? 'Human support' : 'AI assistant'}
                      </div>
                      <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${
                        isCustomer
                          ? 'rounded-tr-sm border border-pink-300/20 bg-pink-500/[0.13] text-pink-50'
                          : isHuman
                          ? 'rounded-tl-sm border border-emerald-400/15 bg-emerald-400/[0.06] text-slate-200'
                          : 'rounded-tl-sm border border-white/[0.07] bg-white/[0.035] text-slate-200'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="mt-1.5 px-1 text-[10px] text-slate-600">{msg.timestamp}</span>
                    </div>
                  );
                })}
              </div>

              <footer className="border-t border-white/[0.08] bg-white/[0.015] px-5 py-3">
                <p className="text-[10px] text-slate-500">Workspace isolation active <span className="px-1.5 text-slate-700">/</span> Business ID <span className="font-mono text-slate-400">{selectedConv.businessId}</span></p>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025]">
                <MessageSquare className="h-5 w-5 text-slate-500" />
              </div>
              <h2 className="text-sm font-semibold text-slate-200">{loading ? 'Loading conversations' : 'Select a conversation'}</h2>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{loading ? 'Fetching customer interactions for this workspace.' : 'Choose a customer from the inbox to inspect the full transcript.'}</p>
            </div>
          )}
        </main>
      </section>
    </div>
  );
};
