import crypto from 'crypto';
import { integrationStore } from './integrationStore.js';

export interface LeadSpreadsheetSyncResult {
  configured: boolean;
  delivered: boolean;
  status?: number;
  error?: string;
}

function validateWebhookUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const blocked =
      host === 'localhost' || host === '0.0.0.0' || host === '::1' ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    return blocked ? null : url;
  } catch {
    return null;
  }
}

export async function syncLeadToSpreadsheet(
  lead: Record<string, any>,
  business: Record<string, any>,
  conversation?: Record<string, any>
): Promise<LeadSpreadsheetSyncResult> {
  const tenantId = String(lead.tenantId || lead.businessId || business.id || '').trim().toLowerCase();
  if (!tenantId) return { configured: false, delivered: false };

  try {
    await integrationStore.syncWithPostgres();
  } catch {
    // The in-memory integration store may still have a valid configuration.
  }

  const configured = integrationStore.getTenantIntegrationConfig(tenantId, 'custom_webhook');
  const webhookUrl = String(
    configured.webhook_url ||
    configured.lead_webhook_url ||
    process.env.LEAD_SPREADSHEET_WEBHOOK_URL ||
    ''
  ).trim();

  const url = validateWebhookUrl(webhookUrl);
  if (!url) return { configured: false, delivered: false };

  const payload = {
    schemaVersion: '1.0',
    event: 'lead.created',
    source: 'agentdesk',
    occurredAt: new Date().toISOString(),
    tenantId,
    businessId: String(lead.businessId || tenantId),
    businessName: String(business.name || ''),
    lead: {
      id: String(lead.id || ''),
      name: String(lead.name || ''),
      email: String(lead.email || ''),
      phone: String(lead.phone || ''),
      company: String(lead.company || ''),
      source: String(lead.source || 'AI Chat Widget'),
      status: String(lead.status || 'new'),
      score: Number(lead.score || 0),
      scoreCategory: String(lead.scoreCategory || ''),
      requirement: String(lead.requirement || ''),
      message: String(lead.message || ''),
      notes: String(lead.notes || ''),
      serviceInterest: String(lead.serviceInterest || ''),
      timeline: String(lead.timeline || ''),
      budget: String(lead.budget || ''),
      location: String(lead.location || ''),
      conversationId: String(lead.conversationId || ''),
      createdAt: String(lead.createdAt || new Date().toISOString())
    },
    conversation: {
      conversationId: String(conversation?.conversationId || lead.conversationId || ''),
      status: String(conversation?.status || 'HUMAN_REQUIRED'),
      currentTopic: String(conversation?.state?.currentTopic || ''),
      language: String(conversation?.state?.language || ''),
      latestMessage: String(lead.details?.latestMessage || lead.message || '')
    }
  };

  const body = JSON.stringify(payload);
  const secret = String(configured.signing_secret || '').trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (secret) {
    headers['X-AgentDesk-Signature'] = crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  let lastError = 'Webhook delivery failed.';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      if (response.ok) {
        return { configured: true, delivered: true, status: response.status };
      }
      lastError = `HTTP ${response.status}`;
    } catch (error: any) {
      lastError = error?.name === 'AbortError' ? 'Webhook request timed out.' : String(error?.message || error);
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 300));
  }

  console.warn('[LeadSpreadsheetSync] Delivery failed:', lastError);
  return { configured: true, delivered: false, error: lastError };
}
