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
assert(firstChat.success && firstChat.conversationId === conversationId, 'First customer message did not create a conversation.');
assert(typeof firstChat.reply === 'string' && firstChat.reply.trim().length > 0, 'AI did not return a customer-facing response.');

const secondChat = await request('/api/widget/chat', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    conversationId,
    message: 'I am interested. How can I get started?'
  })
});
assert(secondChat.success && secondChat.conversationId === conversationId, 'Second customer message did not continue the same conversation.');
assert(typeof secondChat.reply === 'string' && secondChat.reply.trim().length > 0, 'AI did not return a follow-up response.');
assert(secondChat.conversationState && typeof secondChat.conversationState === 'object', 'Conversation state was not returned.');

const lead = await request('/api/widget/lead', {
  method: 'POST',
  body: JSON.stringify({
    agentId,
    conversationId,
    name: 'E2E Test Customer',
    email: `e2e-${Date.now()}@agentdesk.internal`,
    phone: '+10000000000',
    notes: 'Automated end-to-end customer journey test'
  })
});
assert(lead.success && lead.message === 'Lead captured successfully', 'Lead capture failed.');
assert(lead.lead && lead.lead.businessId === config.business.id, 'Captured lead is not associated with the resolved tenant.');
assert(lead.lead.conversationId === conversationId, 'Captured lead is not linked to the customer conversation.');

console.log(JSON.stringify({
  success: true,
  journey: ['widget-config', 'customer-message', 'conversation-continuation', 'lead-capture'],
  agentId,
  businessId: config.business.id,
  conversationId,
  durationMs: Date.now() - startedAt
}, null, 2));
