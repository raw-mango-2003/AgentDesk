import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Bot, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Mic,
  Phone,
  ShieldAlert,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Business, Conversation, Lead, AnalyticsSummary, OnboardingStep, UsageAlertStatus, UnansweredQuestion } from '../types';
import { 
  getConversations, 
  getLeads, 
  getAnalyticsSummary, 
  getOnboardingProgress, 
  getUsageAlertStatus, 
  getUnansweredQuestions,
  convertUnansweredQuestionToKnowledge
} from '../lib/dbService';
import { getPlanConfig } from '../data/pricing';

interface DashboardOverviewProps {
  business: Business;
  onNavigateTab: (tab: string) => void;
  onOpenDemoWidget: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  business,
  onNavigateTab,
  onOpenDemoWidget
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [onboarding, setOnboarding] = useState<{ completed: number; total: number; steps: OnboardingStep[] } | null>(null);
  const [usageAlert, setUsageAlert] = useState<UsageAlertStatus | null>(null);
  const [unanswered, setUnanswered] = useState<UnansweredQuestion[]>([]);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [cList, lList, summary, onb, uAlert, uQuestions] = await Promise.all([
        getConversations(business.id),
        getLeads(business.id),
        getAnalyticsSummary(business.id),
        getOnboardingProgress(business.id),
        getUsageAlertStatus(business.id),
        getUnansweredQuestions(business.id)
      ]);
      setConversations(cList);
      setLeads(lList);
      setAnalytics(summary);
      setOnboarding(onb);
      setUsageAlert(uAlert);
      setUnanswered(uQuestions);
      setLoading(false);
    }
    loadData();
  }, [business.id]);

  const handleAddUnansweredToKB = async (qId: string) => {
    if (!answerDraft.trim()) return;
    await convertUnansweredQuestionToKnowledge(qId, answerDraft);
    setAnswerDraft('');
    setAnsweringId(null);
    setUnanswered(prev => prev.filter(q => q.id !== qId));
  };

  if (loading || !analytics) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading workspace dashboard...</p>
      </div>
    );
  }

  const voiceLimit = analytics.voiceUsage?.limitMinutes ?? 0;
  const voiceUsed = analytics.voiceUsage?.usedMinutes ?? 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Usage Limit Alert Banner if 50% or higher */}
      {usageAlert && usageAlert.alertLevel !== 'NONE' && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          usageAlert.alertLevel === '100%' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Usage Threshold Alert ({usageAlert.alertLevel}): </span>
              {usageAlert.alertMessage}
            </div>
          </div>
          <button 
            onClick={() => onNavigateTab('billing')}
            className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shrink-0"
          >
            Manage Plan
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-blue-700/50">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-200 text-xs font-semibold rounded-full border border-blue-400/30">
              Workspace: {business.name}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              business.agentStatus === 'PUBLISHED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                : business.agentStatus === 'TESTING'
                ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
            }`}>
              Status: {business.agentStatus || 'PUBLISHED'}
            </span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-200 text-xs font-medium rounded-full">
              Plan: {getPlanConfig(business.plan).name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back to {business.name}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Your 24/7 Voice AI Receptionist and Text Agent are live and ready to answer customer calls & chats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenDemoWidget}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Test Live Agent</span>
          </button>
          <button
            onClick={() => onNavigateTab('widget')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-all flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Embed Snippet</span>
          </button>
        </div>
      </div>

      {/* Onboarding Checklist Widget */}
      {onboarding && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-900 text-base">Client Onboarding Checklist</h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                  {onboarding.completed} / {onboarding.total} Completed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Complete these steps to fully optimize your AI Receptionist</p>
            </div>
            <div className="w-full sm:w-48 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: `${(onboarding.completed / onboarding.total) * 100}%` }} 
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(onboarding?.steps || []).map((st) => (
              <div 
                key={st.key || st.id}
                onClick={() => {
                  if (st.key === 'knowledge' || st.actionTab === 'knowledge') onNavigateTab('knowledge');
                  if (st.key === 'personality' || st.key === 'branding' || st.key === 'voice' || st.actionTab === 'agent-settings' || st.actionTab === 'voice-studio') onNavigateTab(st.actionTab || 'agent-settings');
                  if (st.key === 'installation' || st.actionTab === 'widget') onNavigateTab('widget');
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  (st.isCompleted ?? st.completed) 
                    ? 'bg-slate-50/80 border-slate-200 opacity-90' 
                    : 'bg-blue-50/30 border-blue-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{st.title}</span>
                  {(st.isCompleted ?? st.completed) ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{st.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric Cards Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Conversations */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Chats</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.totalConversations}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18% this week</span>
          </div>
        </div>

        {/* Card 2: Voice AI Call Minutes */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Voice AI Minutes</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-900">{voiceUsed}m</div>
          <div className="text-[11px] text-indigo-600 font-bold mt-1.5">
            {voiceUsed} / {voiceLimit} included mins
          </div>
        </div>

        {/* Card 3: AI Resolved */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Resolved</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.aiResolvedCount}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1.5">
            0% Hallucination
          </div>
        </div>

        {/* Card 4: Human Handoffs */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team Handoffs</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.humanHandoffCount}</div>
          <div className="text-[11px] text-amber-600 font-bold mt-1.5">
            Human escalation
          </div>
        </div>

        {/* Card 5: Leads Captured */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Leads Captured</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-2xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.leadsCapturedCount}</div>
          <div className="text-[11px] text-purple-600 font-bold mt-1.5">
            High intent contacts
          </div>
        </div>

        {/* Card 6: AI Resolution Rate */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Success</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600">{analytics.aiResolutionRate}%</div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full mt-2.5 overflow-hidden p-0.5 border border-slate-200/60">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all" 
              style={{ width: `${analytics.aiResolutionRate}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Conversations + Activity Chart */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Conversations */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-slate-900">Recent Customer Conversations</h2>
              <p className="text-xs text-slate-500">Live chat interactions recorded by your AI Receptionist</p>
            </div>
            <button
              onClick={() => onNavigateTab('conversations')}
              className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {(conversations || []).slice(0, 4).map((conv) => (
              <div 
                key={conv.id}
                onClick={() => onNavigateTab('conversations')}
                className="p-4 border border-slate-200/70 hover:border-blue-300 rounded-xl flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {conv.customerName ? conv.customerName.charAt(0) : 'C'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <span>{conv.customerName || 'Anonymous Visitor'}</span>
                      {conv.leadCaptured && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full">
                          Lead Captured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {conv.messages?.[conv.messages.length - 1]?.text || 'No messages'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                    conv.status === 'RESOLVED' 
                      ? 'bg-emerald-100 text-emerald-800'
                      : conv.status === 'HUMAN_REQUIRED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {(conv.status || 'OPEN').replace('_', ' ')}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Unanswered Questions 1-Click Knowledge Base Improvement Loop */}
          {(unanswered || []).length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Questions AI Couldn't Answer</h3>
                </div>
                <span className="text-[11px] text-slate-500">1-click addition to Knowledge Base</span>
              </div>

              <div className="space-y-3">
                {(unanswered || []).map((uq) => (
                  <div key={uq.id} className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <div className="text-xs font-bold text-slate-900">"{uq.question}"</div>
                        <div className="text-[10px] text-amber-700 font-medium">Asked {uq.count || 1} times • Reason: {uq.reason || 'Not in KB'}</div>
                      </div>
                      {answeringId !== uq.id ? (
                        <button
                          onClick={() => { setAnsweringId(uq.id); setAnswerDraft(''); }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shrink-0"
                        >
                          + Teach AI
                        </button>
                      ) : (
                        <button
                          onClick={() => setAnsweringId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg shrink-0"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {answeringId === uq.id && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={answerDraft}
                          onChange={(e) => setAnswerDraft(e.target.value)}
                          placeholder="Type authoritative answer for this question..."
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          rows={2}
                        />
                        <button
                          onClick={() => handleAddUnansweredToKB(uq.id)}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          Save & Add to Knowledge Base
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Quick Actions & Top Questions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm mb-2">Quick Workspace Actions</h3>
            
            <button
              onClick={() => onNavigateTab('knowledge')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Add Knowledge FAQ</div>
                <div className="text-[11px] text-slate-500">Train AI on new courses or prices</div>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('agent-settings')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg group-hover:scale-110 transition-transform">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Customize AI Receptionist</div>
                <div className="text-[11px] text-slate-500">Change name, welcome text & tone</div>
              </div>
            </button>
          </div>

          {/* Top Asked Questions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Top Customer Questions</h3>
            <div className="space-y-2.5">
              {(analytics.topQuestions || []).map((q, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-700 font-medium truncate max-w-[200px]">{q.question}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-full text-[10px]">
                    {q.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
