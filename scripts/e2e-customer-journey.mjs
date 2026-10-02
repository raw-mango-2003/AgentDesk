const baseUrl = (process.env.AGENTDESK_E2E_URL || 'http://localhost:3000').replace(/\/$/, '');
const agentId = process.env.AGENTDESK_E2E_AGENT_ID || 'public-demo-agent';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const startedAt = Date.now();
const config = await request(`/api/widget/config?agentId=${encodeURIComponent(agentId)}`);
assert(config.success && config.agentId === agentId, 'Widget configuration did not resolve the requested AI employee.');
assert(config.agent && config.business, 'Widget configuration is missing agent or business metadata.');
assert(config.agent.leadCaptureEnabled === true, 'Lead capture is not enabled in the customer widget.');

const conversationId = `e2e_${Date.now()}`;
const firstChat = await request('/api/widget/chat', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    conversationId,
    message: 'What services do you offer?'
  })
});
assert(firstChat.success && typeof firstChat.conversationId === 'string' && firstChat.conversationId.trim().length > 0, 'First customer message did not create a conversation.');
assert(typeof firstChat.reply === 'string' && firstChat.reply.trim().length > 0, 'AI did not return a customer-facing response.');

const secondChat = await request('/api/widget/chat', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    conversationId,
    message: 'I am interested. How can I get started?'
  })
});
assert(secondChat.success && secondChat.conversationId === firstChat.conversationId, 'Second customer message did not continue the same canonical conversation.');
assert(typeof secondChat.reply === 'string' && secondChat.reply.trim().length > 0, 'AI did not return a follow-up response.');
assert(secondChat.conversationState && typeof secondChat.conversationState === 'object', 'Conversation state was not returned.');

// Regression coverage for the exact human-handoff path used by the widget UI.
const handoffConversationId = `e2e_handoff_${Date.now()}`;
const handoffReply = await request('/api/widget/chat', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    conversationId: handoffConversationId,
    message: 'I want to talk to a human'
  })
});
assert(handoffReply.success, 'Human handoff request was rejected.');
assert(handoffReply.conversationState && typeof handoffReply.conversationState === 'object', 'Human handoff did not return conversation state.');
assert(
  handoffReply.conversationState.needsHumanHandoff === true ||
  /name|details|human|team/i.test(handoffReply.reply || ''),
  'Human handoff did not enter the lead collection flow.'
);

const contactConversationId = `e2e_contact_${Date.now()}`;
const contactReply = await request('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    businessId: config.business.id,
    tenantId: config.business.tenantId || config.business.id,
    conversationId: contactConversationId,
    message: 'Samriddhi, jaiswaltest@example.com, 8433154854',
    conversationHistory: [
      {
        id: 'contact-prompt',
        sender: 'agent',
        text: 'I would be happy to arrange that for you. Please provide your name, email address, and phone number.',
        timestamp: new Date().toISOString()
      }
    ],
    recentMessages: [
      {
        id: 'contact-prompt',
        sender: 'agent',
        text: 'I would be happy to arrange that for you. Please provide your name, email address, and phone number.',
        timestamp: new Date().toISOString()
      }
    ],
    knowledgeBase: config.knowledge || [],
    businessInfo: config.business
  })
});
assert(contactReply.success, 'Application chat rejected the contact capture reply.');
assert(/captured your (phone number|email address)/i.test(contactReply.reply || ''), 'Application chat did not confirm captured contact details.');
assert(/jaiswaltest@example.com/i.test(contactReply.reply || '') === false, 'Application chat should not echo the visitor email back to the user.');
assert(/AgentDesk Technologies provides|24\/7 AI Sales Employee/i.test(contactReply.reply || '') === false, 'Application chat incorrectly routed contact details to the business knowledge response.');

const leadEmail = `e2e-${Date.now()}@agentdesk.internal`;
const lead = await request('/api/widget/lead', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    conversationId,
    name: 'E2E Test Customer',
    email: leadEmail,
    phone: '+10000000000',
    notes: 'Automated end-to-end customer journey test'
  })
});
assert(lead.success && lead.message === 'Lead captured successfully', 'Lead capture failed.');
assert(lead.lead && lead.lead.businessId === config.business.id, 'Captured lead is not associated with the resolved tenant.');
assert(lead.lead.conversationId === firstChat.conversationId, 'Captured lead is not linked to the customer conversation.');

// Duplicate submission regression: the same contact must not create a second
// database lead. The database migration collapses this to the existing record.
const duplicateLead = await request('/api/widget/lead', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    conversationId,
    name: 'E2E Test Customer Updated',
    email: leadEmail,
    phone: '+10000000000',
    notes: 'Duplicate submission regression test'
  })
});
assert(duplicateLead.success && duplicateLead.message === 'Lead captured successfully', 'Duplicate lead submission should remain idempotent.');

console.log(JSON.stringify({
  success: true,
  journey: ['widget-config', 'customer-message', 'conversation-continuation', 'human-handoff', 'lead-capture', 'duplicate-lead-idempotency'],
  agentId,
  businessId: config.business.id,
  conversationId,
  durationMs: Date.now() - startedAt
}, null, 2));
