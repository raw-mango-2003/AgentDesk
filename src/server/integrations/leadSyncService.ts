import crypto from 'crypto';
import { integrationStore } from './integrationStore.js';
import { queueService } from './queueService.js';

export interface LeadSpreadsheetSyncResult {
  configured: boolean;
  delivered: boolean;
  queued?: boolean;
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

async function getTenantWebhookConfig(tenantId: string): Promise<Record<string, string>> {
  try {
    await integrationStore.syncWithPostgres();
  } catch {
    // The in-memory integration store may still have a valid tenant configuration.
  }
  return integrationStore.getTenantIntegrationConfig(tenantId, 'custom_webhook');
}

export async function deliverLeadToSpreadsheet(
  lead: Record<string, any>,
  business: Record<string, any>,
  conversation?: Record<string, any>
): Promise<LeadSpreadsheetSyncResult> {
  const tenantId = String(lead.tenantId || lead.businessId || business.id || '').trim().toLowerCase();
  if (!tenantId) return { configured: false, delivered: false };

  const configured = await getTenantWebhookConfig(tenantId);
  // Never fall back to a global spreadsheet webhook. A customer lead must only
  // be delivered through that tenant's explicitly configured integration.
  const webhookUrl = String(
    configured.webhook_url || configured.lead_webhook_url || ''
  ).trim();

  const url = validateWebhookUrl(webhookUrl);
  if (!url) return { configured: false, delivered: false };

  const occurredAt = new Date().toISOString();
  const leadName = String(lead.name || '');
  const email = String(lead.email || '');
  const phone = String(lead.phone || '');
  const message = String(
    lead.message ||
    lead.notes ||
    lead.requirement ||
    lead.details?.latestMessage ||
    ''
  );
  const date = String(lead.createdAt || occurredAt);

  // Keep the structured envelope for future integrations, while also exposing
  // flat fields for automation tools such as Activepieces/Google Sheets.
  // The flat fields intentionally match the AgentDesk Leads Data sheet columns.
  const payload = {
    schemaVersion: '1.0',
    event: 'lead.created',
    source: 'agentdesk',
    occurredAt,

    // Activepieces / Google Sheets mapping fields
    date,
    leadName,
    email,
    phone,
    message,

    tenantId,
    businessId: String(lead.businessId || tenantId),
    businessName: String(business.name || ''),
    lead: {
      id: String(lead.id || ''),
      name: leadName,
      email,
      phone,
      company: String(lead.company || ''),
      source: String(lead.source || 'AI Chat Widget'),
      status: String(lead.status || 'new'),
      score: Number(lead.score || 0),
      scoreCategory: String(lead.scoreCategory || ''),
      requirement: String(lead.requirement || ''),
      message,
      notes: String(lead.notes || ''),
      serviceInterest: String(lead.serviceInterest || ''),
      timeline: String(lead.timeline || ''),
      budget: String(lead.budget || ''),
      location: String(lead.location || ''),
      conversationId: String(lead.conversationId || ''),
      createdAt: date
    },
    conversation: {
      conversationId: String(conversation?.conversationId || lead.conversationId || ''),
      status: String(conversation?.status || 'HUMAN_REQUIRED'),
      currentTopic: String(conversation?.state?.currentTopic || ''),
      language: String(conversation?.state?.language || ''),
      latestMessage: message
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

  return { configured: true, delivered: false, error: lastError };
}

export async function syncLeadToSpreadsheet(
  lead: Record<string, any>,
  business: Record<string, any>,
  conversation?: Record<string, any>
): Promise<LeadSpreadsheetSyncResult> {
  const result = await deliverLeadToSpreadsheet(lead, business, conversation);
  if (!result.configured || result.delivered) return result;

  try {
    await queueService.enqueue(
      'sync_lead_spreadsheet' as any,
      { lead, business, conversation },
      { maxAttempts: 5, delayMs: 15000 }
    );
    return { ...result, queued: true };
  } catch (error: any) {
    console.error('[LeadSpreadsheetSync] Failed to enqueue retry:', error?.message || error);
    return result;
  }
}
