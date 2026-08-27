import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Zap, 
  CheckCircle, 
  MessageSquare, 
  Calendar, 
  Users,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { Business } from '../types';
import { formatCurrency } from '../lib/localization';

interface AICopilotDrawerProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  actionButton?: {
    label: string;
    tabId: string;
  };
}

export function AICopilotDrawer({ business, isOpen, onClose, onNavigateTab }: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'copilot',
      text: `Hello! I'm your AI RevenueOS Copilot for ${business.name}. I can analyze your pipeline, qualify inbound leads, schedule appointments, or draft personalized follow-ups. What would you like to accomplish?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'How many hot leads are awaiting follow-up?',
    'What is our missed call recovery rate?',
    'Draft a 24h follow-up message',
    'Show me upcoming appointments for today'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // AI Reasoning simulation
    setTimeout(() => {
      let reply = '';
      let actionBtn: { label: string; tabId: string } | undefined = undefined;

      const lower = text.toLowerCase();
      if (lower.includes('hot') || lower.includes('lead')) {
        reply = `You currently have 2 HOT leads in the pipeline (Marcus Vance and Pooja Hegde) with an average AI score of 94/100. Both are in the "High Intent" category. I recommend dispatching an estimate or booking a slot immediately.`;
        actionBtn = { label: 'Open Leads Intelligence', tabId: 'leads' };
      } else if (lower.includes('missed') || lower.includes('call') || lower.includes('recovery')) {
        reply = `Your Missed Call Text-Back engine has recovered 78% of missed inbound calls this month, securing an estimated ${business.country === 'IN' ? '₹72,000' : '$12,800'} in otherwise lost revenue.`;
        actionBtn = { label: 'View Missed Call Engine', tabId: 'missed_calls' };
      } else if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('calendar')) {
        reply = `You have 3 confirmed service appointments scheduled for this week with automated 24h and 2h SMS/WhatsApp reminder sequences active. Show-up rate is holding at 94%.`;
        actionBtn = { label: 'View Calendar', tabId: 'appointments' };
      } else if (lower.includes('follow') || lower.includes('draft')) {
        reply = `Here is an AI-crafted follow-up: "Hi {{first_name}}, this is ${business.agentSettings.agentName} from ${business.name}. We wanted to check if you had any questions on the estimate we sent over. Would tomorrow at 2:00 PM work for a quick 5-minute review?"`;
        actionBtn = { label: 'Open Follow-Up Engine', tabId: 'followup' };
      } else {
        reply = `I have analyzed your ${business.name} workspace. Everything is operating smoothly across Voice Receptionist, SMS/WhatsApp gateways, and the CRM pipeline.`;
        actionBtn = { label: 'View Full Dashboard', tabId: 'overview' };
      }

      const copilotMsg: ChatMessage = {
        id: `c-${Date.now()}`,
        sender: 'copilot',
        text: reply,
        timestamp: new Date().toISOString(),
        actionButton: actionBtn
      };

      setMessages(prev => [...prev, copilotMsg]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-900 border-l border-slate-800 z-50 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>AI Revenue Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">Autonomous Assistant for {business.name}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {(messages || []).map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 text-[9px] text-slate-500 mb-1">
              <span>{msg.sender === 'user' ? 'You' : 'Revenue Copilot'}</span>
            </div>
            <div
              className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.text}

              {msg.actionButton && (
                <button
                  onClick={() => {
                    onNavigateTab(msg.actionButton!.tabId);
                    onClose();
                  }}
                  className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>{msg.actionButton.label}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-3 rounded-2xl border border-slate-800 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span>Copilot is analyzing data...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-1.5">
        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Quick Inquiries</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(quickPrompts || []).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all text-left truncate max-w-full cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Ask Copilot or type an instruction..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
