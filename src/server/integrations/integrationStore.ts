import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { IntegrationRecord } from './interfaces.js';
import { postgresClient } from '../db/postgresClient.js';

interface OAuthStateRecord {
  state: string;
  userId?: string;
  tenantId?: string;
  provider?: string;
  redirectUrl?: string;
  createdAt: number;
  expiresAt: number;
}

class IntegrationStore {
  private records: Map<string, IntegrationRecord> = new Map();
  private oauthStates: Map<string, OAuthStateRecord> = new Map();
  private readonly filePath: string = path.join(process.cwd(), 'data', 'integrations_store.json');

  constructor() {
    this.initStorage();
  }

  private getEncryptionKey(): Buffer {
    const secret = (process.env.SESSION_SECRET || '').trim();
    if (secret.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'SESSION_SECRET must be configured with at least 32 characters in production.'
        );
      }
      return crypto.createHash('sha256').update('agentdesk-secure-local-session-secret-32-chars-minimum-fallback').digest();
    }
    return crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Encrypt sensitive credentials using AES-256-GCM
   */
  public encryptSecret(plainText: string): string {
    if (!plainText) return '';
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
      const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (err) {
      console.error('[IntegrationStore:EncryptError] Failed to encrypt secret');
      return '';
    }
  }

  /**
   * Decrypt sensitive credentials using AES-256-GCM
   */
  public decryptSecret(cipherText: string): string {
    if (!cipherText || !cipherText.includes(':')) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) return '';
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (err) {
      console.error('[IntegrationStore:DecryptError] Failed to decrypt secret');
      return '';
    }
  }

  private initStorage(): void {
    const now = new Date().toISOString();
    const defaultGmail: IntegrationRecord = {
      id: 'gmail_oauth',
      provider: 'GOOGLE',
      type: 'GMAIL',
      accountEmail: 'hello.agentdesktech@gmail.com',
      encryptedRefreshToken: '',
      status: 'NOT_CONNECTED',
      createdAt: now,
      updatedAt: now
    };

    // Load the encrypted local integration store first. This is important for
    // Google AI Studio deployments where PostgreSQL is not configured and the
    // process may restart. Secrets are never written in plaintext.
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const record of parsed) {
            if (record?.id) this.records.set(record.id, record as IntegrationRecord);
          }
        }
      }
    } catch (err: any) {
      console.warn('[IntegrationStore:DiskLoadWarning]', err.message);
    }

    if (!this.records.has('gmail_oauth')) {
      this.records.set('gmail_oauth', defaultGmail);
      this.persistToDisk();
    }

    // PostgreSQL remains the preferred source of truth when configured.
    this.syncWithPostgres().catch(() => {});
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(
        tempPath,
        JSON.stringify(Array.from(this.records.values()), null, 2),
        { encoding: 'utf-8', mode: 0o600 }
      );
      fs.renameSync(tempPath, this.filePath);
    } catch (err: any) {
      console.warn('[IntegrationStore:DiskSaveWarning]', err.message);
    }
  }

  public async syncWithPostgres(): Promise<void> {
    try {
      const connected = await postgresClient.initialize();
      if (!connected) return;

      const res = await postgresClient.query('SELECT * FROM agentdesk_integrations');
      if (res && res.rows && res.rows.length > 0) {
        for (const row of res.rows) {
          this.records.set(row.id, {
            id: row.id,
            provider: row.provider,
            type: row.type,
            accountEmail: row.account_email,
            encryptedRefreshToken: row.encrypted_refresh_token || '',
            encryptedClientId: row.encrypted_client_id || undefined,
            encryptedClientSecret: row.encrypted_client_secret || undefined,
            status: row.status,
            connectedAt: row.connected_at || undefined,
            lastSuccessfulSendAt: row.last_successful_send_at || undefined,
            lastError: row.last_error || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          });
        }
      } else {
        // Seed Postgres with default records
        for (const record of this.records.values()) {
          await this.persistRecordToPostgres(record);
        }
      }
    } catch (err: any) {
      console.warn('[IntegrationStore:SyncWarning]', err.message);
    }
  }

  public async persistRecordToPostgres(record: IntegrationRecord): Promise<void> {
    try {
      const isReady = await postgresClient.initialize();
      if (!isReady) {
        if (postgresClient.isConfigured() || process.env.NODE_ENV === 'production') {
          throw new Error('Database connection failed: Cannot persist integration without PostgreSQL.');
        }
        return;
      }

      await postgresClient.query(`
        INSERT INTO agentdesk_integrations (
          id, provider, type, account_email, encrypted_refresh_token,
          encrypted_client_id, encrypted_client_secret,
          status, connected_at, last_successful_send_at, last_error, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          provider = EXCLUDED.provider,
          type = EXCLUDED.type,
          account_email = EXCLUDED.account_email,
          encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
          encrypted_client_id = EXCLUDED.encrypted_client_id,
          encrypted_client_secret = EXCLUDED.encrypted_client_secret,
          status = EXCLUDED.status,
          connected_at = EXCLUDED.connected_at,
          last_successful_send_at = EXCLUDED.last_successful_send_at,
          last_error = EXCLUDED.last_error,
          updated_at = EXCLUDED.updated_at
      `, [
        record.id,
        record.provider,
        record.type,
        record.accountEmail,
        record.encryptedRefreshToken || null,
        record.encryptedClientId || null,
        record.encryptedClientSecret || null,
        record.status,
        record.connectedAt || null,
        record.lastSuccessfulSendAt || null,
        record.lastError || null,
        record.createdAt,
        record.updatedAt
      ]);
    } catch (err: any) {
      console.error('[IntegrationStore:PostgresError]', err.message);
      throw err;
    }
  }

  public getIntegration(id: string): IntegrationRecord | null {
    return this.records.get(id) || null;
  }

  public async getIntegrationAsync(id: string): Promise<IntegrationRecord | null> {
    try {
      const isReady = await postgresClient.initialize();
      if (isReady) {
        const res = await postgresClient.query('SELECT * FROM agentdesk_integrations WHERE id = $1 LIMIT 1', [id]);
        if (res && res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          const record: IntegrationRecord = {
            id: row.id,
            provider: row.provider,
            type: row.type,
            accountEmail: row.account_email,
            encryptedRefreshToken: row.encrypted_refresh_token || '',
            encryptedClientId: row.encrypted_client_id || undefined,
            encryptedClientSecret: row.encrypted_client_secret || undefined,
            status: row.status,
            connectedAt: row.connected_at || undefined,
            lastSuccessfulSendAt: row.last_successful_send_at || undefined,
            lastError: row.last_error || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
          this.records.set(id, record);
          return record;
        }
      }
    } catch (err: any) {
      console.warn('[IntegrationStore:LookupError]', err.message);
    }
    return this.getIntegration(id);
  }

  public saveIntegration(record: IntegrationRecord): IntegrationRecord {
    record.updatedAt = new Date().toISOString();
    this.records.set(record.id, record);
    this.persistToDisk();
    this.persistRecordToPostgres(record).catch((err) => {
      console.error('[IntegrationStore:SaveFailed]', err.message);
    });
    return record;
  }

  public async saveIntegrationAsync(record: IntegrationRecord): Promise<IntegrationRecord> {
    record.updatedAt = new Date().toISOString();
    await this.persistRecordToPostgres(record);
    this.records.set(record.id, record);
    this.persistToDisk();
    return record;
  }

  public updateIntegration(id: string, updates: Partial<IntegrationRecord>): IntegrationRecord | null {
    const existing = this.records.get(id);
    if (!existing) return null;
    const updated: IntegrationRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.records.set(id, updated);
    this.persistToDisk();
    this.persistRecordToPostgres(updated).catch((err) => {
      console.error('[IntegrationStore:UpdateFailed]', err.message);
    });
    return updated;
  }

  public async updateIntegrationAsync(id: string, updates: Partial<IntegrationRecord>): Promise<IntegrationRecord | null> {
    const existing = await this.getIntegrationAsync(id);
    if (!existing) return null;
    const updated: IntegrationRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.persistRecordToPostgres(updated);
    this.records.set(id, updated);
    this.persistToDisk();
    return updated;
  }

  public getAllIntegrations(): IntegrationRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Securely encrypt and persist administrator-configured Google OAuth credentials
   */
  public saveClientCredentials(clientId: string, clientSecret: string): void {
    const encryptedClientId = this.encryptSecret(clientId);
    const encryptedClientSecret = this.encryptSecret(clientSecret);
    this.updateIntegration('gmail_oauth', {
      encryptedClientId,
      encryptedClientSecret
    });
  }

  /**
   * Decrypt and return persisted Google OAuth credentials if stored
   */
  public getClientCredentials(): { clientId: string; clientSecret: string } {
    const rec = this.getIntegration('gmail_oauth');
    const clientId = rec?.encryptedClientId ? this.decryptSecret(rec.encryptedClientId) : '';
    const clientSecret = rec?.encryptedClientSecret ? this.decryptSecret(rec.encryptedClientSecret) : '';
    return { clientId, clientSecret };
  }

  /**
   * Generate secure CSRF OAuth state with 10-minute validity
   * Persisted in PostgreSQL (authoritative) and memory for multi-instance survivability
   */
  public async generateOAuthState(
    userId?: string,
    tenantId?: string,
    redirectUrl?: string,
    provider: string = 'GOOGLE'
  ): Promise<string> {
    const now = Date.now();
    // Prune stale states from cache
    for (const [key, val] of this.oauthStates.entries()) {
      if (val.expiresAt < now) {
        this.oauthStates.delete(key);
      }
    }

    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    this.oauthStates.set(state, {
      state,
      userId,
      tenantId,
      provider,
      redirectUrl,
      createdAt: now,
      expiresAt
    });

    // Write to PostgreSQL (authoritative)
    try {
      const connected = await postgresClient.initialize();
      if (connected) {
        await postgresClient.query(`
          INSERT INTO agentdesk_oauth_states (state, user_id, tenant_id, provider, redirect_url, created_at, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (state) DO UPDATE SET
            expires_at = EXCLUDED.expires_at,
            user_id = EXCLUDED.user_id,
            tenant_id = EXCLUDED.tenant_id
        `, [state, userId || null, tenantId || null, provider, redirectUrl || null, now, expiresAt]);
      } else if (postgresClient.isConfigured() || process.env.NODE_ENV === 'production') {
        throw new Error('Database unavailable: Cannot persist OAuth state.');
      }
    } catch (err: any) {
      console.warn('[OAuthState:PostgresInsertWarning]', err.message);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }

    return state;
  }

  /**
   * Validate and immediately consume OAuth state (one-time use)
   * Enforces single-use atomic consumption in PostgreSQL and memory
   */
  public async validateAndConsumeOAuthState(
    state: string,
    expectedTenantId?: string
  ): Promise<{ valid: boolean; userId?: string; tenantId?: string; redirectUrl?: string }> {
    if (!state || typeof state !== 'string') return { valid: false };

    const now = Date.now();

    // 1. First attempt atomic consumption from PostgreSQL (authoritative)
    try {
      const connected = await postgresClient.initialize();
      if (connected) {
        const res = await postgresClient.query(`
          DELETE FROM agentdesk_oauth_states 
          WHERE state = $1 AND expires_at > $2
          RETURNING user_id, tenant_id, redirect_url, provider
        `, [state, now]);

        if (res && res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          this.oauthStates.delete(state);

          if (expectedTenantId && row.tenant_id && row.tenant_id.toLowerCase() !== expectedTenantId.toLowerCase()) {
            return { valid: false };
          }

          return {
            valid: true,
            userId: row.user_id || undefined,
            tenantId: row.tenant_id || undefined,
            redirectUrl: row.redirect_url || undefined
          };
        }
        // If Postgres is connected and returned 0 rows, the state is either invalid, already consumed, or expired
        this.oauthStates.delete(state);
        return { valid: false };
      }
    } catch (err: any) {
      console.warn('[OAuthState:PostgresQueryWarning]', err.message);
    }

    // 2. Fallback to memory store if PostgreSQL is in standby
    const record = this.oauthStates.get(state);
    if (!record) {
      return { valid: false };
    }

    // Consume immediately (single-use)
    this.oauthStates.delete(state);

    if (now > record.expiresAt) {
      return { valid: false };
    }

    if (expectedTenantId && record.tenantId && record.tenantId.toLowerCase() !== expectedTenantId.toLowerCase()) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: record.userId,
      tenantId: record.tenantId,
      redirectUrl: record.redirectUrl
    };
  }
}

export const integrationStore = new IntegrationStore();
