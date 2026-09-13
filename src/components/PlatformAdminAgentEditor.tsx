import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Palette, 
  MessageSquare, 
  Mic, 
  Save, 
  Check, 
  HelpCircle, 
  Sliders, 
  Globe, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Send, 
  UserCheck, 
  SlidersHorizontal,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Business, AIAgent, KnowledgeItem, AgentTone } from '../types';
import { 
  getAgentById, 
  saveAgent, 
  getBusinessById, 
  saveBusiness, 
  getKnowledgeDocs, 
  saveKnowledgeDoc, 
  deleteKnowledgeDoc, 
  addAuditLog 
} from '../lib/dbService';
import { 
  PLATFORM_ADMIN_TENANT_ID, 
  PLATFORM_ADMIN_AGENT_ID, 
  PLATFORM_ADMIN_BUSINESS, 
  PLATFORM_ADMIN_AGENT,
  PLATFORM_ADMIN_KNOWLEDGE_ITEMS
} from '../data/platformAdminData';

interface PlatformAdminAgentEditorProps {
  onUpdated?: () => void;
}

export const PlatformAdminAgentEditor: React.FC<PlatformAdminAgentEditorProps> = ({ onUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'business' | 'instructions' | 'knowledge' | 'qualification' | 'tester'>('identity');
  
  // Loading & Save State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Agent State
  const [agentId, setAgentId] = useState(PLATFORM_ADMIN_AGENT_ID);
  const [agentName, setAgentName] = useState(PLATFORM_ADMIN_AGENT.name);
  const [agentRole, setAgentRole] = useState(PLATFORM_ADMIN_AGENT.role || 'Platform AI Operations Assistant');
  const [tone, setTone] = useState<AgentTone>(PLATFORM_ADMIN_AGENT.tone || 'Professional');
  const [welcomeMessage, setWelcomeMessage] = useState(PLATFORM_ADMIN_AGENT.welcomeMessage);
  const [customInstructions, setCustomInstructions] = useState(PLATFORM_ADMIN_AGENT.customInstructions || '');
  const [primaryColor, setPrimaryColor] = useState(PLATFORM_ADMIN_AGENT.primaryColor || '#7c3aed');
  const [secondaryColor, setSecondaryColor] = useState(PLATFORM_ADMIN_AGENT.secondaryColor || '#4c1d95');
  const [voice, setVoice] = useState(PLATFORM_ADMIN_AGENT.voice || 'Aoede');
  const [voiceGreeting, setVoiceGreeting] = useState(PLATFORM_ADMIN_AGENT.voiceGreeting || '');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(PLATFORM_ADMIN_AGENT.suggestedQuestions || []);
  const [newQuestion, setNewQuestion] = useState('');

  // Business / Platform State
  const [platformName, setPlatformName] = useState(PLATFORM_ADMIN_BUSINESS.name);
  const [industry, setIndustry] = useState(PLATFORM_ADMIN_BUSINESS.industry);
  const [website, setWebsite] = useState(PLATFORM_ADMIN_BUSINESS.website || '');
  const [supportEmail, setSupportEmail] = useState(PLATFORM_ADMIN_BUSINESS.supportEmail || '');
  const [phone, setPhone] = useState(PLATFORM_ADMIN_BUSINESS.phone || '+1 (800) 555-AGENT');
  const [address, setAddress] = useState('100 Innovation Way, Suite 400, San Francisco, CA 94105');
  const [businessHours, setBusinessHours] = useState('24/7 Automated AI Support • Human Operations Mon-Fri 8am-8pm EST');
  const [platformDescription, setPlatformDescription] = useState(PLATFORM_ADMIN_BUSINESS.description || '');

  // Lead Qualification & Handoff State
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(PLATFORM_ADMIN_AGENT.leadCaptureEnabled ?? true);
  const [humanHandoffEnabled, setHumanHandoffEnabled] = useState(PLATFORM_ADMIN_AGENT.humanHandoffEnabled ?? true);
  const [minQualificationScore, setMinQualificationScore] = useState(PLATFORM_ADMIN_AGENT.minQualificationScore || 70);
  const [qualificationRules, setQualificationRules] = useState(PLATFORM_ADMIN_AGENT.qualificationRules || []);
  const [newRuleQuestion, setNewRuleQuestion] = useState('');
  const [newRuleField, setNewRuleField] = useState('');
  const [newRuleScore, setNewRuleScore] = useState(30);

  // Knowledge Base State
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [showAddKnowledgeModal, setShowAddKnowledgeModal] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [kTitle, setKTitle] = useState('');
  const [kCategory, setKCategory] = useState('General');
  const [kType, setKType] = useState<KnowledgeItem['type']>('faq');
  const [kContent, setKContent] = useState('');
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  // Live Chat Tester State
  const [testMessages, setTestMessages] = useState<Array<{ id: string; sender: 'user' | 'agent'; text: string; timestamp: string }>>([
    {
      id: 'init-msg',
      sender: 'agent',
      text: PLATFORM_ADMIN_AGENT.welcomeMessage,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputTestMessage, setInputTestMessage] = useState('');
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);

  // Load Data
  const loadPlatformAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Agent
      const storedAgent = await getAgentById(PLATFORM_ADMIN_AGENT_ID);
      const activeAgent = storedAgent || PLATFORM_ADMIN_AGENT;
      
      setAgentId(activeAgent.id);
      setAgentName(activeAgent.name || PLATFORM_ADMIN_AGENT.name);
      setAgentRole(activeAgent.role || 'Platform AI Operations Assistant');
      setTone(activeAgent.tone || 'Professional');
      setWelcomeMessage(activeAgent.welcomeMessage || PLATFORM_ADMIN_AGENT.welcomeMessage);
      setCustomInstructions(activeAgent.customInstructions || activeAgent.systemInstructions || PLATFORM_ADMIN_AGENT.customInstructions || '');
      setPrimaryColor(activeAgent.primaryColor || '#7c3aed');
      setSecondaryColor(activeAgent.secondaryColor || '#4c1d95');
      setVoice(activeAgent.voice || 'Aoede');
      setVoiceGreeting(activeAgent.voiceGreeting || PLATFORM_ADMIN_AGENT.voiceGreeting || '');
      setSuggestedQuestions(activeAgent.suggestedQuestions || PLATFORM_ADMIN_AGENT.suggestedQuestions || []);
      setLeadCaptureEnabled(activeAgent.leadCaptureEnabled ?? true);
      setHumanHandoffEnabled(activeAgent.humanHandoffEnabled ?? true);
      setMinQualificationScore(activeAgent.minQualificationScore || 70);
      setQualificationRules(activeAgent.qualificationRules || PLATFORM_ADMIN_AGENT.qualificationRules || []);

      // 2. Fetch Business
      const storedBiz = await getBusinessById(PLATFORM_ADMIN_TENANT_ID);
      const activeBiz = storedBiz || PLATFORM_ADMIN_BUSINESS;

      setPlatformName(activeBiz.name || PLATFORM_ADMIN_BUSINESS.name);
      setIndustry(activeBiz.industry || PLATFORM_ADMIN_BUSINESS.industry);
      setWebsite(activeBiz.website || PLATFORM_ADMIN_BUSINESS.website || '');
      setSupportEmail(activeBiz.supportEmail || PLATFORM_ADMIN_BUSINESS.supportEmail || '');
      setPhone(activeBiz.phone || '+1 (800) 555-AGENT');
      setPlatformDescription(activeBiz.description || PLATFORM_ADMIN_BUSINESS.description || '');

      // 3. Fetch Knowledge Base for Platform
      const kDocs = await getKnowledgeDocs(PLATFORM_ADMIN_TENANT_ID);
      setKnowledgeItems(kDocs.length > 0 ? kDocs : PLATFORM_ADMIN_KNOWLEDGE_ITEMS);

      // Reset tester initial message
      setTestMessages([
        {
          id: `init-${Date.now()}`,
          sender: 'agent',
          text: activeAgent.welcomeMessage || PLATFORM_ADMIN_AGENT.welcomeMessage,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Error loading platform admin agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformAdminData();
  }, []);

  // Suggested Questions helpers
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setSuggestedQuestions([...suggestedQuestions, newQuestion.trim()]);
    setNewQuestion('');
  };

  const handleRemoveQuestion = (idx: number) => {
    setSuggestedQuestions(suggestedQuestions.filter((_, i) => i !== idx));
  };

  // Qualification Rules helpers
  const handleAddQualificationRule = () => {
    if (!newRuleQuestion.trim()) return;
    const newRule = {
      id: `rule-${Date.now()}`,
      question: newRuleQuestion.trim(),
      field: newRuleField.trim() || `field_${Date.now()}`,
      required: true,
      scoreWeight: newRuleScore
    };
    setQualificationRules([...qualificationRules, newRule]);
    setNewRuleQuestion('');
    setNewRuleField('');
    setNewRuleScore(30);
  };

  const handleRemoveQualificationRule = (idx: number) => {
    setQualificationRules(qualificationRules.filter((_, i) => i !== idx));
  };

  // Knowledge Item CRUD
  const handleOpenAddKnowledge = () => {
    setEditingKnowledgeId(null);
    setKTitle('');
    setKCategory('General');
    setKType('faq');
    setKContent('');
    setShowAddKnowledgeModal(true);
  };

  const handleOpenEditKnowledge = (item: KnowledgeItem) => {
    setEditingKnowledgeId(item.id);
    setKTitle(item.title);
    setKCategory(item.category || 'General');
    setKType(item.type || 'faq');
    setKContent(item.content);
    setShowAddKnowledgeModal(true);
  };

  const handleSaveKnowledgeItem = async () => {
    if (!kTitle.trim() || !kContent.trim()) {
      alert('Please fill out both Title and Content.');
      return;
    }
    setIsSavingKnowledge(true);
    try {
      const now = new Date().toISOString();
      const itemToSave: KnowledgeItem = {
        id: editingKnowledgeId || `k-platform-${Date.now()}`,
        tenant_id: PLATFORM_ADMIN_TENANT_ID,
        tenantId: PLATFORM_ADMIN_TENANT_ID,
        businessId: PLATFORM_ADMIN_TENANT_ID,
        title: kTitle.trim(),
        category: kCategory.trim(),
        type: kType,
        content: kContent.trim(),
        status: 'active',
        active: true,
        createdAt: now,
        updatedAt: now
      };

      // 1. Save in local dbService
      await saveKnowledgeDoc(itemToSave);

      // 2. Save in backend server.ts endpoint
      try {
        await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemToSave)
        });
      } catch (e) {
        console.warn('Server knowledge sync warning:', e);
      }

      // Refresh list
      const updatedList = await getKnowledgeDocs(PLATFORM_ADMIN_TENANT_ID);
      setKnowledgeItems(updatedList);
      setShowAddKnowledgeModal(false);
    } catch (err) {
      console.error('Failed to save knowledge item:', err);
      alert('Failed to save knowledge item.');
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const handleDeleteKnowledgeItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base item?')) return;
    try {
      // 1. Delete in dbService
      await deleteKnowledgeDoc(PLATFORM_ADMIN_TENANT_ID, id);

      // 2. Delete on server
      try {
        await fetch(`/api/knowledge/${PLATFORM_ADMIN_TENANT_ID}/${id}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.warn('Server delete knowledge warning:', e);
      }

      const updatedList = await getKnowledgeDocs(PLATFORM_ADMIN_TENANT_ID);
      setKnowledgeItems(updatedList);
    } catch (err) {
      console.error('Failed to delete knowledge item:', err);
    }
  };

  // Primary Save Changes Function
  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const now = new Date().toISOString();

      // 1. Form updated Agent object
      const updatedAgent: AIAgent = {
        id: PLATFORM_ADMIN_AGENT_ID,
        tenantId: PLATFORM_ADMIN_TENANT_ID,
        name: agentName.trim(),
        role: agentRole.trim(),
        tone,
        welcomeMessage: welcomeMessage.trim(),
        customInstructions: customInstructions.trim(),
        systemInstructions: customInstructions.trim(),
        primaryColor,
        secondaryColor,
        voice,
        voiceGreeting: voiceGreeting.trim(),
        suggestedQuestions,
        leadCaptureEnabled,
        humanHandoffEnabled,
        minQualificationScore,
        qualificationRules,
        ownershipType: 'PLATFORM',
        status: 'active',
        isDemo: false,
        createdAt: PLATFORM_ADMIN_AGENT.createdAt || now,
        updatedAt: now
      };

      // 2. Form updated Business object
      const updatedBusiness: Business = {
        id: PLATFORM_ADMIN_TENANT_ID,
        tenantId: PLATFORM_ADMIN_TENANT_ID,
        tenant_id: PLATFORM_ADMIN_TENANT_ID,
        tenantType: 'platform',
        isDemo: false,
        primaryAgentId: PLATFORM_ADMIN_AGENT_ID,
        name: platformName.trim(),
        industry: industry.trim(),
        description: platformDescription.trim(),
        website: website.trim(),
        supportEmail: supportEmail.trim(),
        phone: phone.trim(),
        country: 'US',
        currency: 'USD',
        primaryColor,
        secondaryColor,
        voice,
        voiceGreeting: voiceGreeting.trim(),
        agentSettings: {
          agentName: agentName.trim(),
          welcomeMessage: welcomeMessage.trim(),
          businessDescription: platformDescription.trim(),
          tone,
          primaryColor,
          secondaryColor,
          suggestedQuestions,
          systemSecurityInstructions: customInstructions.trim(),
          humanHandoffEnabled,
          leadCaptureEnabled,
          minQualificationScore,
          qualificationRules
        },
        plan: 'ENTERPRISE',
        status: 'active',
        updatedAt: now
      };

      // 3. Persist to Local DB / State
      await saveAgent(updatedAgent);
      await saveBusiness(updatedBusiness);

      // 4. Persist to Backend Server Memory & Registry
      try {
        await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAgent)
        });
      } catch (err) {
        console.warn('Backend API /api/agents sync note:', err);
      }

      try {
        await fetch('/api/admin/businesses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedBusiness)
        });
      } catch (err) {
        console.warn('Backend API /api/admin/businesses sync note:', err);
      }

      // 5. Audit Log
      await addAuditLog({
        businessId: PLATFORM_ADMIN_TENANT_ID,
        actorEmail: 'admin',
        action: 'UPDATE_PLATFORM_ADMIN_AGENT',
        entity: 'AgentDesk Super Admin Agent',
        details: `Updated Platform Admin Agent "${agentName}" settings, instructions, personality, and platform metadata.`
      });

      setSaveSuccess(true);
      if (onUpdated) onUpdated();
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('Error saving platform admin agent settings:', err);
      setErrorMessage(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Message Sending
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTestMessage.trim() || isSendingTestMessage) return;

    const userText = inputTestMessage.trim();
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user' as const,
      text: userText,
      timestamp: new Date().toISOString()
    };

    setTestMessages(prev => [...prev, userMsg]);
    setInputTestMessage('');
    setIsSendingTestMessage(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: `conv-platform-test-${Date.now()}`,
          agentId: PLATFORM_ADMIN_AGENT_ID,
          tenantId: PLATFORM_ADMIN_TENANT_ID,
          businessId: PLATFORM_ADMIN_TENANT_ID,
          message: userText,
          conversationHistory: [...testMessages, userMsg],
          knowledgeBase: knowledgeItems
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTestMessages(prev => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            sender: 'agent',
            text: data.reply || data.response || 'I am your AgentDesk Platform Admin AI Assistant. How can I help you manage your platform?',
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        throw new Error('Chat API returned error');
      }
    } catch (err) {
      console.error('Error in live agent tester:', err);
      setTestMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: `[Agent Response]: As the AgentDesk Platform AI, I am fully configured with your customized settings. (Prompt received: "${userText}")`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSendingTestMessage(false);
    }
  };

  const handleResetTestChat = () => {
    setTestMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'agent',
        text: welcomeMessage || 'Hi 👋 I am the AgentDesk Platform AI. How can I assist you with platform administration today?',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mr-2" />
        <span className="text-sm font-semibold text-slate-700">Loading Platform Admin Agent Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner & Save Action Bar */}
      <div className="bg-white border border-purple-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{agentName}</h2>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-full border border-purple-200">
                Platform Admin Agent
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono rounded">
                ID: {agentId}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure and persist your own official AgentDesk platform chatbot, tone, instructions, knowledge base, and lead qualification rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadPlatformAdminData}
            title="Reload from Storage"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload</span>
          </button>

          <button
            type="button"
            id="save-platform-agent-btn"
            onClick={() => handleSaveChanges()}
            disabled={isSaving}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SAVE CHANGES</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Notification */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold">Changes saved successfully!</p>
            <p className="text-emerald-700 text-[11px] font-normal">
              Your Platform Admin Agent settings, business profile, instructions, and rules have been permanently persisted.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto gap-1">
        <button
          onClick={() => setActiveSubTab('identity')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'identity' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-4 h-4 text-purple-600" />
          <span>Identity & Personality</span>
        </button>

        <button
          onClick={() => setActiveSubTab('business')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'business' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Platform & Business Profile</span>
        </button>

        <button
          onClick={() => setActiveSubTab('instructions')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'instructions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>System Instructions & Behavior</span>
        </button>

        <button
          onClick={() => setActiveSubTab('knowledge')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'knowledge' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>Knowledge Base & FAQs ({knowledgeItems.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('qualification')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'qualification' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <span>Lead Scoring & Qualification</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tester')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'tester' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-rose-600" />
          <span>Live Interactive Agent Tester</span>
        </button>
      </div>

      {/* Tab 1: Identity & Personality */}
      {activeSubTab === 'identity' && (
        <div className="grid md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Bot className="w-4 h-4 text-purple-600" />
              <span>Agent Identity & Voice</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Display Name</label>
              <input
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                placeholder="e.g. AgentDesk AI Concierge"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Role / Title</label>
              <input
                type="text"
                value={agentRole}
                onChange={e => setAgentRole(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                placeholder="e.g. Platform Operations & Admissions Assistant"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tone & Personality</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value as AgentTone)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none bg-white"
              >
                <option value="Professional">Professional (Crisp, authoritative, enterprise)</option>
                <option value="Friendly">Friendly (Warm, welcoming, conversational)</option>
                <option value="Empathetic">Empathetic (Patient, reassuring, supportive)</option>
                <option value="Persuasive">Persuasive (Consultative, high-converting, value-driven)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voice Model (Realtime Voice)</label>
              <select
                value={voice}
                onChange={e => setVoice(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none bg-white"
              >
                <option value="Aoede">Aoede (Brisk & Polished Female Voice)</option>
                <option value="Puck">Puck (Energetic & Professional Male Voice)</option>
                <option value="Charon">Charon (Deep & Executive Male Voice)</option>
                <option value="Kore">Kore (Warm & Reassuring Female Voice)</option>
                <option value="Fenrir">Fenrir (Dynamic Tech Voice)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voice Call Opening Greeting</label>
              <input
                type="text"
                value={voiceGreeting}
                onChange={e => setVoiceGreeting(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                placeholder="e.g. Hello! Welcome to AgentDesk. How can I assist you today?"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Palette className="w-4 h-4 text-purple-600" />
              <span>Theme Colors & Welcome Experience</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-full text-xs p-2 font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-full text-xs p-2 font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chat Welcome Message</label>
              <textarea
                rows={3}
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                placeholder="The initial message sent when visitors open your Platform chatbot."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Suggested Quick-Click Questions</label>
              <div className="space-y-2 mb-2">
                {suggestedQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                    <span className="text-slate-700">{q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddQuestion())}
                  placeholder="Add a new suggested prompt..."
                  className="flex-1 text-xs p-2 border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Business & Platform Profile */}
      {activeSubTab === 'business' && (
        <div className="grid md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Platform Core Organization Info</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry / Domain</label>
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Website URL</label>
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Operations Description</label>
              <textarea
                rows={4}
                value={platformDescription}
                onChange={e => setPlatformDescription(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                placeholder="Describe the platform services, multi-tenant architecture, and features your AI should explain."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Contact Details & Operating Schedule</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Support / Admin Contact Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Support Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headquarters / Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Hours & Availability</label>
              <input
                type="text"
                value={businessHours}
                onChange={e => setBusinessHours(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: System Instructions & Behavior */}
      {activeSubTab === 'instructions' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Platform Admin Agent System Instructions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These core instructions govern your AI chatbot's persona, responses, security rules, and platform context.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Master System Instructions
            </label>
            <textarea
              rows={12}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none leading-relaxed"
              placeholder="Enter comprehensive instructions for the Platform Admin Agent..."
            />
          </div>

          <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-4 text-xs text-purple-900 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Strict Isolation Note:</span> This agent represents the Platform Administration context ONLY. It is completely isolated from customer tenants and will answer questions about AgentDesk platform administration, onboarding, and platform capabilities.
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Knowledge Base & FAQs */}
      {activeSubTab === 'knowledge' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>Platform Knowledge Base & FAQs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Articles and FAQs stored specifically for the Platform Admin Agent ({knowledgeItems.length} items registered).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddKnowledge}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Add Knowledge Item</span>
            </button>
          </div>

          {knowledgeItems.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
              No knowledge items found for the Platform Admin. Click "Add Knowledge Item" to create one.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {knowledgeItems.map((k) => (
                <div key={k.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{k.title}</h4>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-semibold rounded-full capitalize shrink-0">
                        {k.category || 'General'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line mb-3">
                      {k.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span className="font-mono text-[10px]">{k.id}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditKnowledge(k)}
                        className="text-slate-600 hover:text-purple-600 font-semibold p-1 flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKnowledgeItem(k.id)}
                        className="text-slate-400 hover:text-rose-600 font-semibold p-1 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Lead Scoring & Qualification */}
      {activeSubTab === 'qualification' && (
        <div className="grid md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Lead Qualification & Handoff Settings</span>
            </h3>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-800">Lead Capture Mode</span>
                <p className="text-[11px] text-slate-500">Automatically prompt visitors for name, email, and requirements.</p>
              </div>
              <input
                type="checkbox"
                checked={leadCaptureEnabled}
                onChange={e => setLeadCaptureEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-800">Human Handoff Request Support</span>
                <p className="text-[11px] text-slate-500">Allow visitors to request escalation to human sales engineers.</p>
              </div>
              <input
                type="checkbox"
                checked={humanHandoffEnabled}
                onChange={e => setHumanHandoffEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Qualification Score (0-100): <span className="text-purple-600 font-bold">{minQualificationScore}</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={minQualificationScore}
                onChange={e => setMinQualificationScore(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Qualification Questions & Weights</span>
            </h3>

            <div className="space-y-2 mb-3">
              {qualificationRules.map((rule, idx) => (
                <div key={rule.id || idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{rule.question}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span>Field: <code className="text-purple-700">{rule.field}</code></span>
                      <span>•</span>
                      <span>Weight: <span className="font-bold text-emerald-700">+{rule.scoreWeight} pts</span></span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQualificationRule(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2 text-xs">
              <span className="font-bold text-slate-800">Add Qualification Question</span>
              <input
                type="text"
                placeholder="e.g. How many client tenants do you anticipate onboarding?"
                value={newRuleQuestion}
                onChange={e => setNewRuleQuestion(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Field (e.g. estimated_tenants)"
                  value={newRuleField}
                  onChange={e => setNewRuleField(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Score weight (e.g. 30)"
                  value={newRuleScore}
                  onChange={e => setNewRuleScore(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={handleAddQualificationRule}
                className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question Rule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Live Interactive Agent Tester */}
      {activeSubTab === 'tester' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{agentName} — Live Simulation Sandbox</h3>
                <p className="text-xs text-slate-500">
                  Direct test channel for the Platform Admin Agent with current settings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetTestChat}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="h-80 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            {testMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="text-[9px] opacity-60 block mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isSendingTestMessage && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none text-xs text-slate-500 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-ping" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendTestMessage} className="flex gap-2">
            <input
              type="text"
              value={inputTestMessage}
              onChange={e => setInputTestMessage(e.target.value)}
              placeholder="Test your platform admin agent's responses..."
              className="flex-1 text-xs p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSendingTestMessage || !inputTestMessage.trim()}
              className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Add / Edit Knowledge Modal */}
      {showAddKnowledgeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>{editingKnowledgeId ? 'Edit Knowledge Item' : 'Add Platform Knowledge Item'}</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title / Question</label>
              <input
                type="text"
                value={kTitle}
                onChange={e => setKTitle(e.target.value)}
                placeholder="e.g. How does multi-tenant isolation work on AgentDesk?"
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={kCategory}
                  onChange={e => setKCategory(e.target.value)}
                  placeholder="e.g. Architecture"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={kType}
                  onChange={e => setKType(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none bg-white"
                >
                  <option value="faq">FAQ</option>
                  <option value="doc">Platform Documentation</option>
                  <option value="snippet">Feature Snippet</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Content / Answer</label>
              <textarea
                rows={6}
                value={kContent}
                onChange={e => setKContent(e.target.value)}
                placeholder="Provide accurate, comprehensive information for your AI agent."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddKnowledgeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveKnowledgeItem}
                disabled={isSavingKnowledge}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSavingKnowledge ? 'Saving...' : 'Save Knowledge Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
