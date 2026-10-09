import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Clock, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Mail, 
  MessageSquare, 
  Phone, 
  Sliders,
  Filter
} from 'lucide-react';
import { Business, FollowUpTask } from '../types';
import { getFollowUpTasks, saveFollowUpTask, addNotification, addAuditLog } from '../lib/dbService';
import { formatDateTime, formatPhoneNumber } from '../lib/localization';

interface FollowUpDashboardProps {
  business: Business;
}

export function FollowUpDashboard({ business }: FollowUpDashboardProps) {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered' | 'responded'>('all');
  const [executingId, setExecutingId] = useState<string | null>(null);

  // New Follow-Up Task Modal
  const [showModal, setShowModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [channel, setChannel] = useState<'Email' | 'SMS' | 'WhatsApp'>('SMS');
  const [sequenceDay, setSequenceDay] = useState<'Day 0' | 'Day 1' | 'Day 3' | 'Day 7'>('Day 1');
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    loadTasks();
  }, [business.id]);

  async function loadTasks() {
    const list = await getFollowUpTasks(business.id);
    setTasks(list);
  }

  const handleExecuteTask = async (task: FollowUpTask) => {
    setExecutingId(task.id);
    setTimeout(async () => {
      const updated: FollowUpTask = {
        ...task,
        status: 'delivered'
      };
      await saveFollowUpTask(updated);
      await addNotification({
        businessId: business.id,
        type: 'estimate_followup',
        title: `Follow-Up Dispatched: ${task.contactName}`,
        message: `${task.sequenceDay} automated ${task.channel} sent successfully.`
      });
      await addAuditLog(
        business.id,
        'followup-engine@revenueos.internal',
        'FOLLOW_UP_DISPATCHED',
        task.contactName,
        `Executed ${task.sequenceDay} ${task.channel} follow-up`
      );
      setExecutingId(null);
      await loadTasks();
    }, 1000);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !messageText.trim()) return;

    const newTask: FollowUpTask = {
      id: `fu-${Date.now()}`,
      businessId: business.id,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim() || (business.country === 'IN' ? '+91 98765 00000' : '+1 (512) 555-0100'),
      contactEmail: `${contactName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      triggerReason: 'new_lead',
      channel,
      sequenceDay,
      scheduledTime: new Date(Date.now() + 86400000).toISOString(),
      messageText: messageText.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await saveFollowUpTask(newTask);
    setShowModal(false);
    setContactName('');
    setMessageText('');
    await loadTasks();
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="space-y-5 animate-fadeIn text-slate-200">
      {/* Header Banner */}
      <div className="border-b border-white/[0.08] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Autonomous Lead Nurture
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-500/10 text-pink-300 border border-pink-400/20">
              Multi-Channel Sequence (Day 0 → Day 7)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Repeat className="w-5 h-5 text-pink-300" />
            <span>AI Lead Follow-Up Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            80% of sales require 5 follow-ups, yet 44% of reps give up after one. AI RevenueOS executes automated, context-aware follow-up sequences across SMS, WhatsApp, and Email until the lead responds or books an appointment.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/10 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Queue Follow-Up Task</span>
        </button>
      </div>

      {/* Visual Day 0 -> Day 1 -> Day 3 -> Day 7 Sequence Roadmap */}
      <div className="bg-[#101014] border border-white/[0.08] rounded-xl p-6 shadow-none space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-pink-300" />
          <span>Automated Cadence Roadmap</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-[#0c0c0f] p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/10 text-pink-200 border border-pink-400/25">
                Day 0 (Instant)
              </span>
              <span className="text-[10px] text-slate-500">&lt; 2 Minutes</span>
            </div>
            <h4 className="text-xs font-bold text-white">Instant Qualification</h4>
            <p className="text-[11px] text-slate-400">
              Dispatches SMS / WhatsApp greeting, verified RAG pricing brochure, and calendar booking link.
            </p>
          </div>

          <div className="bg-[#0c0c0f] p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/10 text-pink-200 border border-pink-400/20">
                Day 1 (24h)
              </span>
              <span className="text-[10px] text-slate-500">+24 Hours</span>
            </div>
            <h4 className="text-xs font-bold text-white">Personalized Check-In</h4>
            <p className="text-[11px] text-slate-400">
              Gentle value check-in asking if they had questions on the estimate or required technician dispatch.
            </p>
          </div>

          <div className="bg-[#0c0c0f] p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/10 text-pink-200 border border-pink-400/20">
                Day 3 (72h)
              </span>
              <span className="text-[10px] text-slate-500">+72 Hours</span>
            </div>
            <h4 className="text-xs font-bold text-white">Proof & Case Study</h4>
            <p className="text-[11px] text-slate-400">
              Shares a recent 5-star customer review, photo before/after, and limited-time priority slot.
            </p>
          </div>

          <div className="bg-[#0c0c0f] p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Day 7 (168h)
              </span>
              <span className="text-[10px] text-slate-500">+7 Days</span>
            </div>
            <h4 className="text-xs font-bold text-white">Breakup / Special Incentive</h4>
            <p className="text-[11px] text-slate-400">
              Polite closure message with 0% EMI financing offer or complimentary diagnostic upgrade.
            </p>
          </div>
        </div>
      </div>

      {/* Task Queue Table */}
      <div className="bg-[#101014] border border-white/[0.08] rounded-xl p-6 shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-pink-300" />
            <span>Active Follow-Up Task Queue ({tasks.length})</span>
          </h3>

          <div className="flex items-center gap-1 bg-[#0c0c0f] p-1 rounded-xl text-xs border border-white/[0.08]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${filter === 'all' ? 'bg-pink-500 text-white font-bold' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-all ${filter === 'pending' ? 'bg-pink-500 text-white font-bold' : 'text-slate-400'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('delivered')}
              className={`px-3 py-1 rounded-lg transition-all ${filter === 'delivered' ? 'bg-pink-500 text-white font-bold' : 'text-slate-400'}`}
            >
              Delivered
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="bg-[#0c0c0f] p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.12] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/10 text-pink-200 border border-pink-400/25">
                    {task.sequenceDay}
                  </span>
                  <span className="text-xs font-bold text-white">{task.contactName}</span>
                  <span className="text-[10px] text-slate-400">({formatPhoneNumber(task.contactPhone, business.country)})</span>
                </div>

                <p className="text-xs text-slate-300 bg-[#101014]/80 p-2.5 rounded-xl border border-white/[0.06] font-mono">
                  "{task.messageText}"
                </p>

                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-pink-300" />
                    Channel: {task.channel}
                  </span>
                  <span>•</span>
                  <span>Trigger: {task.triggerReason.replace(/_/g, ' ')}</span>
                  <span>•</span>
                  <span>Scheduled: {formatDateTime(task.scheduledTime, business.timezone, business.country)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  task.status === 'delivered'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {task.status}
                </span>

                {task.status === 'pending' && (
                  <button
                    disabled={executingId === task.id}
                    onClick={() => handleExecuteTask(task)}
                    className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{executingId === task.id ? 'Sending...' : 'Send Now'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500">
              No follow-up tasks found for this filter.
            </div>
          )}
        </div>
      </div>

      {/* Queue Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#08080b]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101014] border border-white/[0.08] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-pink-300" />
                <span>Queue Automated Follow-Up</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Contact Name</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. David Miller"
                  className="w-full bg-[#0c0c0f] border border-white/[0.08] rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-pink-400/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Channel</label>
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value as any)}
                    className="w-full bg-[#0c0c0f] border border-white/[0.08] rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-pink-400/60"
                  >
                    <option value="SMS">SMS (US)</option>
                    <option value="WhatsApp">WhatsApp (India/Global)</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Sequence Cadence</label>
                  <select
                    value={sequenceDay}
                    onChange={e => setSequenceDay(e.target.value as any)}
                    className="w-full bg-[#0c0c0f] border border-white/[0.08] rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-pink-400/60"
                  >
                    <option value="Day 0">Day 0 (Instant)</option>
                    <option value="Day 1">Day 1 (+24h)</option>
                    <option value="Day 3">Day 3 (+72h)</option>
                    <option value="Day 7">Day 7 (+168h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Message Content</label>
                <textarea
                  rows={3}
                  required
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Enter context-aware follow-up copy..."
                  className="w-full bg-[#0c0c0f] border border-white/[0.08] rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-pink-400/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold"
                >
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
