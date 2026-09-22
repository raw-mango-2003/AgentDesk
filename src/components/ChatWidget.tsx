import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  UserCheck, 
  Sparkles, 
  Mic, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Phone,
  Mail
} from 'lucide-react';
import { Business, Message, KnowledgeItem, Conversation, Lead, AIAgent } from '../types';
import { 
  DEMO_BUSINESS, 
  DEMO_KNOWLEDGE_ITEMS, 
  PUBLIC_AGENTDESK_DEMO_BUSINESS, 
  PUBLIC_AGENTDESK_DEMO_AGENT, 
  PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS,
  PUBLIC_DEMO_TENANT_ID,
  PUBLIC_DEMO_AGENT_ID 
} from '../data/demoBusiness';
const loadDbService = () => import('../lib/dbService');
const addLead = (...args: Parameters<Awaited<ReturnType<typeof loadDbService>>['addLead']>) => loadDbService().then(module => module.addLead(...args));
const saveConversation = (...args: Parameters<Awaited<ReturnType<typeof loadDbService>>['saveConversation']>) => loadDbService().then(module => module.saveConversation(...args));
const getKnowledgeItems = (...args: Parameters<Awaited<ReturnType<typeof loadDbService>>['getKnowledgeItems']>) => loadDbService().then(module => module.getKnowledgeItems(...args));
const resolveAgentAndTenant = (...args: Parameters<Awaited<ReturnType<typeof loadDbService>>['resolveAgentAndTenant']>) => loadDbService().then(module => module.resolveAgentAndTenant(...args));
const getAgentById = (...args: Parameters<Awaited<ReturnType<typeof loadDbService>>['getAgentById']>) => loadDbService().then(module => module.getAgentById(...args));

