import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IntegrationRecord } from './interfaces.js';
import { postgresClient } from '../db/postgresClient.js';

interface OAuthStateRecord {
  state: string;
  userId?: string;
  createdAt: number;
  expiresAt: number;
}

class IntegrationStore {
  private records: Map<string, IntegrationRecord> = new Map();
  private oauthStates: Map<string, OAuthStateRecord> = new Map();
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'integrations_store.json');
    this.initStorage();
  }

  private getEncryptionKey(): Buffer {
    const secret = (process.env.SESSION_SECRET || '').trim();
    if (secret.length < 32) {
      throw new Error(
        'SESSION_SECRET must be configured with at least 32 characters.'
      );
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
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list = JSON.parse(raw) as IntegrationRecord[];
        for (const item of list) {
          this.records.set(item.id, item);
        }
      }
    } catch (err) {
      console.warn('[IntegrationStore:InitWarning] Could not load integrations file from disk:', err);
    }

    // Ensure default Gmail integration record exists
    if (!this.records.has('gmail_oauth')) {
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
      this.records.set('gmail_oauth', defaultGmail);
      this.saveToDisk();
    }

    // Sync with PostgreSQL
    this.syncWithPostgres().catch(() => {});
  }

  private async syncWithPostgres(): Promise<void> {
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
        this.saveToDisk();
      } else {
        // Seed Postgres with existing records
        for (const record of this.records.values()) {
          await this.persistRecordToPostgres(record);
        }
      }
    } catch (err: any) {
      // Non-fatal if postgres is offline
    }
  }

  private async persistRecordToPostgres(record: IntegrationRecord): Promise<void> {
    try {
      const isReady = await postgresClient.initialize();
      if (!isReady) return;

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
      console.warn('[IntegrationStore:PostgresWarning]', err.message);
    }
  }

  private saveToDisk(): void {
    try {
      const list = Array.from(this.records.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[IntegrationStore:SaveError] Failed to persist integrations to disk:', err);
    }
  }

  public getIntegration(id: string): IntegrationRecord | null {
    return this.records.get(id) || null;
  }

  public saveIntegration(record: IntegrationRecord): IntegrationRecord {
    record.updatedAt = new Date().toISOString();
    this.records.set(record.id, record);
    this.saveToDisk();
    this.persistRecordToPostgres(record).catch(() => {});
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
    this.saveToDisk();
    this.persistRecordToPostgres(updated).catch(() => {});
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
   * Persisted in PostgreSQL and memory for multi-instance survivability
   */
  public generateOAuthState(userId?: string): string {
    const now = Date.now();
    // Prune stale states
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
      createdAt: now,
      expiresAt
    });

    // Asynchronously insert into PostgreSQL
    postgresClient.initialize().then(connected => {
      if (connected) {
        postgresClient.query(`
          INSERT INTO agentdesk_oauth_states (state, user_id, created_at, expires_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (state) DO NOTHING
        `, [state, userId || null, now, expiresAt]).catch(() => {});
      }
    }).catch(() => {});

    return state;
  }

  /**
   * Validate and immediately consume OAuth state (one-time use)
   * Enforces single-use consumption across memory and PostgreSQL
   */
  public validateAndConsumeOAuthState(state: string): { valid: boolean; userId?: string } {
    if (!state) return { valid: false };

    // Asynchronously delete from PostgreSQL to prevent replay attacks across instances
    postgresClient.initialize().then(connected => {
      if (connected) {
        postgresClient.query('DELETE FROM agentdesk_oauth_states WHERE state = $1', [state]).catch(() => {});
      }
    }).catch(() => {});

    const record = this.oauthStates.get(state);
    if (!record) {
      return { valid: false };
    }

    // Consume immediately from memory (single-use)
    this.oauthStates.delete(state);

    if (Date.now() > record.expiresAt) {
      return { valid: false };
    }
    return { valid: true, userId: record.userId };
  }
}

export const integrationStore = new IntegrationStore();
