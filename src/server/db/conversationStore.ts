import { postgresClient } from './postgresClient.js';
import { ConversationRecord } from '../../lib/conversationEngine.js';

// In-memory cache for fast conversational lookups (PostgreSQL is authoritative store)
const conversationsCache = new Map<string, ConversationRecord>();

export class ConversationStore {
  /**
   * Resolve composite key for memory cache
   */
  private getKey(businessId: string, conversationId: string): string {
    const normBiz = (businessId || 'agentdesk-demo').trim().toLowerCase();
    const normId = (conversationId || `conv_${normBiz}_${Date.now()}`).trim();
    return `${normBiz}:${normId}`;
  }

  /**
   * Fetch conversation from PostgreSQL authoritative store, falling back to cache
   */
  public async getConversationAsync(conversationId: string, businessId: string): Promise<ConversationRecord | null> {
    const normBiz = (businessId || 'agentdesk-demo').trim().toLowerCase();
    const normId = conversationId.trim();
    const key = this.getKey(normBiz, normId);

    // 1. Try PostgreSQL lookup
    try {
      const isReady = await postgresClient.initialize();
      if (isReady) {
        const res = await postgresClient.query(`
          SELECT id, business_id, tenant_id, status, messages, summary, state, created_at, updated_at
          FROM agentdesk_conversations
          WHERE id = $1 AND (business_id = $2 OR tenant_id = $2)
          LIMIT 1
        `, [normId, normBiz]);

        if (res && res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          const record: ConversationRecord = {
            conversationId: row.id,
            businessId: row.business_id,
            status: row.status || 'AI_ACTIVE',
            messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : (row.messages || []),
            state: typeof row.state === 'string' ? JSON.parse(row.state) : (row.state || {
              conversationId: row.id,
              businessId: row.business_id,
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
              conversationSummary: row.summary || '',
              updatedAt: row.updated_at
            }),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };

          conversationsCache.set(key, record);
          return record;
        }
      }
    } catch (err: any) {
      console.warn('[ConversationStore:GetWarning]', err.message);
      if (process.env.NODE_ENV === 'production') throw err;
    }

    // 2. Memory cache fallback
    return conversationsCache.get(key) || null;
  }

  /**
   * Retrieve existing or create a new conversation record.
   * Immediately persists to PostgreSQL as source of truth.
   */
  public async getOrCreateConversationAsync(conversationId?: string, businessId?: string): Promise<ConversationRecord> {
    const normBiz = (businessId || 'agentdesk-demo').trim().toLowerCase();
    const normId = (conversationId || `conv_${normBiz}_${Date.now()}`).trim();
    const key = this.getKey(normBiz, normId);

    const existing = await this.getConversationAsync(normId, normBiz);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newRecord: ConversationRecord = {
      conversationId: normId,
      businessId: normBiz,
      messages: [],
      state: {
        conversationId: normId,
        businessId: normBiz,
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
        updatedAt: now
      },
      createdAt: now,
      updatedAt: now,
      status: 'AI_ACTIVE'
    };

    conversationsCache.set(key, newRecord);
    await this.persistConversationAsync(newRecord);
    return newRecord;
  }

