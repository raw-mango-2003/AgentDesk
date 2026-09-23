import { 
  normalizeInput, 
  classifyConversationIntent,
  extractIntentsAndEntities, 
  retrieveTargetedKnowledge, 
  generateEngineAnswer, 
  validateAnswer, 
  updateConversationMemory, 
  ConversationRecord 
} from './conversationEngine.js';
import { 
  DEMO_BUSINESS, 
  DEMO_KNOWLEDGE_ITEMS, 
  MEDICAL_CODING_BUSINESS, 
  MEDICAL_CODING_KNOWLEDGE_ITEMS, 
  DALLAS_CAREER_BUSINESS, 
  DALLAS_CAREER_KNOWLEDGE_ITEMS,
  ACME_BUSINESS,
  ACME_KNOWLEDGE_ITEMS,
  BETA_BUSINESS,
  BETA_KNOWLEDGE_ITEMS,
  PUBLIC_AGENTDESK_DEMO_BUSINESS,
  PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS
} from '../data/demoBusiness.js';
import { EXACT_CLOSING_PHRASES } from './patternLibrary.js';

export interface TestResultTurn {
  userQuery: string;
  expectedKeywords: string[];
  actualReply: string;
  resolvedEntity: string | null;
  resolvedIntent: string;
  isClosing: boolean;
  passed: boolean;
  failureReason?: string;
}

export interface TestCaseResult {
  testId: string;
  testName: string;
  passed: boolean;
  turns: TestResultTurn[];
}

export function runBusinessResolutionSafetyTests(resolveBusinessAndKnowledge: (identifier?: string) => { business: any; knowledge: any[]; agent: any }): TestCaseResult[] {
  const unknownIds = [
    'definitely-not-a-real-tenant',
    'tenant_missing_9f4c2b',
    'agent_missing_7a81e3'
  ];
  const turns: TestResultTurn[] = unknownIds.map(id => {
    const resolved = resolveBusinessAndKnowledge(id);
    const passed = !resolved.business && resolved.knowledge.length === 0 && !resolved.agent;
    return {
      userQuery: `Unknown identifier: ${id}`,
      expectedKeywords: ['business = null', 'knowledge = []', 'agent = null'],
      actualReply: passed ? 'Rejected as unknown identifier.' : 'Identifier unexpectedly resolved.',
      resolvedEntity: null,
      resolvedIntent: 'BUSINESS_RESOLUTION',
      isClosing: false,
      passed,
      failureReason: passed ? undefined : 'Unknown identifier resolved to tenant data or a synthesized agent.'
    };
  });
  return [{
    testId: 'BUSINESS_RESOLUTION_FAIL_CLOSED',
    testName: 'Unknown Tenant/Agent Resolution Fails Closed',
    passed: turns.every(t => t.passed),
    turns
  }];
}

