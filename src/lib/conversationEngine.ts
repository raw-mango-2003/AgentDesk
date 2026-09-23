import { 
  matchesPatternCategory, 
  extractEntitiesFromText, 
  isYesNoQuestion, 
  isShortFollowUp,
  isExplicitClosingIntent,
  isGoodbyeIntent,
  isThankYouIntent,
  isAcknowledgementIntent,
  isGreetingOrSmallTalkIntent,
  isIdentityIntent,
  isHumanHandoffIntent,
  isComplaintOrFrustrationIntent,
  isNegationIntent,
  isBookingActionIntent,
  isSyllabusActionIntent,
  isAffirmativeResponse,
  isNegativeResponse
} from './patternLibrary.js';
import { KnowledgeItem } from '../types.js';
export type { KnowledgeItem };

export type ConversationMessageType =
  | 'GREETING'
  | 'SMALL_TALK'
  | 'THANK_YOU'
  | 'ACKNOWLEDGEMENT'
  | 'IDENTITY_STATEMENT'
  | 'FOLLOW_UP'
  | 'INFORMATION_REQUEST'
  | 'MULTI_INTENT_REQUEST'
  | 'CLARIFICATION'
  | 'CONFIRMATION'
  | 'CORRECTION'
  | 'COMPLAINT'
  | 'HUMAN_HANDOFF'
  | 'LEAD_REQUEST'
  | 'BOOKING'
  | 'SYLLABUS'
  | 'CLOSING_INTENT'
  | 'GOODBYE'
  | 'NEGATION'
  | 'UNKNOWN';

export interface ConversationIntentResult {
  primaryType: ConversationMessageType;
  secondaryTypes: ConversationMessageType[];
  requiresKnowledgeRetrieval: boolean;
  directReply?: string;
  isClosing: boolean;
  needsHumanHandoff: boolean;
  suggestedActions: string[];
}

export type ConversationStage = 'COURSE_DISCUSSION' | 'BOOKING' | 'CLOSED';
export type BookingSubStage = 'IDLE' | 'COLLECTING_NAME' | 'COLLECTING_CONTACT' | 'COLLECTING_DATE_TIME' | 'CONFIRMED';

export interface BookingState {
  stage: BookingSubStage;
  name?: string;
  contact?: string;
  preferredDate?: string;
}

export interface EntityInfo {
  name: string;
  type: 'course' | 'demo' | 'policy' | 'admissions' | 'general';
}