  /**
   * Persist conversation record directly to PostgreSQL
   */
  public async persistConversationAsync(record: ConversationRecord): Promise<void> {
    const key = this.getKey(record.businessId, record.conversationId);
    conversationsCache.set(key, record);

    try {
      const isReady = await postgresClient.initialize();
      if (!isReady) {
        if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_PERSISTENT_CONVERSATIONS === 'true') {
          throw new Error('PostgreSQL is offline: Cannot persist conversation record.');
        }
        return;
      }

      await postgresClient.query(`
        INSERT INTO agentdesk_conversations (
          id, business_id, tenant_id, status, messages, summary, state, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          business_id = EXCLUDED.business_id,
          tenant_id = EXCLUDED.tenant_id,
          status = EXCLUDED.status,
          messages = EXCLUDED.messages,
          summary = EXCLUDED.summary,
          state = EXCLUDED.state,
          updated_at = EXCLUDED.updated_at
        WHERE agentdesk_conversations.business_id = EXCLUDED.business_id
          AND COALESCE(agentdesk_conversations.tenant_id, agentdesk_conversations.business_id) = EXCLUDED.tenant_id
      `, [
        record.conversationId,
        record.businessId,
        record.businessId,
        record.status || 'AI_ACTIVE',
        JSON.stringify(record.messages || []),
        record.state?.conversationSummary || '',
        JSON.stringify(record.state || {}),
        record.createdAt,
        record.updatedAt || new Date().toISOString()
      ]);
    } catch (err: any) {
      console.warn('[ConversationStore:PersistWarning]', err.message);
      if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_PERSISTENT_CONVERSATIONS === 'true') {
        throw err;
      }
    }
  }

  /**
   * Retrieve all conversations for a specific business/tenant from PostgreSQL
   */
  public async getConversationsByBusinessAsync(businessId: string): Promise<ConversationRecord[]> {
    const normBiz = (businessId || '').trim().toLowerCase();
    const records: ConversationRecord[] = [];

    try {
      const isReady = await postgresClient.initialize();
      if (isReady) {
        const res = await postgresClient.query(`
          SELECT id, business_id, tenant_id, status, messages, summary, state, created_at, updated_at
          FROM agentdesk_conversations
          WHERE business_id = $1 OR tenant_id = $1
          ORDER BY updated_at DESC
        `, [normBiz]);

        if (res && res.rows) {
          for (const row of res.rows) {
            records.push({
              conversationId: row.id,
              businessId: row.business_id,
              status: row.status || 'AI_ACTIVE',
              messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : (row.messages || []),
              state: typeof row.state === 'string' ? JSON.parse(row.state) : (row.state || {}),
              createdAt: row.created_at,
              updatedAt: row.updated_at
            });
          }
          return records;
        }
      }
    } catch (err: any) {
      console.warn('[ConversationStore:LookupListWarning]', err.message);
      if (process.env.NODE_ENV === 'production') throw err;
    }

    // Fallback to cache
    for (const [key, rec] of conversationsCache.entries()) {
      if (key.startsWith(`${normBiz}:`) || rec.businessId === normBiz) {
        records.push(rec);
      }
    }
    return records;
  }

  public async updateConversationStatusAsync(
    conversationId: string,
    businessId: string,
    status: ConversationRecord['status']
  ): Promise<ConversationRecord | null> {
    const record = await this.getConversationAsync(conversationId, businessId);
    if (!record) return null;
    record.status = status;
    record.updatedAt = new Date().toISOString();
    conversationsCache.set(this.getKey(businessId, conversationId), record);
    await this.persistConversationAsync(record);
    return record;
  }

  /**
   * Delete conversations for a business/tenant from PostgreSQL and memory
   */
  public async deleteConversationsByBusinessAsync(businessId: string): Promise<number> {
    const normBiz = (businessId || '').trim().toLowerCase();
    let deletedCount = 0;

    // Remove from cache
    for (const key of Array.from(conversationsCache.keys())) {
      const rec = conversationsCache.get(key);
      if (key.startsWith(`${normBiz}:`) || rec?.businessId === normBiz) {
        conversationsCache.delete(key);
        deletedCount++;
      }
    }

    // Remove from PostgreSQL
    try {
      const isReady = await postgresClient.initialize();
      if (isReady) {
        const res = await postgresClient.query(`
          DELETE FROM agentdesk_conversations
          WHERE business_id = $1 OR tenant_id = $1
        `, [normBiz]);
        if (res && typeof res.rowCount === 'number') {
          deletedCount = Math.max(deletedCount, res.rowCount);
        }
      }
    } catch (err: any) {
      console.warn('[ConversationStore:DeleteWarning]', err.message);
      if (process.env.NODE_ENV === 'production') throw err;
    }

    return deletedCount;
  }

  /**
   * Synchronous accessor for compatibility with existing synchronous callers.
   * Immediately updates memory cache and triggers asynchronous PostgreSQL persistence.
   */
  public getOrCreateConversationSync(conversationId?: string, businessId?: string): ConversationRecord {
    const normBiz = (businessId || 'agentdesk-demo').trim().toLowerCase();
    const normId = (conversationId || `conv_${normBiz}_${Date.now()}`).trim();
    const key = this.getKey(normBiz, normId);

    if (conversationsCache.has(key)) {
      return conversationsCache.get(key)!;
    }

    const now = new Date().toISOString();
    const record: ConversationRecord = {
      conversationId: normId,
      businessId: normBiz,
      messages: [],
      state: {
        conversationId: normId,
        businessId: normBiz,
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
        updatedAt: now
      },
      createdAt: now,
      updatedAt: now,
      status: 'AI_ACTIVE'
    };

    conversationsCache.set(key, record);
    this.persistConversationAsync(record).catch(() => {});
    return record;
  }
}

export const conversationStore = new ConversationStore();
