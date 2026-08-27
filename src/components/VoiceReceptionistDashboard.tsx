import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  User, 
  Calendar, 
  FileText, 
  Settings, 
  Zap, 
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { Business, CallRecord } from '../types';
import { getCalls, saveCall, addNotification, addAuditLog } from '../lib/dbService';
import { formatPhoneNumber, formatDateTime } from '../lib/localization';

interface VoiceReceptionistDashboardProps {
  business: Business;
}

export function VoiceReceptionistDashboard({ business }: VoiceReceptionistDashboardProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed' | 'transferred'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Live Simulated Inbound Call State
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<Array<{ speaker: 'caller' | 'ai_receptionist' | 'agent'; text: string; time: string }>>([]);
  const [callerName, setCallerName] = useState('Sarah Jenkins');
  const [callerPhone, setCallerPhone] = useState(business.country === 'IN' ? '+91 98450 99887' : '+1 (512) 890-7722');
  const [callerIntent, setCallerIntent] = useState(business.country === 'IN' ? 'Emergency Root Canal Inquiry' : 'Emergency HVAC AC Outage');
  const [aiSpeaking, setAiSpeaking] = useState(false);

  useEffect(() => {
    loadCalls();
  }, [business.id]);

  async function loadCalls() {
    const list = await getCalls(business.id);
    setCalls(list);
    if (list.length > 0 && !selectedCall) {
      setSelectedCall(list[0]);
    }
  }

  // Call timer simulation
  useEffect(() => {
    let interval: any;
    if (isCalling) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const handleStartSimulatedCall = () => {
    setIsCalling(true);
    setLiveTranscript([]);
    setAiSpeaking(true);

    const initialGreeting = business.country === 'IN'
      ? `Namaste! Thank you for calling ${business.name}. I am ${business.agentSettings.agentName}, your AI receptionist. How can I assist with your dental appointment today?`
      : `Thank you for calling ${business.name}. My name is ${business.agentSettings.agentName}, your AI receptionist. How can I help you today?`;

    setTimeout(() => {
      setLiveTranscript(prev => [
        ...prev,
        { speaker: 'ai_receptionist', text: initialGreeting, time: '00:02' }
      ]);
      setAiSpeaking(false);
    }, 1200);

    // Step 2: Customer answers
    setTimeout(() => {
      const customerText = business.country === 'IN'
        ? 'Hi, I am experiencing severe tooth pain in my upper left molar since yesterday. Can I see Dr. Sharma today?'
        : 'Hi Sarah, our AC completely stopped working and it is 98 degrees inside our house. Do you have emergency technicians available?';
      setLiveTranscript(prev => [
        ...prev,
        { speaker: 'caller', text: customerText, time: '00:14' }
      ]);
      setAiSpeaking(true);
    }, 3500);

    // Step 3: AI Responds & Qualifies
    setTimeout(() => {
      const aiText = business.country === 'IN'
        ? 'I am so sorry to hear you are in pain. Dr. Rajesh Sharma has an emergency dental slot open today at 3:30 PM. Would you like me to book this for you?'
        : 'I completely understand how critical AC is in this heat! We have a priority dispatch slot at 2:00 PM today with our senior technician. Shall I lock that in for your address?';
      setLiveTranscript(prev => [
        ...prev,
        { speaker: 'ai_receptionist', text: aiText, time: '00:26' }
      ]);
      setAiSpeaking(false);
    }, 6500);

    // Step 4: Customer Confirms
    setTimeout(() => {
      setLiveTranscript(prev => [
        ...prev,
        { speaker: 'caller', text: 'Yes please! That would be amazing.', time: '00:35' }
      ]);
      setAiSpeaking(true);
    }, 9000);

    // Step 5: Booking confirmation
    setTimeout(() => {
      const finishText = business.country === 'IN'
        ? `You are all set! I have booked your appointment with Dr. Sharma for 3:30 PM. I have also sent the Google Maps location to your WhatsApp at ${callerPhone}.`
        : `Done! Technician David Miller is scheduled to arrive between 2:00 PM - 3:00 PM. We just sent an SMS confirmation to ${callerPhone}.`;
      setLiveTranscript(prev => [
        ...prev,
        { speaker: 'ai_receptionist', text: finishText, time: '00:44' }
      ]);
      setAiSpeaking(false);
    }, 11500);
  };

  const handleEndSimulatedCall = async () => {
    setIsCalling(false);
    setAiSpeaking(false);

    const newCall: CallRecord = {
      id: `call-${Date.now()}`,
      businessId: business.id,
      callerName: callerName || 'Interactive Caller',
      callerPhone: callerPhone || '+1 (512) 555-0199',
      direction: 'inbound',
      status: 'completed',
      durationSeconds: callDuration > 0 ? callDuration : 48,
      intent: callerIntent || 'Emergency Repair Booking',
      leadScore: 92,
      transcript: liveTranscript.length > 0 ? liveTranscript : [
        { speaker: 'ai_receptionist', text: 'Thank you for calling! How can I assist you?', time: '00:02' },
        { speaker: 'caller', text: 'Needed immediate appointment scheduling.', time: '00:15' },
        { speaker: 'ai_receptionist', text: 'Booked and confirmed!', time: '00:30' }
      ],
      summary: `Inbound voice call handled 100% by AI Receptionist (${business.agentSettings.agentName}). Inquired about ${callerIntent}. Successfully qualified and booked appointment.`,
      disposition: 'Appointment Booked',
      appointmentBooked: true,
      appointmentDetails: 'Same-day priority slot confirmed',
      audioWaveform: [25, 45, 80, 95, 60, 40, 75, 90, 85, 55, 30, 65, 80, 45, 20],
      createdAt: new Date().toISOString()
    };

    await saveCall(newCall);
    await addNotification({
      businessId: business.id,
      type: 'appointment_booked',
      title: `📞 Call Converted: ${newCall.callerName}`,
      message: `AI Voice Receptionist booked appointment for ${newCall.intent}. Lead score: 92/100.`
    });
    await addAuditLog(
      business.id, 
      'ai-voice-engine@revenueos.internal', 
      'VOICE_CALL_PROCESSED', 
      newCall.callerPhone, 
      `Processed ${callDuration}s call. Booked appointment.`
    );
    
    await loadCalls();
    setSelectedCall(newCall);
  };

  const filteredCalls = calls.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.callerName.toLowerCase().includes(q) ||
        c.callerPhone.includes(q) ||
        c.intent.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Voice Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {business.country === 'IN' ? 'India (+91) Routing' : 'US (+1) 10DLC SIP'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-400" />
            <span>AI Voice Receptionist</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            24/7 intelligent voice answering. Handles inbound phone calls, speaks natural human voice, answers business questions via RAG knowledge base, qualifies prospects, and books calendar appointments in real-time.
          </p>
        </div>

        {/* Live Call Simulator CTA */}
        <div className="flex items-center gap-3">
          {!isCalling ? (
            <button
              onClick={handleStartSimulatedCall}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <PhoneIncoming className="w-4 h-4 animate-bounce" />
              <span>Simulate Inbound Call</span>
            </button>
          ) : (
            <button
              onClick={handleEndSimulatedCall}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End & Save Call ({formatSecs(callDuration)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Call Live Stage (When Call is Active) */}
      {isCalling && (
        <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-pulse">
          <div className="absolute top-0 right-0 p-4">
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              CALL IN PROGRESS • {formatSecs(callDuration)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Caller Info & Audio Waveform */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{callerName}</h3>
                  <p className="text-xs text-slate-400">{formatPhoneNumber(callerPhone, business.country)}</p>
                  <span className="text-[10px] text-emerald-400 font-medium">Inbound Voice • {callerIntent}</span>
                </div>
              </div>

              {/* Dynamic Audio Waveform Animation */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    {aiSpeaking ? `${business.agentSettings.agentName} (AI Speaking...)` : `${callerName} (Speaking...)`}
                  </span>
                  <span className="text-emerald-400 font-mono text-[11px]">HD Telephony (WebRTC)</span>
                </div>
                <div className="flex items-center gap-1 h-12 justify-center">
                  {[40, 65, 85, 30, 90, 55, 70, 95, 45, 80, 60, 35, 75, 90, 50, 65, 85, 30].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${aiSpeaking ? 'bg-blue-400' : 'bg-emerald-400'}`}
                      style={{
                        height: `${Math.max(15, (h * (aiSpeaking ? 1 : 0.8)) % 100)}%`,
                        opacity: (i % 2 === 0) ? 0.9 : 0.6
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>AI Latency:</span>
                  <span className="text-emerald-400 font-mono">420ms (Ultra-Low)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Knowledge Source:</span>
                  <span className="text-blue-400">{business.name} Verified RAG</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Auto-Booking:</span>
                  <span className="text-emerald-400 font-semibold">Enabled (Google Calendar)</span>
                </div>
              </div>
            </div>

            {/* Right: Live Transcript Stream */}
            <div className="lg:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col h-64 overflow-y-auto space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>Real-Time Speech-To-Text (Streaming)</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Gemini Flash Voice Engine
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {(liveTranscript || []).map((line, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${line.speaker === 'ai_receptionist' ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                      <span>{line.speaker === 'ai_receptionist' ? `${business.agentSettings?.agentName || 'AI Receptionist'} (AI)` : callerName}</span>
                      <span>•</span>
                      <span>{line.time}</span>
                    </div>
                    <div 
                      className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs ${
                        line.speaker === 'ai_receptionist'
                          ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                ))}
                {liveTranscript.length === 0 && (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Connecting audio stream...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Calls List + Selected Call Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Call History & Filters (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-400" />
              <span>Call Records ({calls.length})</span>
            </h3>
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${filter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1 rounded-lg transition-all ${filter === 'completed' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilter('missed')}
                className={`px-2.5 py-1 rounded-lg transition-all ${filter === 'missed' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
              >
                Missed
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by caller, phone, or intent..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* List of Calls */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {(filteredCalls || []).map(c => {
              const isSelected = selectedCall?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCall(c)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        c.status === 'completed' ? 'bg-emerald-400' :
                        c.status === 'missed' ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <span className="text-xs font-bold text-white">{c.callerName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(c.createdAt, business.timezone, business.country)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{formatPhoneNumber(c.callerPhone, business.country)}</span>
                    <span className="font-mono text-[11px]">{formatSecs(c.durationSeconds)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 truncate max-w-[200px]">
                      {c.intent}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.disposition === 'Appointment Booked'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : c.disposition === 'Qualified Lead'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {c.disposition}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCalls.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500">
                No calls found for the selected criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Call Detail, Waveform & Transcript (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {selectedCall ? (
            <>
              {/* Call Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      selectedCall.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {selectedCall.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(selectedCall.createdAt, business.timezone, business.country)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{selectedCall.callerName}</h3>
                  <p className="text-xs text-slate-400">{formatPhoneNumber(selectedCall.callerPhone, business.country)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Duration</div>
                    <div className="text-sm font-bold text-white font-mono">{formatSecs(selectedCall.durationSeconds)}</div>
                  </div>
                  <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Lead Score</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">{selectedCall.leadScore}/100</div>
                  </div>
                </div>
              </div>

              {/* AI Call Summary Card */}
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>AI Executive Call Summary & Outcome</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedCall.summary}
                </p>
                {selectedCall.appointmentBooked && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold pt-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Appointment automatically synced with Google Calendar</span>
                  </div>
                )}
              </div>

              {/* Audio Waveform Player */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    Call Recording & Audio Playback
                  </span>
                  <span className="font-mono">{formatSecs(selectedCall.durationSeconds)}</span>
                </div>
                <div className="flex items-center gap-1.5 h-10">
                  {(selectedCall.audioWaveform || [20, 40, 60, 80, 50, 70, 90, 40, 60, 85, 30, 55, 75, 45]).map((v, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-blue-500/60 hover:bg-blue-400 rounded-full transition-all"
                      style={{ height: `${Math.max(20, v)}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Full Speech-to-Text Transcript */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Full Audio Transcript ({selectedCall.transcript?.length || 0} messages)</span>
                </h4>

                <div className="space-y-3 max-h-72 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          line.speaker === 'ai_receptionist' ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                          <span>{line.speaker === 'ai_receptionist' ? `${business.agentSettings?.agentName || 'AI Receptionist'} (AI Receptionist)` : selectedCall.callerName}</span>
                          <span>•</span>
                          <span>{line.time}</span>
                        </div>
                        <div
                          className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                            line.speaker === 'ai_receptionist'
                              ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {line.text}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No transcript recorded for this missed call.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-24 text-slate-500 text-xs">
              Select a call record from the left column to view its audio waveform and full transcript.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
