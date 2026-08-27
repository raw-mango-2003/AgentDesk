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
  Globe 
} from 'lucide-react';
import { Business, AgentTone } from '../types';
import { updateBusinessSettings } from '../lib/dbService';

interface AgentSettingsDashboardProps {
  business: Business;
  onUpdateBusiness: (updated: Business) => void;
}

export const AgentSettingsDashboard: React.FC<AgentSettingsDashboardProps> = ({
  business,
  onUpdateBusiness
}) => {
  const [agentName, setAgentName] = useState(business.agentSettings?.agentName || `${business.name} AI Assistant`);
  const [welcomeMessage, setWelcomeMessage] = useState(business.agentSettings?.welcomeMessage || `Hi 👋 Welcome to ${business.name}. How can I help you today?`);
  const [description, setDescription] = useState(business.description || '');
  const [tone, setTone] = useState<AgentTone>(business.agentSettings?.tone || 'Friendly');
  const [primaryColor, setPrimaryColor] = useState(business.primaryColor || '#2563eb');
  const [voice, setVoice] = useState(business.voice || 'Puck');
  const [voiceGreeting, setVoiceGreeting] = useState(business.voiceGreeting || `Hello! I am ${business.name} AI receptionist. How can I assist you?`);
  const [questions, setQuestions] = useState<string[]>(
    business.agentSettings?.suggestedQuestions || [
      'What courses do you offer?',
      'How much is Data Analytics?',
      'What are the class timings?'
    ]
  );
  const [newQuestion, setNewQuestion] = useState('');
  const [saved, setSaved] = useState(false);

  // Sync state whenever the active business changes (e.g., workspace switched in header)
  useEffect(() => {
    setAgentName(business.agentSettings?.agentName || `${business.name} AI Assistant`);
    setWelcomeMessage(business.agentSettings?.welcomeMessage || `Hi 👋 Welcome to ${business.name}. How can I help you today?`);
    setDescription(business.description || '');
    setTone(business.agentSettings?.tone || 'Friendly');
    setPrimaryColor(business.primaryColor || '#2563eb');
    setVoice(business.voice || 'Puck');
    setVoiceGreeting(business.voiceGreeting || `Hello! I am ${business.name} AI receptionist. How can I assist you?`);
    setQuestions(
      business.agentSettings?.suggestedQuestions || [
        'What courses do you offer?',
        'What are your tuition fees?',
        'What are the class timings?'
      ]
    );
    setSaved(false);
  }, [business.id, business.name, business.voice, business.voiceGreeting, business.agentSettings, business.primaryColor]);

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, newQuestion.trim()]);
    setNewQuestion('');
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings = {
      ...business,
      description,
      primaryColor,
      voice,
      voiceGreeting,
      agentSettings: {
        ...business.agentSettings,
        agentName,
        welcomeMessage,
        businessDescription: description,
        tone,
        primaryColor,
        secondaryColor: primaryColor,
        suggestedQuestions: questions
      }
    };

    await updateBusinessSettings(business.id, updatedSettings);
    onUpdateBusiness(updatedSettings);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            AI Receptionist Customization
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure agent identity, voice persona, brand colors, and greeting chips for <span className="font-semibold text-slate-700">{business.name}</span>.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-all flex items-center gap-2 w-fit"
        >
          {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{saved ? 'Settings Saved!' : 'Save Agent Config'}</span>
        </button>
      </div>

      {/* Bento Grid Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bento Box 1: Agent Identity & Greeting (2 cols) */}
        <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Agent Identity & Greeting</h3>
              <p className="text-[11px] text-slate-500">Define what visitors see when opening your website widget</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AI Receptionist Name *
              </label>
              <input
                type="text"
                required
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="e.g. Nova AI Assistant"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Conversational Tone
              </label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value as AgentTone)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="Friendly">Friendly & Welcoming</option>
                <option value="Professional">Professional & Corporate</option>
                <option value="Concise">Concise & Direct</option>
                <option value="Warm">Warm & Empathetic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Welcome Chat Greeting *
            </label>
            <textarea
              rows={2}
              required
              value={welcomeMessage}
              onChange={e => setWelcomeMessage(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Overview / Operating Guardrails
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your business scope to give the AI context..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Bento Box 2: Branding & Appearance (1 col) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Brand Colors</h3>
              <p className="text-[11px] text-slate-500">Match website design</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Primary Brand Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Theme Presets
            </span>
            <div className="flex items-center gap-2">
              {['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0284c7'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPrimaryColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    primaryColor.toLowerCase() === c.toLowerCase() ? 'scale-110 border-slate-900 shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Widget Preview Mini-Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Widget Button Preview</span>
            <button
              type="button"
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 text-white text-xs font-semibold rounded-full shadow-md flex items-center justify-center gap-2 mx-auto"
            >
              <Bot className="w-4 h-4" />
              <span>Chat with {agentName}</span>
            </button>
          </div>
        </div>

        {/* Bento Box 3: Suggested Quick Questions (2 cols) */}
        <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Suggested Quick Prompt Chips</h3>
              <p className="text-[11px] text-slate-500">Preset questions shown to first-time website visitors</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. What are your opening hours?"
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddQuestion())}
              className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl shadow"
            >
              Add Chip
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {questions.map((q, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-full font-medium"
              >
                <span>{q}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(idx)}
                  className="text-slate-400 hover:text-rose-600 font-bold text-sm"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Bento Box 4: Voice Receptionist Settings (1 col) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Voice Receptionist</h3>
              <p className="text-[11px] text-slate-500">Gemini realtime speech persona</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Synthesizer Voice Persona
            </label>
            <select
              value={voice}
              onChange={e => setVoice(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            >
              <option value="Puck">Puck (Energetic Male - Upbeat & Friendly)</option>
              <option value="Fenrir">Fenrir (Clear Male - Focused & Direct)</option>
              <option value="Charon">Charon (Deep Male - Professional & Authoritative)</option>
              <option value="Aoede">Aoede (Confident Female - Executive & Crisp)</option>
              <option value="Kore">Kore (Warm Female - Calm & Empathetic)</option>
              <option value="Leda">Leda (Gentle Female - Supportive & Smooth)</option>
              <option value="Zephyr">Zephyr (Natural Male - Conversational)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Voice Greeting
            </label>
            <textarea
              rows={2}
              value={voiceGreeting}
              onChange={e => setVoiceGreeting(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
