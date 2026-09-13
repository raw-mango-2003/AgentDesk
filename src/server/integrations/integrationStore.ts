import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IntegrationRecord } from './interfaces.js';

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
        accountEmail: 'hello.agentdeskhelp@gmail.com',
        encryptedRefreshToken: '',
        status: 'NOT_CONNECTED',
        createdAt: now,
        updatedAt: now
      };
      this.records.set('gmail_oauth', defaultGmail);
      this.saveToDisk();
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
    return updated;
  }

  public getAllIntegrations(): IntegrationRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Generate secure CSRF OAuth state with 10-minute validity
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
    this.oauthStates.set(state, {
      state,
      userId,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000 // 10 minutes
    });
    return state;
  }

  /**
   * Validate and immediately consume OAuth state (one-time use)
   */
  public validateAndConsumeOAuthState(state: string): { valid: boolean; userId?: string } {
    if (!state) return { valid: false };
    const record = this.oauthStates.get(state);
    if (!record) return { valid: false };

    // Consume immediately to prevent replay attacks
    this.oauthStates.delete(state);

    if (Date.now() > record.expiresAt) {
      return { valid: false };
    }
    return { valid: true, userId: record.userId };
  }
}

export const integrationStore = new IntegrationStore();
