import { postgresClient } from '../db/postgresClient.js';

export type DeliveryChannel = 'email' | 'sms' | 'whatsapp' | 'webhook';
export type DeliveryStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'NOT_CONFIGURED' | 'RETRYING';

export interface DeliveryLogRecord {
  id: string;
  tenantId?: string;
  channel: DeliveryChannel;
  recipient?: string;
  eventType: string;
  status: DeliveryStatus;
  provider?: string;
  providerId?: string;
  error?: string;
  retryCount: number;
  payload?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

class DeliveryLogService {
  private memory = new Map<string, DeliveryLogRecord>();

  async record(input: Omit<DeliveryLogRecord, 'createdAt' | 'updatedAt'>): Promise<DeliveryLogRecord> {
    const now = new Date().toISOString();
    const record = { ...input, createdAt: now, updatedAt: now };
    this.memory.set(record.id, record);
    try {
      if (await postgresClient.initialize()) {
        await postgresClient.query(
          `INSERT INTO agentdesk_delivery_logs
           (id, tenant_id, channel, recipient, event_type, status, provider, provider_id, error, retry_count, payload, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
          [record.id, record.tenantId || null, record.channel, record.recipient || null, record.eventType, record.status,
           record.provider || null, record.providerId || null, record.error || null, record.retryCount,
           record.payload ? JSON.stringify(record.payload) : null, now]
        );
      }
    } catch (err: any) {
      console.warn('[DeliveryLog] Persistence unavailable:', err.message);
    }
    return record;
  }

  async update(id: string, updates: Partial<DeliveryLogRecord>): Promise<DeliveryLogRecord | null> {
    const existing = this.memory.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.memory.set(id, updated);
    try {
      if (await postgresClient.initialize()) {
        await postgresClient.query(
          `UPDATE agentdesk_delivery_logs SET status=$2, provider=$3, provider_id=$4, error=$5, retry_count=$6, updated_at=$7 WHERE id=$1`,
          [id, updated.status, updated.provider || null, updated.providerId || null, updated.error || null, updated.retryCount, updated.updatedAt]
        );
      }
    } catch (err: any) {
      console.warn('[DeliveryLog] Update persistence unavailable:', err.message);
    }
    return updated;
  }

  async list(filter: { tenantId?: string; channel?: string; status?: string; limit?: number } = {}): Promise<DeliveryLogRecord[]> {
    try {
      if (await postgresClient.initialize()) {
        const conditions: string[] = [];
        const params: any[] = [];
        if (filter.tenantId) { params.push(filter.tenantId); conditions.push(`tenant_id = $${params.length}`); }
        if (filter.channel) { params.push(filter.channel); conditions.push(`channel = $${params.length}`); }
        if (filter.status) { params.push(filter.status); conditions.push(`status = $${params.length}`); }
        params.push(Math.min(Math.max(filter.limit || 100, 1), 500));
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await postgresClient.query(
          `SELECT * FROM agentdesk_delivery_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
          params
        );
        return result.rows.map((r: any) => ({
          id: r.id, tenantId: r.tenant_id || undefined, channel: r.channel, recipient: r.recipient || undefined,
          eventType: r.event_type, status: r.status, provider: r.provider || undefined, providerId: r.provider_id || undefined,
          error: r.error || undefined, retryCount: Number(r.retry_count || 0), payload: r.payload || undefined,
          createdAt: r.created_at, updatedAt: r.updated_at
        }));
      }
    } catch (err: any) {
      console.warn('[DeliveryLog] List persistence unavailable:', err.message);
    }
    return Array.from(this.memory.values())
      .filter(r => !filter.tenantId || r.tenantId === filter.tenantId)
      .filter(r => !filter.channel || r.channel === filter.channel)
      .filter(r => !filter.status || r.status === filter.status)
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.min(Math.max(filter.limit || 100, 1), 500));
  }
}

export const deliveryLogService = new DeliveryLogService();