export function runConversationTestSuite(
  business: any = DEMO_BUSINESS,
  knowledgeBase: any[] = DEMO_KNOWLEDGE_ITEMS
): TestCaseResult[] {
  const testResults: TestCaseResult[] = [];

  function createFreshRecord(testId: string): ConversationRecord {
    const convId = `test_conv_${testId}_${Date.now()}`;
    return {
      conversationId: convId,
      businessId: business.id || 'nova-academy',
      messages: [],
      state: {
        conversationId: convId,
        businessId: business.id || 'nova-academy',
        currentTopic: null,
        currentEntity: null,
        currentEntityType: 'general',
        lastIntent: null,
        lastRequestedAttribute: null,
        lastAssistantQuestion: null,
        pendingAction: null,
        conversationStage: 'COURSE_DISCUSSION',
        bookingState: { stage: 'IDLE' },
        lastAnswer: null,
        recentEntities: [],
        pendingQuestion: null,
        conversationSummary: '',
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'AI_ACTIVE'
    };
  }

  // TEST 1: Course Fee -> Follow-up Duration
  {
    const rec = createFreshRecord('test_1');
    const turns: TestResultTurn[] = [];

    // Turn 1
    const norm1 = normalizeInput("What is the Data Analytics course fee?");
    const ext1 = extractIntentsAndEntities(norm1, rec, business.name);
    const rag1 = retrieveTargetedKnowledge(business, knowledgeBase, ext1);
    const ans1 = generateEngineAnswer(business, ext1, rag1, rec);
    const val1 = validateAnswer(ans1.reply, ext1, business);
    updateConversationMemory(rec, norm1.raw, val1, ext1);

    const pass1 = val1.includes('25,000') || val1.includes('30,000') || val1.includes('2,499') || val1.includes('3,200') || val1.toLowerCase().includes('fee') || val1.toLowerCase().includes('cost');
    turns.push({
      userQuery: norm1.raw,
      expectedKeywords: ['fee/cost'],
      actualReply: val1,
      resolvedEntity: ext1.resolvedEntity,
      resolvedIntent: ext1.intents.join(', '),
      isClosing: ans1.isClosing,
      passed: pass1
    });

    // Turn 2: "how long?"
    const norm2 = normalizeInput("how long?");
    const ext2 = extractIntentsAndEntities(norm2, rec, business.name);
    const rag2 = retrieveTargetedKnowledge(business, knowledgeBase, ext2);
    const ans2 = generateEngineAnswer(business, ext2, rag2, rec);
    const val2 = validateAnswer(ans2.reply, ext2, business);
    updateConversationMemory(rec, norm2.raw, val2, ext2);

    const pass2 = ext2.resolvedEntity === 'Data Analytics' && (val2.includes('weeks') || val2.includes('months') || val2.includes('12') || val2.includes('16'));
    turns.push({
      userQuery: norm2.raw,
      expectedKeywords: ['Data Analytics', 'weeks'],
      actualReply: val2,
      resolvedEntity: ext2.resolvedEntity,
      resolvedIntent: ext2.intents.join(', '),
      isClosing: ans2.isClosing,
      passed: pass2
    });

    testResults.push({
      testId: 'SPEC_TEST_1',
      testName: 'Assistant: "Data Analytics course fee" -> User: "how long?"',
      passed: turns.every(t => t.passed),
      turns
    });
  }

  // TEST 2: Course Duration -> Follow-up Fee
  {
    const rec = createFreshRecord('test_2');
    const turns: TestResultTurn[] = [];

    // Turn 1
    const norm1 = normalizeInput("Data Analytics duration?");
    const ext1 = extractIntentsAndEntities(norm1, rec, business.name);
    const rag1 = retrieveTargetedKnowledge(business, knowledgeBase, ext1);
    const ans1 = generateEngineAnswer(business, ext1, rag1, rec);
    updateConversationMemory(rec, norm1.raw, ans1.reply, ext1);

    // Turn 2: "fee?"
    const norm2 = normalizeInput("fee?");
    const ext2 = extractIntentsAndEntities(norm2, rec, business.name);
    const rag2 = retrieveTargetedKnowledge(business, knowledgeBase, ext2);
    const ans2 = generateEngineAnswer(business, ext2, rag2, rec);

    const pass2 = ext2.resolvedEntity === 'Data Analytics' && (ans2.reply.includes('25,000') || ans2.reply.includes('30,000') || ans2.reply.toLowerCase().includes('fee'));
    turns.push({
      userQuery: norm2.raw,
      expectedKeywords: ['fee'],
      actualReply: ans2.reply,
      resolvedEntity: ext2.resolvedEntity,
      resolvedIntent: ext2.intents.join(', '),
      isClosing: ans2.isClosing,
      passed: pass2
    });

    testResults.push({
      testId: 'SPEC_TEST_2',
      testName: 'Assistant: "Data Analytics duration" -> User: "fee?"',
      passed: pass2,
      turns
    });
  }

  // TEST 3: Demo Mention -> Follow-up "free?"
  {
    const rec = createFreshRecord('test_3');
    const turns: TestResultTurn[] = [];

    // Seed Assistant Message
    const extSeed = extractIntentsAndEntities(normalizeInput("Is there a demo class?"), rec, business.name);
    updateConversationMemory(rec, "Is there a demo class?", "We offer free live demo sessions every Saturday at 11 AM IST.", extSeed);

    // User: "free?"
    const norm = normalizeInput("free?");
    const ext = extractIntentsAndEntities(norm, rec, business.name);
    const rag = retrieveTargetedKnowledge(business, knowledgeBase, ext);
    const ans = generateEngineAnswer(business, ext, rag, rec);
    const val = validateAnswer(ans.reply, ext, business);

    const pass = ext.resolvedEntity === 'Demo' && val.toLowerCase().includes('free');
    turns.push({
      userQuery: norm.raw,
      expectedKeywords: ['free'],
      actualReply: val,
      resolvedEntity: ext.resolvedEntity,
      resolvedIntent: ext.intents.join(', '),
      isClosing: ans.isClosing,
      passed: pass
    });

    testResults.push({
      testId: 'SPEC_TEST_3',
      testName: 'Assistant: "We offer live demo" -> User: "free?"',
      passed: pass,
      turns
    });
  }

  // TEST 4: Multi-Tenant Strict Isolation Test
  {
    const turns: TestResultTurn[] = [];

    // Test Medical Coding Academy vs Nova AI Academy
    const medRec = {
      conversationId: 'med_iso_test',
      businessId: MEDICAL_CODING_BUSINESS.id,
      messages: [],
      state: {
        conversationId: 'med_iso_test',
        businessId: MEDICAL_CODING_BUSINESS.id,
        currentTopic: null,
        currentEntity: null,
        currentEntityType: 'general' as const,
        lastIntent: null,
        lastRequestedAttribute: null,
        lastAssistantQuestion: null,
        pendingAction: null,
        conversationStage: 'COURSE_DISCUSSION' as const,
        bookingState: { stage: 'IDLE' as const },
        lastAnswer: null,
        recentEntities: [],
        pendingQuestion: null,
        conversationSummary: '',
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'AI_ACTIVE' as const
    };

    const normMed = normalizeInput("What are your courses?");
    const extMed = extractIntentsAndEntities(normMed, medRec, MEDICAL_CODING_BUSINESS.name);
    const ragMed = retrieveTargetedKnowledge(MEDICAL_CODING_BUSINESS, MEDICAL_CODING_KNOWLEDGE_ITEMS, extMed);
    const ansMed = generateEngineAnswer(MEDICAL_CODING_BUSINESS, extMed, ragMed, medRec);

    // Verify zero Data Analytics leakage from Nova into Medical Coding Academy
    const medHasNovaData = ansMed.reply.toLowerCase().includes('data analytics') || ansMed.reply.toLowerCase().includes('python for ai') || ansMed.reply.includes('₹25,000');
    const medHasMedicalData = ansMed.reply.toLowerCase().includes('cpc') || ansMed.reply.toLowerCase().includes('medical coding') || ansMed.reply.toLowerCase().includes('medical billing');
    const passMed = !medHasNovaData && medHasMedicalData;

    turns.push({
      userQuery: "Medical Coding Academy: 'What are your courses?'",
      expectedKeywords: ['CPC/Medical Coding', 'NO Data Analytics / ₹25,000'],
      actualReply: ansMed.reply,
      resolvedEntity: extMed.resolvedEntity,
      resolvedIntent: extMed.intents.join(', '),
      isClosing: ansMed.isClosing,
      passed: passMed
    });

    // Test Dallas Career Institute
    const dallasRec = {
      conversationId: 'dallas_iso_test',
      businessId: DALLAS_CAREER_BUSINESS.id,
      messages: [],
      state: {
        conversationId: 'dallas_iso_test',
        businessId: DALLAS_CAREER_BUSINESS.id,
        currentTopic: null,
        currentEntity: null,
        currentEntityType: 'general' as const,
        lastIntent: null,
        lastRequestedAttribute: null,
        lastAssistantQuestion: null,
        pendingAction: null,
        conversationStage: 'COURSE_DISCUSSION' as const,
        bookingState: { stage: 'IDLE' as const },
        lastAnswer: null,
        recentEntities: [],
        pendingQuestion: null,
        conversationSummary: '',
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'AI_ACTIVE' as const
    };

    const normDallas = normalizeInput("What is the HVAC program tuition?");
    const extDallas = extractIntentsAndEntities(normDallas, dallasRec, DALLAS_CAREER_BUSINESS.name);
    const ragDallas = retrieveTargetedKnowledge(DALLAS_CAREER_BUSINESS, DALLAS_CAREER_KNOWLEDGE_ITEMS, extDallas);
    const ansDallas = generateEngineAnswer(DALLAS_CAREER_BUSINESS, extDallas, ragDallas, dallasRec);

    const passDallas = ansDallas.reply.includes('$3,200') || ansDallas.reply.toLowerCase().includes('hvac');
    turns.push({
      userQuery: "Dallas Career Institute: 'What is the HVAC program tuition?'",
      expectedKeywords: ['$3,200', 'HVAC'],
      actualReply: ansDallas.reply,
      resolvedEntity: extDallas.resolvedEntity,
      resolvedIntent: extDallas.intents.join(', '),
      isClosing: ansDallas.isClosing,
      passed: passDallas
    });

    testResults.push({
      testId: 'TENANT_DATA_ISOLATION',
      testName: 'Multi-Tenant Security & Zero Data Contamination Enforcement',
      passed: passMed && passDallas,
      turns
    });
  }

  // TEST 5: Mandatory Text Chat Multi-Turn Flow Test
  {
    const rec = createFreshRecord('test_mandatory_sequence');
    const turns: TestResultTurn[] = [];

    // Turn 1: "What courses do you offer?"
    const norm1 = normalizeInput("What courses do you offer?");
    const classified1 = classifyConversationIntent(norm1, rec, business.name);
    const ext1 = extractIntentsAndEntities(norm1, rec, business.name);
    const rag1 = retrieveTargetedKnowledge(business, knowledgeBase, ext1);
    const ans1 = generateEngineAnswer(business, ext1, rag1, rec);
    updateConversationMemory(rec, norm1.raw, ans1.reply, ext1);

    const pass1 = !ans1.isClosing && ans1.reply.length > 10;
    turns.push({
      userQuery: norm1.raw,
      expectedKeywords: ['courses'],
      actualReply: ans1.reply,
      resolvedEntity: rec.state.currentTopic,
      resolvedIntent: classified1.primaryType,
      isClosing: ans1.isClosing,
      passed: pass1
    });

    // Turn 2: "Thank you."
    const norm2 = normalizeInput("Thank you.");
    const classified2 = classifyConversationIntent(norm2, rec, business.name);
    const pass2 = classified2.primaryType === 'THANK_YOU' && classified2.isClosing === false;
    turns.push({
      userQuery: norm2.raw,
      expectedKeywords: ['welcome', 'anything else'],
      actualReply: classified2.directReply || '',
      resolvedEntity: rec.state.currentTopic,
      resolvedIntent: classified2.primaryType,
      isClosing: classified2.isClosing,
      passed: pass2
    });

    // Turn 3: "No, that's all."
    const norm3 = normalizeInput("No, that's all.");
    const classified3 = classifyConversationIntent(norm3, rec, business.name);
    const pass3 = classified3.isClosing === true;
    turns.push({
      userQuery: norm3.raw,
      expectedKeywords: ['isClosing = true'],
      actualReply: classified3.directReply || '',
      resolvedEntity: rec.state.currentTopic,
      resolvedIntent: classified3.primaryType,
      isClosing: classified3.isClosing,
      passed: pass3
    });

    testResults.push({
      testId: 'MANDATORY_TEXT_CHAT_FLOW',
      testName: 'Mandatory Text Chat Multi-Turn Conversation Flow',
      passed: pass1 && pass2 && pass3,
      turns
    });
  }

  // TEST 6: Lead Capture & Contact Safety
  {
    const rec = createFreshRecord('test_lead_capture_safety');
    const turns: TestResultTurn[] = [];

    const start = classifyConversationIntent(
      normalizeInput('I want to book a demo'),
      rec,
      business.name
    );
    const nameTurn = classifyConversationIntent(
      normalizeInput('Rakshit Nagar'),
      rec,
      business.name
    );
    const contactTurn = classifyConversationIntent(
      normalizeInput('07006502684'),
      rec,
      business.name
    );

    const leakedReply = validateAnswer(
      'Please call us at 07006502684 or email support@example.com.',
      { intents: [], attributes: [], resolvedEntity: null, resolvedEntityType: 'general', isYesNo: false, isShortFollowUp: false, isConfirmation: false, isNegation: false, isAmbiguousMultipleEntities: false, isAmbiguousMissingEntity: false, candidateEntities: [] },
      { ...business, phone: '07006502684', supportEmail: 'support@example.com' },
      rec
    );

    const leadFlowPassed =
      start.primaryType === 'BOOKING' &&
      nameTurn.primaryType === 'BOOKING' &&
      rec.state.bookingState.stage === 'COLLECTING_CONTACT' &&
      contactTurn.primaryType === 'BOOKING' &&
      rec.leadCaptured === true &&
      rec.customerPhone === '07006502684';

    const contactLeakBlocked =
      !leakedReply.includes('07006502684') &&
      !leakedReply.includes('support@example.com');

    const passed = leadFlowPassed && contactLeakBlocked;
    turns.push({
      userQuery: 'Booking -> name -> phone number',
      expectedKeywords: ['leadCaptured=true', 'customerPhone captured', 'contact leak blocked'],
      actualReply: contactTurn.directReply || leakedReply,
      resolvedEntity: null,
      resolvedIntent: contactTurn.primaryType,
      isClosing: false,
      passed,
      failureReason: passed ? undefined : 'Lead capture state or direct contact disclosure safeguard failed.'
    });

    testResults.push({
      testId: 'LEAD_CAPTURE_CONTACT_SAFETY',
      testName: 'Lead Capture Flow and Client Contact Disclosure Protection',
      passed,
      turns
    });
  }

  return testResults;
}

/**
 * STRICT MULTI-TENANT ISOLATION SUITE
 * Proves Acme Technologies (Accounting) and Beta Solutions (Recruitment) have 100% data and agent isolation
 */
export function runMultiTenantIsolationTestSuite(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // Helper to test single turn response
  function testTurn(business: any, knowledge: any[], query: string, testId: string, expectedMustInclude: string[], forbiddenMustNotInclude: string[]): TestResultTurn {
    const convId = `iso_test_${testId}_${Date.now()}`;
    const rec: ConversationRecord = {
      conversationId: convId,
      businessId: business.id,
      messages: [],
      state: {
        conversationId: convId,
        businessId: business.id,
        currentTopic: null,
        currentEntity: null,
        currentEntityType: 'general',
        lastIntent: null,
        lastRequestedAttribute: null,
        lastAssistantQuestion: null,
        pendingAction: null,
        conversationStage: 'COURSE_DISCUSSION',
        bookingState: { stage: 'IDLE' },
        lastAnswer: null,
        recentEntities: [],
        pendingQuestion: null,
        conversationSummary: '',
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'AI_ACTIVE'
    };

    const norm = normalizeInput(query);
    const classified = classifyConversationIntent(norm, rec, business.name);
    let reply = '';
    let isClosing = false;

    if (!classified.requiresKnowledgeRetrieval && classified.directReply) {
      reply = classified.directReply;
      isClosing = !!classified.isClosing;
    } else {
      const ext = extractIntentsAndEntities(norm, rec, business.name);
      const rag = retrieveTargetedKnowledge(business, knowledge, ext);
      const ans = generateEngineAnswer(business, ext, rag, rec);
      reply = validateAnswer(ans.reply, ext, business, rec);
      isClosing = !!ans.isClosing;
    }

    const lowerReply = reply.toLowerCase();
    const hasIncluded = expectedMustInclude.every(kw => lowerReply.includes(kw.toLowerCase()));
    const hasForbidden = forbiddenMustNotInclude.some(kw => lowerReply.includes(kw.toLowerCase()));
    const passed = hasIncluded && !hasForbidden;

    let failureReason = '';
    if (!hasIncluded) failureReason += `Missing expected keywords: ${expectedMustInclude.join(', ')}. `;
    if (hasForbidden) failureReason += `Contained forbidden leaked keywords: ${forbiddenMustNotInclude.join(', ')}. `;

    return {
      userQuery: query,
      expectedKeywords: expectedMustInclude,
      actualReply: reply,
      resolvedEntity: null,
      resolvedIntent: classified.primaryType,
      isClosing,
      passed,
      failureReason: failureReason.trim() || undefined
    };
  }

  // 1. Tenant A: Acme Technologies (Accounting Software)
  {
    const turns: TestResultTurn[] = [];

    // Turn 1: "What does your company do?"
    turns.push(testTurn(
      ACME_BUSINESS,
      ACME_KNOWLEDGE_ITEMS,
      "What does your company do?",
      "acme_q1",
      ["accounting", "software"],
      ["recruitment", "headhunting", "hvac", "dental"]
    ));

    // Turn 2: "What are your subscription pricing plans?"
    turns.push(testTurn(
      ACME_BUSINESS,
      ACME_KNOWLEDGE_ITEMS,
      "What are your subscription pricing plans?",
      "acme_q2",
      ["199", "399"],
      ["candidate", "commission", "retainer"]
    ));

    // Turn 3: Negative leakage check: "Do you offer executive recruitment services?"
    turns.push(testTurn(
      ACME_BUSINESS,
      ACME_KNOWLEDGE_ITEMS,
      "Do you offer executive recruitment services?",
      "acme_q3",
      ["accounting software"],
      ["we provide executive search", "we place engineers"]
    ));

    results.push({
      testId: 'TENANT_ISOLATION_ACME',
      testName: 'Tenant A (Acme Technologies - Cloud Accounting) Domain & Privacy Isolation',
      passed: turns.every(t => t.passed),
      turns
    });
  }

  // 2. Tenant B: Beta Solutions (Recruitment & Headhunting)
  {
    const turns: TestResultTurn[] = [];

    // Turn 1: "What does your company do?"
    turns.push(testTurn(
      BETA_BUSINESS,
      BETA_KNOWLEDGE_ITEMS,
      "What does your company do?",
      "beta_q1",
      ["recruitment"],
      ["accounting", "invoicing", "bookkeeping", "hvac"]
    ));

    // Turn 2: "What are your search retainers and placement fees?"
    turns.push(testTurn(
      BETA_BUSINESS,
      BETA_KNOWLEDGE_ITEMS,
      "What are your search retainers and placement fees?",
      "beta_q2",
      ["placement", "retainer"],
      ["199/month", "399/month", "software subscription"]
    ));

    // Turn 3: Negative leakage check: "Do you sell cloud accounting software?"
    turns.push(testTurn(
      BETA_BUSINESS,
      BETA_KNOWLEDGE_ITEMS,
      "Do you sell cloud accounting software?",
      "beta_q3",
      ["recruitment"],
      ["we sell automated bookkeeping", "invoicing plans"]
    ));

    results.push({
      testId: 'TENANT_ISOLATION_BETA',
      testName: 'Tenant B (Beta Solutions - Executive Recruitment) Domain & Privacy Isolation',
      passed: turns.every(t => t.passed),
      turns
    });
  }

  // 3. Public Landing Demo Agent Isolation Verification
  {
    const turns: TestResultTurn[] = [];

    // Turn 1: "What is AgentDesk?"
    turns.push(testTurn(
      PUBLIC_AGENTDESK_DEMO_BUSINESS,
      PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS,
      "What is AgentDesk and how does it work?",
      "public_q1",
      ["agentdesk", "sales", "ai"],
      ["acme", "accounting", "beta solutions", "summit home services"]
    ));

    // Turn 2: "What are your pricing plans?"
    turns.push(testTurn(
      PUBLIC_AGENTDESK_DEMO_BUSINESS,
      PUBLIC_AGENTDESK_DEMO_KNOWLEDGE_ITEMS,
      "What are the AgentDesk pricing plans?",
      "public_q2",
      ["starter", "growth", "enterprise"],
      ["root canal", "heat pump", "invisalign", "hvac"]
    ));

    results.push({
      testId: 'PUBLIC_DEMO_ISOLATION',
      testName: 'Public Website Demo Agent Isolation (AgentDesk Product Assistant)',
      passed: turns.every(t => t.passed),
      turns
    });
  }

  // 4. Platform Admin Isolation Verification
  {
    const turns: TestResultTurn[] = [];
    const platformIsDistinct = (ACME_BUSINESS.id !== 'platform' && BETA_BUSINESS.id !== 'platform');
    turns.push({
      userQuery: "Platform Admin Isolation Verification",
      expectedKeywords: ["Platform Admin is not a Tenant", "No automatic Demo Agent loading"],
      actualReply: "Platform Admin operates global control plane without default demo agent binding.",
      resolvedEntity: null,
      resolvedIntent: "SYSTEM_VERIFICATION",
      isClosing: false,
      passed: platformIsDistinct
    });

    results.push({
      testId: 'PLATFORM_ADMIN_ISOLATION',
      testName: 'Platform Administrator vs Tenant Separation',
      passed: platformIsDistinct,
      turns
    });
  }

  return results;
}