export interface ConversationState {
  conversationId: string;
  businessId: string;
  currentTopic: string | null;
  currentEntity: EntityInfo | null;
  currentEntityType: 'course' | 'demo' | 'policy' | 'admissions' | 'general';
  lastIntent: string | null;
  lastRequestedAttribute: string | null;
  lastAssistantQuestion: string | null;
  pendingAction: 'DEMO_OR_SYLLABUS' | 'BOOKING_OFFER' | 'SYLLABUS_OFFER' | 'DEMO_OFFER' | 'MORE_HELP' | null;
  conversationStage: ConversationStage;
  bookingState: BookingState;
  lastAnswer: string | null;
  recentEntities: string[];
  pendingQuestion: string | null;
  conversationSummary: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  businessId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationRecord {
  conversationId: string;
  businessId: string;
  messages: ConversationMessage[];
  state: ConversationState;
  createdAt: string;
  updatedAt: string;
  status: 'AI_ACTIVE' | 'HUMAN_REQUIRED' | 'HUMAN_ACTIVE' | 'RESOLVED';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  leadCaptured?: boolean;
}

export interface NormalizedInput {
  raw: string;
  cleaned: string;
  tokens: string[];
  isQuestion: boolean;
  hasPunctuation: boolean;
}

export interface ExtractedIntentsAndEntities {
  intents: string[];
  attributes: string[];
  resolvedEntity: string | null;
  resolvedEntityType: 'course' | 'demo' | 'policy' | 'admissions' | 'general';
  isYesNo: boolean;
  isShortFollowUp: boolean;
  isConfirmation: boolean;
  isNegation: boolean;
  isAmbiguousMultipleEntities: boolean;
  isAmbiguousMissingEntity: boolean;
  candidateEntities: string[];
}

export function normalizeInput(raw: string): NormalizedInput {
  if (!raw) return { raw: '', cleaned: '', tokens: [], isQuestion: false, hasPunctuation: false };
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const tokens = cleaned.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const isQuestion = raw.includes('?') || /^(what|how|when|where|why|which|can|could|is|are|do|does)\b/i.test(cleaned);
  const hasPunctuation = /[?.!,]/.test(raw);
  return { raw, cleaned, tokens, isQuestion, hasPunctuation };
}

function getLastAssistantMessage(record: ConversationRecord): string | null {
  for (let i = record.messages.length - 1; i >= 0; i--) {
    if (record.messages[i].role === 'assistant') {
      return record.messages[i].content;
    }
  }
  return null;
}

// 1. CLASSIFY CONVERSATION INTENT (Router)
export function classifyConversationIntent(
  input: NormalizedInput,
  record: ConversationRecord,
  businessName: string
): ConversationIntentResult {
  const q = input.cleaned;
  const lastAssistantMsg = getLastAssistantMessage(record);

  // Initialize defaults for memory safety
  if (!record.state.conversationStage) record.state.conversationStage = 'COURSE_DISCUSSION';
  if (!record.state.bookingState) record.state.bookingState = { stage: 'IDLE' };

  // 1. CLOSING_INTENT (Explicit phrases like "No, that's all", "That's all", "I'm good", "All set")
  if (isExplicitClosingIntent(q)) {
    record.state.conversationStage = 'CLOSED';
    return {
      primaryType: 'CLOSING_INTENT',
      secondaryTypes: isGoodbyeIntent(q) ? ['GOODBYE'] : [],
      requiresKnowledgeRetrieval: false,
      directReply: "You're very welcome. Have a great day!",
      isClosing: true,
      needsHumanHandoff: false,
      suggestedActions: []
    };
  }

  // 2. GOODBYE INTENT
  if (isGoodbyeIntent(q) && !isBookingActionIntent(q)) {
    record.state.conversationStage = 'CLOSED';
    return {
      primaryType: 'GOODBYE',
      secondaryTypes: [],
      requiresKnowledgeRetrieval: false,
      directReply: "Goodbye! Have a great day!",
      isClosing: true,
      needsHumanHandoff: false,
      suggestedActions: []
    };
  }

  // 3. ACTIVE BOOKING FLOW STATE MACHINE
  if (record.state.conversationStage === 'BOOKING') {
    const stage = record.state.bookingState.stage || 'COLLECTING_NAME';
    
    // Check if user asked an explicit new course question or non-name response
    const isExplicitNewQuestion = /\b(fee|fees|cost|price|duration|timing|timings|schedule|course|courses|program|analytics|marketing|development|full stack|syllabus|refund|discount|online|offline|class|classes|demo|location|where|when|what|how|why|which)\b/i.test(q) && !isBookingActionIntent(q);

    if (!isExplicitNewQuestion) {
      if (stage === 'COLLECTING_NAME') {
        const isNotNameResponse = /\b(fee|fees|cost|price|duration|timing|timings|schedule|course|courses|program|analytics|marketing|development|full stack|syllabus|refund|discount|online|offline|class|classes|demo|location|where|when|what|how|why|which|can|could|would|will|is|are|do|does|yes|no|hi|hello|hey|thanks|thank)\b/i.test(q) || q.length > 35 || q.split(/\s+/).length > 4;

        if (!isNotNameResponse || /^(my name is|i'm|i am|this is|call me)\s+/i.test(q)) {
          const rawName = q.replace(/^(my name is|i'm|i am|this is|call me)\s*/i, '').trim();
          const words = rawName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
          const formattedName = words.join(' ');

          if (formattedName && formattedName.length >= 2) {
            record.state.bookingState.name = formattedName;
            record.state.bookingState.stage = 'COLLECTING_CONTACT';
            record.customerName = formattedName;

            return {
              primaryType: 'BOOKING',
              secondaryTypes: ['LEAD_REQUEST'],
              requiresKnowledgeRetrieval: false,
              directReply: `Thanks ${formattedName}! What phone number or email should I use to capture your enquiry?`,
              isClosing: false,
              needsHumanHandoff: false,
              suggestedActions: []
            };
          }
        }
      }

      if (stage === 'COLLECTING_CONTACT') {
        const emailMatch = q.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = q.match(/(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/);

        if (emailMatch || phoneMatch) {
          const contact = emailMatch ? emailMatch[0] : phoneMatch ? phoneMatch[0] : q;
          record.state.bookingState.contact = contact;
          record.state.bookingState.stage = 'CONFIRMED';
          record.state.conversationStage = 'COURSE_DISCUSSION';
          if (emailMatch) record.customerEmail = emailMatch[0];
          if (phoneMatch) record.customerPhone = phoneMatch[0];
          record.leadCaptured = true;

          const customerName = record.state.bookingState.name || 'there';
          return {
            primaryType: 'BOOKING',
            secondaryTypes: ['CONFIRMATION'],
            requiresKnowledgeRetrieval: false,
            directReply: `Thanks ${customerName}! I've captured your details. Our team will reach out shortly. Is there anything else you'd like to know?`,
            isClosing: false,
            needsHumanHandoff: false,
            suggestedActions: ['Learn More', 'Pricing', 'Get Started']
          };
        }
      }
    }
  }

  // 4. BOOKING / DEMO INITIATION INTENT
  if (isBookingActionIntent(q)) {
    record.state.conversationStage = 'BOOKING';
    record.state.bookingState = { stage: 'COLLECTING_NAME' };
    return {
      primaryType: 'BOOKING',
      secondaryTypes: ['LEAD_REQUEST'],
      requiresKnowledgeRetrieval: false,
      directReply: "I'd be glad to help you register! May I know your name please?",
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: []
    };
  }

  // 5. HUMAN HANDOFF INTENT
  if (isHumanHandoffIntent(q)) {
    return {
      primaryType: 'HUMAN_HANDOFF',
      secondaryTypes: [],
      requiresKnowledgeRetrieval: false,
      directReply: `I can capture your details here for the team. Please share your contact details or click 'Connect with Human Support' below.`,
      isClosing: false,
      needsHumanHandoff: true,
      suggestedActions: ['Connect with Human Support']
    };
  }

  // 6. COMPLAINT / FRUSTRATION INTENT
  if (isComplaintOrFrustrationIntent(q)) {
    return {
      primaryType: 'COMPLAINT',
      secondaryTypes: ['HUMAN_HANDOFF'],
      requiresKnowledgeRetrieval: false,
      directReply: "I apologize for the frustration. I can capture your details here so our team can follow up.",
      isClosing: false,
      needsHumanHandoff: true,
      suggestedActions: ['Connect with Human Support']
    };
  }

  // 7. THANK YOU INTENT
  if (isThankYouIntent(q)) {
    const isAlsoAskingQuestion = /\b(fee|cost|price|duration|timing|syllabus|refund|discount|admission|courses)\b/i.test(q);
    if (!isAlsoAskingQuestion) {
      return {
        primaryType: 'THANK_YOU',
        secondaryTypes: ['ACKNOWLEDGEMENT'],
        requiresKnowledgeRetrieval: false,
        directReply: "You're very welcome! Is there anything else I can help you with?",
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: []
      };
    }
  }

  // 8. ACKNOWLEDGEMENT / OKAY / SURE INTENT
  if (isAcknowledgementIntent(q) && q.split(/\s+/).length <= 3) {
    return {
      primaryType: 'ACKNOWLEDGEMENT',
      secondaryTypes: [],
      requiresKnowledgeRetrieval: false,
      directReply: "Great! Let me know if you have any questions about our programs, fees, or class schedules.",
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: []
    };
  }

  // 9. IDENTITY / "WHO ARE YOU" / "WHAT IS YOUR NAME" / "WHO DO YOU WORK FOR"
  if (isIdentityIntent(q)) {
    const assistantName = (businessName ? `${businessName} AI Assistant` : 'AI Assistant');
    return {
      primaryType: 'IDENTITY_STATEMENT',
      secondaryTypes: ['SMALL_TALK'],
      requiresKnowledgeRetrieval: false,
      directReply: `I am ${assistantName}, the AI receptionist for ${businessName}. How can I assist you today?`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['What services do you offer?', 'What are your prices?', 'How can I get started?']
    };
  }

  // 10. PURE GREETING OR SMALL TALK INTENT
  if (isGreetingOrSmallTalkIntent(q) && q.split(/\s+/).length <= 4) {
    const isAlsoQuestion = /\b(fee|cost|price|duration|timing|syllabus|course|program)\b/i.test(q);
    if (!isAlsoQuestion) {
      return {
        primaryType: 'GREETING',
        secondaryTypes: ['SMALL_TALK'],
        requiresKnowledgeRetrieval: false,
        directReply: `Hello! I am the AI receptionist for ${businessName}. How can I assist you today?`,
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: ['What services do you offer?', 'What is your pricing?', 'How can I get started?']
      };
    }
  }

  // 11. AFFIRMATIVE / YES RESPONSE TO PREVIOUS ASSISTANT OFFER
  if (isAffirmativeResponse(q) && lastAssistantMsg && q.split(/\s+/).length <= 3) {
    if (lastAssistantMsg.toLowerCase().includes('demo') || lastAssistantMsg.toLowerCase().includes('register')) {
      record.state.conversationStage = 'BOOKING';
      record.state.bookingState = { stage: 'COLLECTING_NAME' };
      return {
        primaryType: 'BOOKING',
        secondaryTypes: ['LEAD_REQUEST'],
        requiresKnowledgeRetrieval: false,
        directReply: "Wonderful! May I have your full name to get your registration started?",
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: []
      };
    }
  }

  // 12. NEGATION / "NO" RESPONSE (Without closing phrase)
  if (isNegativeResponse(q) && q.split(/\s+/).length <= 2) {
    record.state.conversationStage = 'CLOSED';
    return {
      primaryType: 'NEGATION',
      secondaryTypes: ['CLOSING_INTENT'],
      requiresKnowledgeRetrieval: false,
      directReply: "No problem at all! If you need more details, you can ask me here. Have a wonderful day!",
      isClosing: true,
      needsHumanHandoff: false,
      suggestedActions: []
    };
  }

  // Default: Requires knowledge retrieval
  return {
    primaryType: 'INFORMATION_REQUEST',
    secondaryTypes: [],
    requiresKnowledgeRetrieval: true,
    isClosing: false,
    needsHumanHandoff: false,
    suggestedActions: []
  };
}

// 2. EXTRACT INTENTS AND ENTITIES (Context-Aware Multi-Tenant Entity Extractor)
export function extractIntentsAndEntities(
  input: NormalizedInput,
  record: ConversationRecord,
  businessName: string
): ExtractedIntentsAndEntities {
  const q = input.cleaned;
  const intents: string[] = [];
  const attributes: string[] = [];

  // Match intent categories from pattern library
  if (matchesPatternCategory(q, 'pricing')) { intents.push('pricing'); attributes.push('fee'); }
  if (matchesPatternCategory(q, 'duration')) { intents.push('duration'); attributes.push('duration'); }
  if (matchesPatternCategory(q, 'schedule')) { intents.push('schedule'); attributes.push('timings'); }
  if (matchesPatternCategory(q, 'demo')) { intents.push('demo'); attributes.push('demo'); }
  if (matchesPatternCategory(q, 'refund')) { intents.push('refund'); attributes.push('refund'); }
  if (matchesPatternCategory(q, 'eligibility')) { intents.push('eligibility'); attributes.push('eligibility'); }
  if (matchesPatternCategory(q, 'list')) { intents.push('list'); }
  if (matchesPatternCategory(q, 'comparison')) { intents.push('comparison'); }
  if (matchesPatternCategory(q, 'human_support')) { intents.push('human_support'); }
  if (matchesPatternCategory(q, 'thanks')) { intents.push('thanks'); }
  if (matchesPatternCategory(q, 'goodbye')) { intents.push('goodbye'); }

  // Detect course entities mentioned in query
  const candidateEntities: string[] = [];
  
  // Tech entities
  if (/\b(data analytics|analytics|data analysis|power bi|tableau|sql)\b/i.test(q)) candidateEntities.push('Data Analytics');
  if (/\b(python|machine learning|ai|artificial intelligence)\b/i.test(q)) candidateEntities.push('Python for AI');
  if (/\b(full stack|web development|frontend|backend|mern)\b/i.test(q)) candidateEntities.push('Full Stack Development');
  if (/\b(digital marketing|seo|sem|social media marketing)\b/i.test(q)) candidateEntities.push('Digital Marketing');

  // Healthcare / Medical Coding entities
  if (/\b(cpc|certified professional coder|medical coding|coding exam|cpc exam)\b/i.test(q)) candidateEntities.push('CPC Exam Prep');
  if (/\b(medical billing|billing|insurance reimbursement)\b/i.test(q)) candidateEntities.push('Medical Billing');
  if (/\b(icd-10|inpatient|inpatient coding|hospital coding)\b/i.test(q)) candidateEntities.push('Inpatient ICD-10 Coding');

  // Trade / Vocational entities
  if (/\b(hvac|hvac technician|air conditioning|heating|epa 608)\b/i.test(q)) candidateEntities.push('HVAC Technician');
  if (/\b(electrical|electrician|electrical apprenticeship)\b/i.test(q)) candidateEntities.push('Electrical Apprenticeship');
  if (/\b(phlebotomy|phlebotomist|blood draw)\b/i.test(q)) candidateEntities.push('Phlebotomy');

  let resolvedEntity: string | null = null;
  let resolvedEntityType: 'course' | 'demo' | 'policy' | 'admissions' | 'general' = 'course';

  if (candidateEntities.length === 1) {
    resolvedEntity = candidateEntities[0];
    record.state.currentTopic = resolvedEntity;
    record.state.currentEntity = { name: resolvedEntity, type: 'course' };
  } else if (candidateEntities.length > 1) {
    resolvedEntity = candidateEntities[0];
  } else {
    // Check if query is about demo, refund, or admissions
    if (intents.includes('demo') || /\b(demo|trial|sample)\b/i.test(q)) {
      resolvedEntity = 'Demo';
      resolvedEntityType = 'demo';
    } else if (intents.includes('refund') || /\b(refund|cancellation|money back)\b/i.test(q)) {
      resolvedEntity = 'Refund';
      resolvedEntityType = 'policy';
    } else if (intents.includes('eligibility') || /\b(eligibility|prerequisites|requirements|who can join)\b/i.test(q)) {
      resolvedEntity = 'Admissions';
      resolvedEntityType = 'admissions';
    } else if (intents.includes('list') || /\b(courses|programs|what do you offer|what certifications)\b/i.test(q)) {
      resolvedEntity = 'General';
      resolvedEntityType = 'general';
    } else if (isShortFollowUp(q) && record.state.currentTopic) {
      // Memory resolution: inherit active topic from session memory
      resolvedEntity = record.state.currentTopic;
      resolvedEntityType = record.state.currentEntityType || 'course';
    } else if (record.state.currentTopic) {
      resolvedEntity = record.state.currentTopic;
      resolvedEntityType = record.state.currentEntityType || 'course';
    }
  }

  const isYesNo = isYesNoQuestion(q);
  const isShortFollow = isShortFollowUp(q);
  const isConfirmation = isAffirmativeResponse(q) || /\b(right|correct|true|is it|really)\b/i.test(q);
  const isNegation = isNegativeResponse(q);

  return {
    intents,
    attributes,
    resolvedEntity,
    resolvedEntityType,
    isYesNo,
    isShortFollowUp: isShortFollow,
    isConfirmation,
    isNegation,
    isAmbiguousMultipleEntities: candidateEntities.length > 1,
    isAmbiguousMissingEntity: candidateEntities.length === 0 && !resolvedEntity && (attributes.includes('fee') || attributes.includes('duration')),
    candidateEntities
  };
}

// 3. TARGETED KNOWLEDGE RETRIEVAL (STRICT TENANT ISOLATION)
export function retrieveTargetedKnowledge(
  business: any,
  knowledge: KnowledgeItem[],
  extracted: ExtractedIntentsAndEntities
): KnowledgeItem[] {
  const normBizId = (business.id || '').trim().toLowerCase();

  // Strict tenant filter: NEVER return items from another tenant
  const tenantKnowledge = (knowledge || []).filter(k => {
    if (!k) return false;
    const kBiz = (k.businessId || '').trim().toLowerCase();
    return kBiz === normBizId;
  });

  if (tenantKnowledge.length === 0) {
    return [];
  }

  const { resolvedEntity, attributes, intents } = extracted;

  // Filter and score knowledge items for this tenant
  const scored = tenantKnowledge.map(k => {
    let score = 0;
    const title = (k.title || '').toLowerCase();
    const content = (k.content || '').toLowerCase();
    const category = (k.category || '').toLowerCase();

    if (resolvedEntity && resolvedEntity !== 'General') {
      const entLower = resolvedEntity.toLowerCase();
      if (title.includes(entLower)) score += 10;
      if (content.includes(entLower)) score += 5;
      if (category.includes(entLower)) score += 3;
    }

    for (const attr of attributes) {
      if (title.includes(attr)) score += 6;
      if (content.includes(attr)) score += 4;
      if (attr === 'fee' && (content.includes('₹') || content.includes('$') || content.includes('fee') || content.includes('tuition') || content.includes('cost'))) score += 5;
      if (attr === 'duration' && (content.includes('week') || content.includes('month') || content.includes('duration'))) score += 5;
      if (attr === 'timings' && (content.includes('pm') || content.includes('am') || content.includes('timing') || content.includes('schedule') || content.includes('batch'))) score += 5;
    }

    for (const intent of intents) {
      if (title.includes(intent)) score += 4;
      if (content.includes(intent)) score += 2;
    }

    return { item: k, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score > 0) {
    return scored.filter(s => s.score > 0).map(s => s.item);
  }

  return tenantKnowledge;
}

// Dynamic Fact Extraction Helpers from Knowledge Items
function extractFact(items: KnowledgeItem[], attribute: 'fee' | 'duration' | 'timing' | 'syllabus' | 'refund' | 'demo' | 'courses', entityName?: string | null): string | null {
  for (const item of items) {
    const text = `${item.title}\n${item.content}`;
    const cleanText = text.replace(/Question:.*?\n/gi, '').trim();

    if (attribute === 'fee') {
      const priceMatch = cleanText.match(/(₹\s*[\d,]+|\$\s*[\d,]+|\b\d+,\d+\s*(rupees|inr|usd)?\b)/i);
      if (priceMatch) return priceMatch[0].trim();
    }

    if (attribute === 'duration') {
      const durMatch = cleanText.match(/(\b\d+\s*(weeks|months|days|hours)\b)/i);
      if (durMatch) return durMatch[0].trim();
    }

    if (attribute === 'timing') {
      const timingMatch = cleanText.match(/(Monday.*?PM|Tuesday.*?PM|Saturday.*?PM|Saturday.*?AM|\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s*to\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b|live online classes run.*?\.)/i);
      if (timingMatch) return timingMatch[0].trim();
    }

    if (attribute === 'refund') {
      const refundMatch = cleanText.match(/(refund requests can be submitted within \d+ days.*?\.|refund policy.*?\.)/i);
      if (refundMatch) return refundMatch[0].trim();
    }

    if (attribute === 'demo') {
      const demoMatch = cleanText.match(/(free live interactive demo.*?\.|demo sessions are.*?\.)/i);
      if (demoMatch) return demoMatch[0].trim();
    }
  }
  return null;
}

function extractDistinctOfferings(items: KnowledgeItem[]): string[] {
  const titles = new Set<string>();
  for (const item of items) {
    const t = item.title.replace(/(Course Details|Course Syllabus|Fee & Duration|Class Timings|Program|Course)/gi, '').trim();
    if (t && t.length > 2 && !t.toLowerCase().includes('demo') && !t.toLowerCase().includes('refund') && !t.toLowerCase().includes('faq')) {
      titles.add(t);
    }
  }
  return Array.from(titles);
}

// 4. DYNAMIC ANSWER GENERATION ENGINE
export function generateEngineAnswer(
  business: any,
  extracted: ExtractedIntentsAndEntities,
  retrievedKnowledge: KnowledgeItem[],
  record: ConversationRecord
): {
  reply: string;
  isClosing: boolean;
  needsHumanHandoff: boolean;
  suggestedActions: string[];
} {
  const bizName = business.name || 'our business';

  // A. Human Handoff Intent
  if (extracted.intents.includes('human_support')) {
    return {
      reply: `I can capture your details here for the team. Please share your contact details or click 'Connect with Human Support' below.`,
      isClosing: false,
      needsHumanHandoff: true,
      suggestedActions: ['Connect with Human Support']
    };
  }

  // B. Small Talk / Identity
  if ((extracted.intents.includes('small_talk') || extracted.intents.includes('identity')) && !extracted.resolvedEntity) {
    const assistantName = business.agentSettings?.agentName || `${bizName} AI Assistant`;
    return {
      reply: `Hello! I am ${assistantName}, the AI receptionist for ${bizName}. How can I assist you today?`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['Learn More', 'Services', 'Get Started']
    };
  }

  // C. Course List / Offerings Intent ("What courses do you offer?")
  if (extracted.intents.includes('list') || extracted.resolvedEntity === 'General') {
    // Extract courses strictly from this business's knowledge items
    let offerings = extractDistinctOfferings(retrievedKnowledge);
    
    // Check if there is an explicit "Courses Offered" FAQ in retrieved knowledge
    const listFaq = retrievedKnowledge.find(k => k.title.toLowerCase().includes('offered') || k.title.toLowerCase().includes('programs') || k.category?.toLowerCase() === 'courses');
    if (listFaq && listFaq.content) {
      const match = listFaq.content.match(/Answer:\s*([\s\S]+)/i);
      if (match && match[1]) {
        return {
          reply: match[1].trim(),
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: offerings.length > 0 ? offerings : ['Pricing', 'Services']
        };
      }
    }

    if (offerings.length > 0) {
      const listStr = offerings.length === 1 ? offerings[0] : offerings.slice(0, -1).join(', ') + ' and ' + offerings[offerings.length - 1];
      return {
        reply: `At ${bizName}, we offer ${listStr}. Which one would you like to explore?`,
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: offerings
      };
    }

    return {
      reply: `Welcome to ${bizName}! What product, service, or topic would you like to know more about?`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['Pricing', 'Schedule']
    };
  }

  // D. Demo / Trial Questions
  if (extracted.resolvedEntity === 'Demo' || extracted.intents.includes('demo')) {
    const demoFaq = retrievedKnowledge.find(k => k.category?.toLowerCase() === 'demo' || k.title.toLowerCase().includes('demo'));
    if (demoFaq) {
      const match = demoFaq.content.match(/Answer:\s*([\s\S]+)/i);
      if (match && match[1]) {
        return {
          reply: match[1].trim(),
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: ['Learn More', 'Get Started']
        };
      }
    }
    return {
      reply: `I don't have confirmed demo details in the knowledge base yet. I can capture your enquiry for the team if you'd like.`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['Request a Demo']
    };
  }

  // E. Refund Policy Questions
  if (extracted.resolvedEntity === 'Refund' || extracted.intents.includes('refund')) {
    const refundFact = extractFact(retrievedKnowledge, 'refund');
    if (refundFact) {
      return {
        reply: refundFact,
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: []
      };
    }
    const refundFaq = retrievedKnowledge.find(k => k.title.toLowerCase().includes('refund') || k.content.toLowerCase().includes('refund'));
    if (refundFaq) {
      const match = refundFaq.content.match(/Answer:\s*([\s\S]+)/i);
      if (match && match[1]) {
        return {
          reply: match[1].trim(),
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: []
        };
      }
    }
    return {
      reply: `I don't have confirmed refund-policy details in the knowledge base for ${bizName}. I can capture your enquiry for the team if you'd like.`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: []
    };
  }

  // F. Admissions / Eligibility / Prerequisites
  if (extracted.resolvedEntity === 'Admissions' || extracted.intents.includes('eligibility')) {
    const admFaq = retrievedKnowledge.find(k => k.title.toLowerCase().includes('prerequisite') || k.title.toLowerCase().includes('eligibility') || k.category?.toLowerCase() === 'admissions');
    if (admFaq) {
      const match = admFaq.content.match(/Answer:\s*([\s\S]+)/i);
      if (match && match[1]) {
        return {
          reply: match[1].trim(),
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: ['Get Started', 'Pricing']
        };
      }
    }
    return {
      reply: `I don't have confirmed eligibility or admissions details in the knowledge base for ${bizName}. I can capture your enquiry for the team if you'd like.`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['Get Started', 'Ask Another Question']
    };
  }

  // G. Dynamic Fact-Based Entity Queries (Fee, Duration, Timing, Syllabus, Pricing, Services)
  const entity = extracted.resolvedEntity;
  const targetItems = retrievedKnowledge.filter(k => 
    !entity || k.title.toLowerCase().includes(entity.toLowerCase()) || k.content.toLowerCase().includes(entity.toLowerCase())
  );
  const itemsToUse = targetItems.length > 0 ? targetItems : retrievedKnowledge;

  // Direct FAQ Answer check if a knowledge item has an explicit Answer:
  if (itemsToUse.length > 0) {
    const topItem = itemsToUse[0];
    const answerMatch = topItem.content.match(/Answer:\s*([\s\S]+)/i);
    if (answerMatch && answerMatch[1]) {
      return {
        reply: answerMatch[1].trim(),
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: ['More Details', 'Get Started']
      };
    }
  }

  const fee = extractFact(itemsToUse, 'fee', entity);
  const duration = extractFact(itemsToUse, 'duration', entity);
  const timing = extractFact(itemsToUse, 'timing', entity);

  const isFeeAsked = extracted.attributes.includes('fee');
  const isDurationAsked = extracted.attributes.includes('duration');
  const isTimingAsked = extracted.attributes.includes('timings');

  // Multi-intent: Fee and Duration
  if (isFeeAsked && isDurationAsked && (fee || duration)) {
    const entityLabel = entity || 'program';
    return {
      reply: `For ${entityLabel}, the available details are ${fee ? `a fee of ${fee}` : 'a fee not specified'}${duration ? ` and a duration of ${duration}` : ''}.`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['Schedule', 'More Details', 'Get Started']
    };
  }

  // Single: Fee / Pricing Overview
  if (isFeeAsked) {
    if (itemsToUse.length > 0 && (itemsToUse[0].category === 'Pricing' || !entity || itemsToUse[0].content.includes('Starter'))) {
      return {
        reply: itemsToUse[0].content,
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: ['Get Started', 'Book a Demo', 'Features Overview']
      };
    }

    if (fee) {
      const entityLabel = entity || 'program';
      if (extracted.isYesNo) {
        return {
          reply: `No, the ${entityLabel} is not free. The fee is ${fee}. We also provide live demo sessions and flexible options.`,
          isClosing: false,
          needsHumanHandoff: false,
          suggestedActions: ['Schedule', 'More Details']
        };
      }
      return {
        reply: `The ${entityLabel} fee is ${fee}.`,
        isClosing: false,
        needsHumanHandoff: false,
        suggestedActions: ['Duration', 'Schedule', 'More Details']
      };
    }
  }

  // Single: Duration
  if (isDurationAsked && duration) {
    const entityLabel = entity || 'program';
    return {
      reply: `The ${entityLabel} duration is ${duration}.`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['Pricing', 'Schedule']
    };
  }

  // Single: Timings / Schedule
  if (isTimingAsked && timing) {
    return {
      reply: `Class timings: ${timing}`,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['Pricing', 'Get Started']
    };
  }

  // Fallback to highest scored FAQ item answer in retrieved knowledge
  if (itemsToUse.length > 0) {
    const topItem = itemsToUse[0];
    return {
      reply: topItem.content,
      isClosing: false,
      needsHumanHandoff: false,
      suggestedActions: ['More Details']
    };
  }

  // Safe Unknown Handler for this tenant - NEVER mention other businesses
  return {
    reply: `I don't have that specific information in the knowledge base for ${bizName}. Would you like me to connect you with our support team?`,
    isClosing: false,
    needsHumanHandoff: true,
    suggestedActions: ['Connect with Human Support']
  };
}

// 5. ANSWER VALIDATION (Ensures no hallucination or premature goodbye, and strict identity safeguarding)
export function validateAnswer(
  reply: string,
  extracted: ExtractedIntentsAndEntities,
  business: any,
  record?: ConversationRecord
): string {
  if (!reply) return `How can I help you with ${business?.name || 'our business'} today?`;

  let cleaned = reply.trim();

  // If not closing turn, remove any stray goodbye or closing phrases
  if (!extracted.intents.includes('goodbye') && !extracted.intents.includes('closing')) {
    cleaned = cleaned.replace(/\b(Goodbye!|Have a great day!|Bye!|Farewell!)\b/gi, '').trim();
  }

  // Public receptionist safeguard: never expose direct client contact details.
  // Leads are captured inside AgentDesk and the client follows up from the dashboard.
  const responseEmailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const responsePhonePattern = /(?:\+91[-.\s]?)?[6-9]\d{9}\b|\b\d{10}\b/;
  const containsConfiguredContact = [
    business?.supportEmail,
    business?.leadNotificationEmail,
    business?.phone,
    business?.leadNotificationPhone
  ].filter(Boolean).some((value: any) => {
    const normalizedValue = String(value).trim().toLowerCase();
    return normalizedValue.length > 3 && cleaned.toLowerCase().includes(normalizedValue);
  });

  if (containsConfiguredContact || responseEmailPattern.test(cleaned) || responsePhonePattern.test(cleaned)) {
    return "I can capture your details here for our team, and they will follow up with you shortly.";
  }

  // Strict Safeguard: Prevent customer from ever seeing raw tenantId / businessId / UUID slugs
  if (business?.id) {
    const rawId = String(business.id).trim();
    if (rawId.length >= 4) {
      const escaped = rawId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const idPattern = new RegExp(`\\b${escaped}\\b`, 'gi');
      cleaned = cleaned.replace(idPattern, business.name || 'our business');
    }
  }

  // Strip generic UUID patterns if present
  cleaned = cleaned.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '').replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

// 6. UPDATE CONVERSATION MEMORY (Session Consistency & Active Topic Tracking)
export function updateConversationMemory(
  record: ConversationRecord,
  userMessage: string,
  assistantReply: string,
  extracted: ExtractedIntentsAndEntities
): ConversationRecord {
  const timestamp = new Date().toISOString();

  // Push user message
  record.messages.push({
    id: `m-u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversationId: record.conversationId,
    businessId: record.businessId,
    role: 'user',
    content: userMessage,
    timestamp
  });

  // Push assistant reply
  record.messages.push({
    id: `m-a-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversationId: record.conversationId,
    businessId: record.businessId,
    role: 'assistant',
    content: assistantReply,
    timestamp
  });

  // Update conversation state topic & entity
  if (extracted.resolvedEntity && extracted.resolvedEntity !== 'General') {
    record.state.currentTopic = extracted.resolvedEntity;
    record.state.currentEntity = {
      name: extracted.resolvedEntity,
      type: extracted.resolvedEntityType
    };
    if (!record.state.recentEntities.includes(extracted.resolvedEntity)) {
      record.state.recentEntities.push(extracted.resolvedEntity);
    }
  }

  if (extracted.intents.length > 0) {
    record.state.lastIntent = extracted.intents[0];
  }
  if (extracted.attributes.length > 0) {
    record.state.lastRequestedAttribute = extracted.attributes[0];
  }

  record.state.lastAnswer = assistantReply;
  record.state.updatedAt = timestamp;
  record.updatedAt = timestamp;

  return record;
}
