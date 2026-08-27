import React, { useState, useEffect } from 'react';
import { 
  PhoneMissed, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  Settings, 
  Zap, 
  Smartphone, 
  Bot, 
  User, 
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';
import { Business, MissedCallRecovery } from '../types';
import { getMissedCallRecoveries, saveMissedCallRecovery, addNotification, saveLead } from '../lib/dbService';
import { formatPhoneNumber, formatDateTime, formatCurrency } from '../lib/localization';

interface MissedCallTextBackDashboardProps {
  business: Business;
}

export function MissedCallTextBackDashboard({ business }: MissedCallTextBackDashboardProps) {
  const [recoveries, setRecoveries] = useState<MissedCallRecovery[]>([]);
  const [selectedItem, setSelectedItem] = useState<MissedCallRecovery | null>(null);
  const [replyText, setReplyText] = useState('');
  const [templateText, setTemplateText] = useState(
    business.country === 'IN'
      ? 'Namaste! We noticed we missed your call at {{business_name}}. How can our dental team assist you today? Reply to chat with our clinic assistant.'
      : 'Hi! Sorry we missed your call at {{business_name}}. How can our team help you with your home services today? Reply to chat with our instant assistant.'
  );
  const [isSavedTemplate, setIsSavedTemplate] = useState(false);

  // New simulated missed call state
  const [simulatingPhone, setSimulatingPhone] = useState(business.country === 'IN' ? '+91 99001 55443' : '+1 (512) 440-9988');
  const [simulatingName, setSimulatingName] = useState('Jessica Reynolds');

  useEffect(() => {
    loadData();
  }, [business.id]);

  async function loadData() {
    const list = await getMissedCallRecoveries(business.id);
    setRecoveries(list);
    if (list.length > 0 && !selectedItem) {
      setSelectedItem(list[0]);
    }
  }

  // Calculate Metrics
  const totalMissed = recoveries.length;
  const recoveredCount = recoveries.filter(r => r.textBackStatus === 'recovered').length;
  const recoveryRate = totalMissed > 0 ? Math.round((recoveredCount / totalMissed) * 100) : 0;
  const estimatedRevenueSaved = recoveredCount * (business.country === 'IN' ? 18000 : 3200);

  const handleSimulateMissedCall = async () => {
    const channel = business.country === 'IN' ? 'WhatsApp' : 'SMS';
    const initialMsg = templateText
      .replace('{{business_name}}', business.name)
      .replace('{{first_name}}', simulatingName);

    const newItem: MissedCallRecovery = {
      id: `mc-${Date.now()}`,
      businessId: business.id,
      callerPhone: simulatingPhone,
      callerName: simulatingName,
      callTimestamp: new Date().toISOString(),
      textBackStatus: 'sent',
      channel,
      initialMessage: initialMsg,
      conversationMessages: [
        {
          sender: 'system',
          text: initialMsg,
          timestamp: new Date().toISOString()
        }
      ],
      recoveryRateAttributed: false,
      createdAt: new Date().toISOString()
    };

    await saveMissedCallRecovery(newItem);
    await addNotification({
      businessId: business.id,
      type: 'missed_call',
      title: `📞 Missed Call Triggered: ${simulatingName}`,
      message: `Automated ${channel} text-back sent in 15 seconds. Awaiting customer reply.`
    });

    await loadData();
    setSelectedItem(newItem);

    // Simulate customer reply after 2.5s
    setTimeout(async () => {
      const customerMsg = business.country === 'IN'
        ? 'Hi, I need an appointment for tooth cleaning and whitening this Saturday afternoon.'
        : 'Hi! Our main water line is leaking into the front yard, need emergency quote.';
      
      newItem.conversationMessages.push({
        sender: 'customer',
        text: customerMsg,
        timestamp: new Date().toISOString()
      });
      newItem.textBackStatus = 'replied';
      await saveMissedCallRecovery(newItem);
      await loadData();

      // Simulate AI Assistant reply after 3s
      setTimeout(async () => {
        const aiMsg = business.country === 'IN'
          ? 'We have a slot open this Saturday at 2:30 PM with Dr. Sharma for Teeth Whitening! Shall I confirm this for you?'
          : 'We have emergency plumbers dispatched in your area. Can we send our master plumber at 3:00 PM today?';

        newItem.conversationMessages.push({
          sender: 'ai',
          text: aiMsg,
          timestamp: new Date().toISOString()
        });
        newItem.textBackStatus = 'recovered';
        newItem.recoveryRateAttributed = true;

        await saveMissedCallRecovery(newItem);
        await saveLead({
          id: `lead-mc-${Date.now()}`,
          businessId: business.id,
          name: newItem.callerName,
          email: `${newItem.callerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          phone: newItem.callerPhone,
          source: 'missed_call_textback',
          status: 'appointment',
          score: 90,
          scoreCategory: 'HOT',
          aiScoreExplanation: `Missed call auto-recovered via instant ${channel} text-back. High-intent booking confirmed.`,
          value: business.country === 'IN' ? 14500 : 3500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await loadData();
      }, 3000);
    }, 2500);
  };

  const handleSendManualReply = async () => {
    if (!selectedItem || !replyText.trim()) return;

    const updated = { ...selectedItem };
    updated.conversationMessages.push({
      sender: 'ai',
      text: replyText.trim(),
      timestamp: new Date().toISOString()
    });
    setReplyText('');

    await saveMissedCallRecovery(updated);
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Revenue Leakage Prevention
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {business.country === 'IN' ? 'WhatsApp Gateway' : 'A2P 10DLC SMS'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PhoneMissed className="w-5 h-5 text-amber-400" />
            <span>Missed Call Text Back Automation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Never lose a customer to a competitor. When an inbound phone call is missed or after hours, AI RevenueOS instantly dispatches an intelligent SMS / WhatsApp message within 15 seconds to begin two-way qualification and appointment booking.
          </p>
        </div>

        {/* Trigger Simulation Button */}
        <button
          onClick={handleSimulateMissedCall}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>Simulate Missed Call & Auto-Text</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Total Missed Inbound Calls</div>
          <div className="text-2xl font-black text-white mt-1">{totalMissed}</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" />
            <span>100% Instant Text-Back Dispatch Rate</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Recovered Leads / Appointments</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{recoveredCount} ({recoveryRate}%)</div>
          <div className="text-[10px] text-blue-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>Industry Benchmark is ~22%</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Saved Pipeline Value</div>
          <div className="text-2xl font-black text-white mt-1">
            {formatCurrency(estimatedRevenueSaved, business.currency, business.country)}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
            <span>Directly attributed to instant text-back</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recovery Threads + Config Template */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Missed Call Threads (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Recovery Threads ({recoveries.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Channel: {business.country === 'IN' ? 'WhatsApp' : 'SMS'}</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {(recoveries || []).map(r => {
              const isSelected = selectedItem?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedItem(r)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{r.callerName}</span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(r.callTimestamp, business.timezone, business.country)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{formatPhoneNumber(r.callerPhone, business.country)}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{r.channel}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 truncate max-w-[200px]">
                      {r.conversationMessages[r.conversationMessages.length - 1]?.text || r.initialMessage}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.textBackStatus === 'recovered'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : r.textBackStatus === 'replied'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {r.textBackStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}

            {recoveries.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-500">
                No missed calls recorded yet. Click "Simulate Missed Call" above to test the recovery engine!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Conversation Thread & Template Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Conversation Chat View */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            {selectedItem ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedItem.callerName}</h4>
                      <p className="text-xs text-slate-400">{formatPhoneNumber(selectedItem.callerPhone, business.country)}</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedItem.textBackStatus === 'recovered'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {selectedItem.textBackStatus === 'recovered' ? '✓ RECOVERED & BOOKED' : 'ACTIVE CONVERSATION'}
                  </span>
                </div>

                {/* Messages Stream */}
                <div className="space-y-3 max-h-64 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {(selectedItem.conversationMessages || []).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.sender === 'customer' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                        <span>
                          {msg.sender === 'customer'
                            ? selectedItem.callerName
                            : msg.sender === 'ai'
                            ? `${business.agentSettings?.agentName || 'AI Receptionist'} (AI)`
                            : 'Automated System'}
                        </span>
                        <span>•</span>
                        <span>{formatDateTime(msg.timestamp, business.timezone, business.country)}</span>
                      </div>
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'customer'
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : msg.sender === 'ai'
                            ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                            : 'bg-amber-600/20 text-amber-200 border border-amber-500/30'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendManualReply()}
                    placeholder={`Reply to ${selectedItem.callerName} via ${selectedItem.channel}...`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSendManualReply}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-xs text-slate-500">
                Select a thread from the left to view the interactive text-back history.
              </div>
            )}
          </div>

          {/* Template Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Missed Call Instant Text-Back Template</span>
              </h4>
              <span className="text-[10px] text-slate-400">Available: {'{{business_name}}'}, {'{{first_name}}'}</span>
            </div>

            <textarea
              rows={3}
              value={templateText}
              onChange={e => {
                setTemplateText(e.target.value);
                setIsSavedTemplate(false);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Dispatches automatically via {business.country === 'IN' ? 'WhatsApp Cloud API' : 'Twilio SMS'} within 15 seconds.
              </span>
              <button
                onClick={() => setIsSavedTemplate(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                {isSavedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <SaveIcon className="w-3.5 h-3.5" />}
                <span>{isSavedTemplate ? 'Saved!' : 'Save Template'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveIcon(props: any) {
  return <CheckCircle {...props} />;
}