interface ChatWidgetProps {
  business?: Business;
  agent?: AIAgent;
  agentId?: string;
  tenantId?: string;
  knowledgeItems?: KnowledgeItem[];
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onToggle?: (open: boolean) => void;
  isEmbedded?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  business: initialBusiness,
  agent: initialAgent,
  agentId,
  tenantId,
  knowledgeItems: externalKnowledgeItems,
  isOpen: externalIsOpen,
  onOpen,
  onClose,
  onToggle,
  isEmbedded = false
}) => {
  const [resolvedBiz, setResolvedBiz] = useState<Business | undefined>(initialBusiness);
  const [resolvedAgent, setResolvedAgent] = useState<AIAgent | undefined>(initialAgent);

  useEffect(() => {
    // Public landing pages already provide the demo business and knowledge data.
    // Do not resolve the public agent/tenant over the network until the visitor
    // actually opens the widget. This keeps the landing page network-light.
    if (!isEmbedded && externalIsOpen === false) return;

    let cancelled = false;

    async function initContext() {
      if (agentId) {
        const { tenant, agent } = await resolveAgentAndTenant(agentId);
        if (cancelled) return;
        if (tenant) setResolvedBiz(tenant);
        if (agent) setResolvedAgent(agent);
      } else if (tenantId) {
        const { tenant, agent } = await resolveAgentAndTenant(tenantId);
        if (cancelled) return;
        if (tenant) setResolvedBiz(tenant);
        if (agent) setResolvedAgent(agent);
      } else if (initialBusiness) {
        setResolvedBiz(initialBusiness);
        if (initialBusiness.primaryAgentId) {
          const ag = await getAgentById(initialBusiness.primaryAgentId);
          if (!cancelled && ag) setResolvedAgent(ag);
        }
      }
    }

    initContext();
    return () => {
      cancelled = true;
    };
  }, [agentId, tenantId, initialBusiness?.id, externalIsOpen, isEmbedded]);

  const business = resolvedBiz || initialBusiness || PUBLIC_AGENTDESK_DEMO_BUSINESS;
  const [internalIsOpen, setInternalIsOpen] = useState(externalIsOpen ?? false);

  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setInternalIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  const isOpen = isEmbedded ? true : internalIsOpen;

  const handleOpenWidget = () => {
    setInternalIsOpen(true);
    if (onOpen) onOpen();
    if (onToggle) onToggle(true);
  };

  const handleCloseWidget = () => {
    setInternalIsOpen(false);
    if (onClose) onClose();
    if (onToggle) onToggle(false);
  };

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(
    externalKnowledgeItems && externalKnowledgeItems.length > 0 
      ? externalKnowledgeItems 
      : (business?.id === PUBLIC_DEMO_TENANT_ID ? PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS : [])
  );

  useEffect(() => {
    if (externalKnowledgeItems && externalKnowledgeItems.length > 0) {
      setKnowledgeItems(externalKnowledgeItems);
    } else if (business?.id) {
      getKnowledgeItems(business.id).then(items => {
        if (items && items.length > 0) {
          setKnowledgeItems(items);
        } else if (business.id === PUBLIC_DEMO_TENANT_ID) {
          setKnowledgeItems(PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS);
        }
      });
    }
  }, [business?.id, externalKnowledgeItems]);

  const [conversationId, setConversationId] = useState<string>(() => 
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );
  const [conversationState, setConversationState] = useState<any>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);

  const [sessionId, setSessionId] = useState<string>(`session-${business?.id || 'default'}-${Date.now()}`);
  const prevBusinessIdRef = useRef<string | undefined>(business?.id);

  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat');

  // Voice AI receptionist state
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'ended' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState<{ sender: 'user' | 'agent'; text: string; timestamp: string }[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const durationTimerRef = useRef<any>(null);
  const sessionStartRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isVoiceActiveRef = useRef<boolean>(false);
  const voiceStatusRef = useRef<string>('idle');
  const isMutedRef = useRef<boolean>(false);

  // Helper to update voiceStatus state and ref synchronously
  const updateVoiceStatus = (status: 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'ended' | 'error') => {
    voiceStatusRef.current = status;
    setVoiceStatus(status);
  };

  // Pre-load and cache browser voices for instantaneous persona switching
  const [cachedVoices, setCachedVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setCachedVoices(v);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Resolve tenant acoustic voice profile based on tenant configuration
  const getTenantVoiceProfile = (voicePersona: string = 'Puck') => {
    const persona = (voicePersona || 'Puck').trim();
    const voices = (cachedVoices.length > 0 ? cachedVoices : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []));

    const femaleVoiceRegex = /female|woman|samantha|victoria|zira|jenny|karen|moira|tessa|fiona|veena|susan|catherine|yuri|serena|ava|allison|helena/i;
    const maleVoiceRegex = /male|man|alex|david|daniel|george|guy|oliver|tom|fred|aaron|rishi|lee|bruce|james|junior/i;

    const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : voices;

    let selectedVoice: SpeechSynthesisVoice | null = null;
    let pitch = 1.0;
    let rate = 1.0;

    switch (persona) {
      case 'Aoede': // Confident Female (Executive, Crisp)
        pitch = 1.20;
        rate = 1.04;
        selectedVoice = pool.find(v => /samantha|victoria|jenny|zira|karen/i.test(v.name)) ||
                        pool.find(v => femaleVoiceRegex.test(v.name)) ||
                        pool[0] || null;
        break;

      case 'Kore': // Warm Female (Calm, Empathetic)
        pitch = 1.04;
        rate = 0.95;
        selectedVoice = pool.find(v => /tessa|samantha|moira|fiona|zira/i.test(v.name)) ||
                        pool.find(v => femaleVoiceRegex.test(v.name)) ||
                        pool[0] || null;
        break;

      case 'Leda': // Gentle Female (Supportive, Smooth)
        pitch = 1.12;
        rate = 0.94;
        selectedVoice = pool.find(v => /karen|samantha|victoria|ava/i.test(v.name)) ||
                        pool.find(v => femaleVoiceRegex.test(v.name)) ||
                        pool[0] || null;
        break;

      case 'Charon': // Deep Male (Professional, Authoritative)
        pitch = 0.78;
        rate = 0.92;
        selectedVoice = pool.find(v => /fred|david|daniel|alex|george/i.test(v.name)) ||
                        pool.find(v => maleVoiceRegex.test(v.name)) ||
                        pool[0] || null;
        break;

      case 'Fenrir': // Clear Male (Focused, Direct)
        pitch = 0.92;
        rate = 1.00;
        selectedVoice = pool.find(v => /david|daniel|oliver|tom|alex/i.test(v.name)) ||
                        pool.find(v => maleVoiceRegex.test(v.name)) ||
                        pool[0] || null;
        break;

      case 'Zephyr': // Natural Male (Conversational)
        pitch = 1.02;
        rate = 1.08;
        selectedVoice = pool.find(v => /alex|guy|daniel|george/i.test(v.name)) ||
                        pool.find(v => maleVoiceRegex.test(v.name)) ||
                        pool[0] || null;
        break;

      case 'Puck': // Energetic Male (Upbeat, Friendly)
      default:
        pitch = 1.18;
        rate = 1.06;
        selectedVoice = pool.find(v => /alex|david|guy|daniel|aaron/i.test(v.name)) ||
                        pool.find(v => maleVoiceRegex.test(v.name)) ||
                        pool[0] || null;
        break;
    }

    return { selectedVoice, pitch, rate };
  };

  // Keep isMutedRef in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Stop & cleanup active voice call session
  const stopVoiceCall = () => {
    isVoiceActiveRef.current = false;
    updateVoiceStatus('ended');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  useEffect(() => {
    const currentBizId = business?.id;

    async function loadKnowledge() {
      if (externalKnowledgeItems && externalKnowledgeItems.length > 0) {
        setKnowledgeItems(externalKnowledgeItems);
      } else if (currentBizId) {
        const items = await getKnowledgeItems(currentBizId);
        setKnowledgeItems(items);
      }
    }
    loadKnowledge();

    // Detect workspace / business ID change and reset all tenant chat AND voice state immediately
    if (prevBusinessIdRef.current !== currentBizId) {
      prevBusinessIdRef.current = currentBizId;

      // Kill any active voice session on business switch to prevent cross-tenant leak
      stopVoiceCall();
      setActiveTab('chat');
      setVoiceTranscript([]);
      setVoiceDuration(0);
      updateVoiceStatus('idle');

      setSessionId(`session-${currentBizId || 'default'}-${Date.now()}`);
      const freshConvId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setConversationId(freshConvId);
      setConversationState(null);

      const welcomeMsg = business?.agentSettings?.welcomeMessage || `Hi 👋 Welcome to ${business?.name || 'our business'}. How can I help you today?`;

      setMessages([
        {
          id: `m-welcome-${currentBizId}-${Date.now()}`,
          sender: 'agent',
          text: welcomeMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      setInput('');
      setIsTyping(false);
      setShowHandoffForm(false);
      setLeadName('');
      setLeadEmail('');
      setLeadPhone('');
      setLeadMessage('');
      setLeadSubmitted(false);
    }
  }, [business?.id, business?.name, business?.agentSettings?.welcomeMessage, externalKnowledgeItems]);

  // Clean up voice call when component unmounts
  useEffect(() => {
    return () => {
      stopVoiceCall();
    };
  }, []);

  // Continuous Speech Recognition listener loop for multi-turn conversation
  const startListening = () => {
    if (!isVoiceActiveRef.current) return;
    if (isMutedRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Voice AI] Browser SpeechRecognition not supported.');
      return;
    }

    // Safely reset previous instance before spinning up fresh turn listener
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (voiceStatusRef.current !== 'speaking') {
        updateVoiceStatus('listening');
      }
    };

    recognition.onresult = async (event: any) => {
      const transcriptText = event.results[0][0]?.transcript;
      if (!transcriptText || !transcriptText.trim()) return;

      // Handle user interruption: cancel AI speech output immediately if speaking
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      if (isMutedRef.current) return;

      setVoiceTranscript(prev => [
        ...prev,
        {
          sender: 'user',
          text: transcriptText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      updateVoiceStatus('connecting');

      // Check for human handoff request in user voice input
      const lowerText = transcriptText.toLowerCase();
      if (
        lowerText.includes('human') ||
        lowerText.includes('representative') ||
        lowerText.includes('support agent') ||
        lowerText.includes('real person') ||
        lowerText.includes('connect me')
      ) {
        setShowHandoffForm(true);
      }

      // Stream user spoken turn to backend over persistent WebSocket or HTTP fallback
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'spoken_text',
          text: transcriptText
        }));
      } else {
        try {
          const res = await fetch('/api/voice/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              transcript: transcriptText,
              businessId: business.id,
              knowledgeBase: knowledgeItems,
              conversationHistory: messages
            })
          });
          const data = await res.json();
          if (data.conversationState) setConversationState(data.conversationState);
          const reply = data.reply || "I didn't catch that. Could you repeat?";
          const isClosing = data.isClosing || false;

          setVoiceTranscript(prev => [
            ...prev,
            {
              sender: 'agent',
              text: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);

          speakText(reply, isClosing);
        } catch (e) {
          speakText("I am having trouble processing audio right now. Would you like to leave your contact number?");
          setShowHandoffForm(true);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Voice AI] Speech recognition error:', event.error);
      }
      // Re-arm listener automatically if call is still active
      if (isVoiceActiveRef.current && voiceStatusRef.current !== 'speaking') {
        setTimeout(() => {
          if (isVoiceActiveRef.current && voiceStatusRef.current !== 'speaking') {
            startListening();
          }
        }, 200);
      }
    };

    recognition.onend = () => {
      // Re-arm listener automatically when user finishes phrase or silent timeout occurs
      if (isVoiceActiveRef.current && voiceStatusRef.current !== 'speaking') {
        setTimeout(() => {
          if (isVoiceActiveRef.current && voiceStatusRef.current !== 'speaking') {
            startListening();
          }
        }, 150);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('[Voice AI] Error starting recognition:', e);
    }
  };

  // Speak AI text response using browser SpeechSynthesis with tenant-specific voice persona profile
  const speakText = (text: string, isClosing: boolean = false) => {
    if (!('speechSynthesis' in window)) {
      if (isVoiceActiveRef.current) {
        if (isClosing) {
          stopVoiceCall();
        } else {
          updateVoiceStatus('listening');
          startListening();
        }
      }
      return;
    }

    window.speechSynthesis.cancel();
    updateVoiceStatus('speaking');

    const { selectedVoice, pitch, rate } = getTenantVoiceProfile(business.voice || 'Puck');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const onSpeechEnd = () => {
      if (!isVoiceActiveRef.current) return;
      if (isClosing) {
        stopVoiceCall();
      } else {
        updateVoiceStatus('listening');
        // Session remains active! Automatically return to listening mode for next turn
        startListening();
      }
    };

    utterance.onend = onSpeechEnd;
    utterance.onerror = onSpeechEnd;

    window.speechSynthesis.speak(utterance);
  };

  // Voice AI call launcher
  const startVoiceCall = async () => {
    setVoiceError(null);
    isVoiceActiveRef.current = true;
    updateVoiceStatus('connecting');
    setVoiceTranscript([]);

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Establish WebSocket connection to backend Voice agent
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live-voice`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[Voice AI] WebSocket connected for business "${business.name}" (${business.id}) | Voice Persona: ${business.voice} | Conv ID: "${conversationId}"`);
        ws.send(JSON.stringify({
          type: 'init',
          conversationId,
          businessId: business.id,
          tenantId: business.tenantId || business.id,
          agentId: resolvedAgent?.id || agentId || business.primaryAgentId,
          knowledgeBase: knowledgeItems
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            updateVoiceStatus('connected');
            if (data.conversationState) setConversationState(data.conversationState);
            sessionStartRef.current = Date.now();

            durationTimerRef.current = setInterval(() => {
              setVoiceDuration(Math.round((Date.now() - sessionStartRef.current) / 1000));
            }, 1000);

            const assistantName = business.agentSettings?.agentName || `${business.name} AI Assistant`;
            const greetingText = data.voiceGreeting || business.voiceGreeting || `Hello! I am ${assistantName} for ${business.name}. How can I assist you today?`;
            speakText(greetingText);

            setVoiceTranscript([
              {
                sender: 'agent',
                text: greetingText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }

          if (data.type === 'response') {
            const agentReply = data.text;
            const isClosing = data.isClosing || false;
            if (data.conversationState) setConversationState(data.conversationState);

            setVoiceTranscript(prev => [
              ...prev,
              {
                sender: 'agent',
                text: agentReply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);

            speakText(agentReply, isClosing);
          }
        } catch (e) {
          console.error('[Voice AI] Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[Voice AI] WebSocket error, using browser speech fallback:', err);
        startLocalVoiceFallback();
      };

      ws.onclose = () => {
        console.log('[Voice AI] WebSocket connection closed.');
        if (isVoiceActiveRef.current) {
          updateVoiceStatus('error');
          setVoiceError('Voice connection lost. Click Reconnect Voice Call to resume.');
        }
      };

    } catch (err: any) {
      console.error('[Voice AI] Microphone access error:', err);
      isVoiceActiveRef.current = false;
      setVoiceError('Microphone permission required for voice calls. Please allow microphone access.');
      updateVoiceStatus('error');
    }
  };

  const startLocalVoiceFallback = () => {
    if (!isVoiceActiveRef.current) return;
    updateVoiceStatus('connected');
    sessionStartRef.current = Date.now();

    durationTimerRef.current = setInterval(() => {
      setVoiceDuration(Math.round((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);

    const assistantName = business.agentSettings?.agentName || `${business.name} AI Assistant`;
    const greetingText = business.voiceGreeting || `Hello! I am ${assistantName} for ${business.name}. How can I assist you today?`;
    setVoiceTranscript([
      {
        sender: 'agent',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    speakText(greetingText);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-welcome',
      sender: 'agent',
      text: business.agentSettings?.welcomeMessage || `Hi 👋 Welcome to ${business.name}. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    const welcome = business.agentSettings?.welcomeMessage || `Hi 👋 Welcome to ${business.name}. How can I help you today?`;
    setMessages([
      {
        id: `m-welcome-${business.id}`,
        sender: 'agent',
        text: welcome,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setShowHandoffForm(false);
    setLeadSubmitted(false);
  }, [business.id, business.agentSettings?.welcomeMessage]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHandoffForm, setShowHandoffForm] = useState(false);
  
  // Handoff lead form fields
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadMessage, setLeadMessage] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const primaryColor = business.primaryColor || '#2563eb';
  const suggestedQuestions = business.agentSettings?.suggestedQuestions || [
    'What is AgentDesk and how does it work?',
    'What features and integrations are included?',
    'What are the pricing tiers and limits?',
    'Can I deploy an AI sales agent on my website?'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, showHandoffForm]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      // Call server-side Gemini AI chat route
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          businessId: business.id,
          tenantId: business.tenantId || business.id,
          agentId: resolvedAgent?.id || agentId || business.primaryAgentId,
          message: queryText,
          conversationHistory: messages,
          recentMessages: messages,
          knowledgeBase: knowledgeItems,
          businessInfo: business
        })
      });

      const data = await res.json();
      setIsTyping(false);

      if (data.conversationState) {
        setConversationState(data.conversationState);
      }

      if (data.success && data.reply) {
        const agentMsg: Message = {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, agentMsg]);

        if (data.needsHumanHandoff) {
          setShowHandoffForm(true);
        }
      } else {
        // Fallback error response
        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'agent',
            text: "I don't have those exact details right now. Would you like me to connect you with our support team to help you out?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setShowHandoffForm(true);
      }
    } catch (err) {
      console.warn('Chat API error, generating local knowledge fallback:', err);
      setIsTyping(false);
      
      // Client knowledge search fallback if offline/server disconnected
      const lowerQuery = queryText.toLowerCase();
      let match = knowledgeItems.find(k => 
        k.title.toLowerCase().includes(lowerQuery) || k.content.toLowerCase().includes(lowerQuery)
      );

      let replyText = "";
      if (match) {
        replyText = match.content;
      } else {
        replyText = "I do not have that specific information in my knowledge base. Would you like me to connect you with our support team?";
        setShowHandoffForm(true);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleHandoffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || (!leadEmail && !leadPhone)) return;

    const newLead: Omit<Lead, 'id' | 'createdAt'> = {
      businessId: business.id,
      name: leadName,
      email: leadEmail || 'N/A',
      phone: leadPhone || 'N/A',
      message: leadMessage || 'Requested human support via AI Chat widget.',
      source: 'AI Chat Widget',
      status: 'new'
    };

    await addLead(newLead);

    // Save conversation state to database
    const convRecord: Conversation = {
      id: `conv-${Date.now()}`,
      businessId: business.id,
      customerName: leadName,
      customerEmail: leadEmail,
      customerPhone: leadPhone,
      status: 'HUMAN_REQUIRED',
      messages,
      leadCaptured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveConversation(convRecord);

    setLeadSubmitted(true);
    setShowHandoffForm(false);

    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Thank you, ${leadName}! Your request has been recorded. Our support team at ${business.name} will reach out to you shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const resetChat = () => {
    const freshConvId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setConversationId(freshConvId);
    setConversationState(null);
    setSessionId(`session-${business?.id || 'default'}-${Date.now()}`);
    setMessages([
      {
        id: `m-welcome-${business?.id}-${Date.now()}`,
        sender: 'agent',
        text: business.agentSettings?.welcomeMessage || `Hi 👋 Welcome to ${business.name}. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInput('');
    setIsTyping(false);
    setShowHandoffForm(false);
    setLeadName('');
    setLeadEmail('');
    setLeadPhone('');
    setLeadMessage('');
    setLeadSubmitted(false);
  };

  if (!isOpen && !isEmbedded) {
    return (
      <button
        id="agentdesk-chat-bubble"
        onClick={handleOpenWidget}
        style={{ backgroundColor: primaryColor }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 p-3 sm:px-4 sm:py-3 text-white font-medium rounded-full shadow-xl hover:opacity-95 transition-all transform hover:scale-105 active:scale-95 touch-manipulation cursor-pointer"
        aria-label={`Open chat with ${business?.agentSettings?.agentName || business?.name || 'AI Assistant'}`}
      >
        <div className="relative flex items-center justify-center">
          <Bot className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
        </div>
        <span className="hidden sm:inline text-xs font-semibold">
          Chat with {business?.agentSettings?.agentName || business?.name || 'AI Agent'}
        </span>
      </button>
    );
  }

  return (
    <div className={`agentdesk-chat-widget flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden font-sans ${
      isEmbedded 
        ? 'w-full h-[600px]' 
        : 'fixed inset-x-2 bottom-2 top-14 sm:top-auto sm:inset-x-auto sm:bottom-6 sm:right-6 w-auto sm:w-[420px] max-w-[calc(100vw-1rem)] h-[calc(100dvh-4rem)] sm:h-[580px] z-50'
    }`}>
      {/* Header */}
      <div 
        className="px-5 py-3 text-white shadow-md flex flex-col gap-2"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white overflow-hidden border border-white/30 shrink-0">
              {business?.logo ? (
                <img src={business.logo} alt={business?.name || 'Business'} className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-6 h-6" />
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                {business?.agentSettings?.agentName || business?.name || 'AI Assistant'}
              </h3>
              <p className="text-[11px] text-blue-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full inline-block animate-ping" />
                Online 24/7 • {business?.name || 'AgentDesk'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              title="Toggle Context Debugger"
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded transition-colors ${showDebugPanel ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              CTX
            </button>
            <button
              onClick={resetChat}
              title="Reset Chat"
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {!isEmbedded && (
              <button
                onClick={handleCloseWidget}
                title="Close"
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Context Debug Panel */}
        {showDebugPanel && (
          <div className="bg-slate-900/90 backdrop-blur text-slate-100 p-2.5 rounded-xl text-xs font-mono my-1 border border-white/10 space-y-1 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
              <span className="text-amber-300 font-bold text-[11px]">🧠 Live Conversation State</span>
              <span className="text-[10px] text-slate-400 font-normal">{business.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-0.5">
              <div><span className="text-slate-400">ID:</span> {conversationId.slice(-8)}</div>
              <div><span className="text-slate-400">Topic:</span> <strong className="text-emerald-400">{conversationState?.currentTopic || 'None'}</strong></div>
              <div><span className="text-slate-400">Intent:</span> {conversationState?.lastIntent || 'None'}</div>
              <div><span className="text-slate-400">Attr:</span> {conversationState?.lastRequestedAttribute || 'None'}</div>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs: Text Chat vs Voice AI */}
        <div className="flex items-center p-1 bg-black/20 rounded-xl gap-1 mt-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Text Chat</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('voice');
              if (voiceStatus === 'idle') {
                startVoiceCall();
              }
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'voice'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Talk to AI</span>
            {voiceStatus === 'connected' || voiceStatus === 'speaking' || voiceStatus === 'listening' ? (
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            ) : null}
          </button>
        </div>
      </div>

      {/* Mode 1: Text Chat View */}
      {activeTab === 'chat' && (
        <>
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
            {(messages || []).map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    msg.sender === 'user' 
                      ? 'bg-slate-700 text-white' 
                      : msg.sender === 'system'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : msg.sender === 'system'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-tl-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-9">{msg.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Human Handoff Lead Form */}
            {showHandoffForm && !leadSubmitted && (
              <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-md space-y-3 my-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-blue-900 font-medium text-xs">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Connect with Human Support Team</span>
                </div>
                <p className="text-xs text-slate-600">
                  Please share your details so our counselor or support agent can get back to you shortly.
                </p>
                <form onSubmit={handleHandoffSubmit} className="space-y-2.5">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name *"
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={leadEmail}
                      onChange={e => setLeadEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      required
                      value={leadPhone}
                      onChange={e => setLeadPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <textarea
                    placeholder="Message / Question (Optional)"
                    value={leadMessage}
                    onChange={e => setLeadMessage(e.target.value)}
                    rows={2}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 rounded-lg transition-colors shadow"
                    >
                      Request Call Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHandoffForm(false)}
                      className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Suggested Quick Prompts */}
            {messages.length <= 2 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-1">
                  Suggested Questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(suggestedQuestions || []).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full transition-all text-left shadow-2xs hover:border-blue-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Ask ${business.agentSettings?.agentName || 'AI receptionist'}...`}
              className="flex-1 text-sm px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white text-slate-800"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isTyping}
              style={{ backgroundColor: input.trim() ? primaryColor : '#cbd5e1' }}
              className="p-2.5 text-white rounded-xl transition-all shadow disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Mode 2: Real-time Voice AI Receptionist View */}
      {activeTab === 'voice' && (
        <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 text-white overflow-hidden relative">
          {/* Top Call Info */}
          <div className="text-center space-y-1 z-10">
            <span className="inline-block px-3 py-1 bg-white/10 text-slate-300 text-[11px] font-medium rounded-full border border-white/10">
              Voice Receptionist • {business.name}
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              {business.agentSettings?.agentName || `${business.name} Receptionist`}
            </h3>
            <p className="text-xs text-slate-400">
              {voiceStatus === 'connecting' && 'Connecting to voice session...'}
              {voiceStatus === 'listening' && 'Listening... Speak now'}
              {voiceStatus === 'speaking' && 'AI speaking...'}
              {voiceStatus === 'connected' && 'Session connected'}
              {voiceStatus === 'ended' && 'Call ended'}
              {voiceStatus === 'idle' && 'Click Start to speak'}
            </p>

            {voiceDuration > 0 && (
              <div className="text-xs font-mono text-emerald-400 font-bold pt-1">
                {Math.floor(voiceDuration / 60).toString().padStart(2, '0')}:{(voiceDuration % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          {/* Center Soundwave / Sphere Visualizer */}
          <div className="my-auto flex flex-col items-center justify-center py-6 z-10">
            <div className="relative flex items-center justify-center">
              {/* Pulsing rings when listening or speaking */}
              {(voiceStatus === 'speaking' || voiceStatus === 'listening') && (
                <>
                  <div className="absolute w-32 h-32 rounded-full bg-blue-500/20 animate-ping" />
                  <div className="absolute w-24 h-24 rounded-full bg-indigo-500/30 animate-pulse" />
                </>
              )}

              <div 
                style={{ backgroundColor: primaryColor }}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl z-20 border-2 border-white/30 transition-transform ${
                  voiceStatus === 'speaking' ? 'scale-110' : voiceStatus === 'listening' ? 'scale-105' : 'scale-100'
                }`}
              >
                {voiceStatus === 'speaking' ? (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </div>
            </div>

            {/* Error Message if permission denied */}
            {voiceError && (
              <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl text-center max-w-xs">
                {voiceError}
              </div>
            )}
          </div>

          {/* Live Call Transcript Stream */}
          <div className="h-32 overflow-y-auto p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2 text-xs mb-4 z-10">
            <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider sticky top-0 bg-slate-900/90 py-0.5">
              Live Call Transcript
            </div>
            {(voiceTranscript || []).length === 0 ? (
              <p className="text-slate-500 italic text-center py-4 text-[11px]">
                Speak to start natural conversation with the AI receptionist...
              </p>
            ) : (
              (voiceTranscript || []).map((t, i) => (
                <div key={i} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`px-2.5 py-1 rounded-xl max-w-[90%] ${
                    t.sender === 'user' ? 'bg-blue-600/80 text-white' : 'bg-slate-800 text-slate-200 border border-white/10'
                  }`}>
                    {t.text}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-4 z-10">
            {voiceStatus === 'idle' || voiceStatus === 'ended' || voiceStatus === 'error' ? (
              <button
                onClick={startVoiceCall}
                style={{ backgroundColor: primaryColor }}
                className="px-6 py-3 text-white text-xs font-bold rounded-full shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>{voiceStatus === 'error' ? 'Reconnect Voice Call' : 'Start Voice Call'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-full transition-colors border ${
                    isMuted ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  <Mic className="w-5 h-5" />
                </button>

                <button
                  onClick={stopVoiceCall}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-full shadow-lg transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 rotate-[135deg]" />
                  <span>End Call</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="py-1.5 px-3 bg-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 border-t border-slate-200/60">
        <span>Powered by</span>
        <span className="font-semibold text-slate-600">AgentDesk</span>
        <span>• 24/7 AI Receptionist</span>
      </div>
    </div>
  );
};
