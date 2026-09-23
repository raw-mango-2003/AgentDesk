import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  User, 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Filter, 
  Search, 
  ChevronRight, 
  UserCheck, 
  X,
  Phone,
  Mail
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
    const data = await getConversations(business.id);
    setConversations(data);
    setSelectedConv(data.length > 0 ? data[0] : null);
    setLoading(false);
  };

  useEffect(() => {
    setSelectedConv(null);
    loadData();
  }, [business.id]);

  const handleStatusChange = async (convId: string, newStatus: ConversationStatus) => {
    await updateConversationStatus(convId, newStatus, business.id);
    if (selectedConv && selectedConv.id === convId) {
      setSelectedConv({ ...selectedConv, status: newStatus });
    }
    loadData();
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesStatus = filterStatus === 'ALL' || conv.status === filterStatus;
    const nameMatch = (conv.customerName || 'Anonymous').toLowerCase().includes(search.toLowerCase());
    const emailMatch = (conv.customerEmail || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && (nameMatch || emailMatch);
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Conversations & Transcripts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View live interactions between customer visitors and your AI receptionist for <span className="font-semibold text-slate-700">{business.name}</span>.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="AI_ACTIVE">AI Active</option>
            <option value="HUMAN_REQUIRED">Human Required</option>
            <option value="HUMAN_ACTIVE">Human Active</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Master Detail Split View */}
      <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
        {/* Left Col: Conversation List */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 overflow-y-auto space-y-2 shadow-2xs">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading transcripts...</div>
          ) : (filteredConversations || []).length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No conversations match your filter.</div>
          ) : (
            (filteredConversations || []).map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedConv?.id === conv.id
                    ? 'bg-blue-50/80 border-blue-400 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-bold text-slate-900 text-xs truncate max-w-[140px]">
                    {conv.customerName || 'Anonymous Visitor'}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    conv.status === 'RESOLVED' 
                      ? 'bg-emerald-100 text-emerald-800'
                      : conv.status === 'HUMAN_REQUIRED'
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {(conv.status || 'OPEN').replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-1 mb-2">
                  {conv.messages?.[conv.messages.length - 1]?.text || 'No messages'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{new Date(conv.createdAt).toLocaleDateString()}</span>
                  {conv.leadCaptured && (
                    <span className="text-purple-600 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Lead
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right 2 Cols: Selected Conversation Transcript */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
          {selectedConv ? (
            <>
              {/* Top Details Bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {selectedConv.customerName || 'Anonymous Customer'}
                    </h3>
                    <span className="text-xs text-slate-400">• ID: {selectedConv.id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    {selectedConv.customerEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {selectedConv.customerEmail}
                      </span>
                    )}
                    {selectedConv.customerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {selectedConv.customerPhone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Switcher Action */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Status:</span>
                  <select
                    value={selectedConv.status}
                    onChange={e => handleStatusChange(selectedConv.id, e.target.value as ConversationStatus)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AI_ACTIVE">AI ACTIVE</option>
                    <option value="HUMAN_REQUIRED">HUMAN REQUIRED</option>
                    <option value="HUMAN_ACTIVE">HUMAN ACTIVE</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Messages Transcript Scroll Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
                {(selectedConv.messages || []).map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        msg.sender === 'user'
                          ? 'bg-slate-700 text-white'
                          : msg.sender === 'human_support'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-2xs'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-9">{msg.timestamp}</span>
                  </div>
                ))}
              </div>

              {/* Footer info */}
              <div className="p-3 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
                Customer Conversation Scoped to Business ID: <span className="font-mono text-slate-700 font-bold">{selectedConv.businessId}</span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a conversation from the list to view transcript.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
