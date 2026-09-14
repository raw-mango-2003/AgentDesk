import fs from 'fs';
import path from 'path';
import { IAuditLogService, AuditLogEntry } from './interfaces.js';
import { postgresClient } from '../db/postgresClient.js';

export class AuditLogService implements IAuditLogService {
  private logs: AuditLogEntry[] = [];
  private filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), 'data', 'audit_logs.json');
    this.ensureDirectory();
    this.loadHistoricalLogs();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn('[AuditLogService] Failed to create data dir:', err);
      }
    }
  }

  private loadHistoricalLogs(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(0, 5000);
        }
      }
    } catch (err) {
      console.warn('[AuditLogService] Could not read audit logs from disk:', err);
    }

    // Sync from PostgreSQL if available
    this.syncFromPostgres().catch(() => {});
  }

  private async syncFromPostgres(): Promise<void> {
    try {
      const isReady = await postgresClient.initialize();
      if (!isReady) return;

      const res = await postgresClient.query(`
        SELECT id, actor_id, actor_email, actor_role, action, entity_type, entity_id, result, metadata, timestamp
        FROM agentdesk_audit_logs
        ORDER BY timestamp DESC
        LIMIT 1000
      `);

      if (res && res.rows && res.rows.length > 0) {
        const dbLogs: AuditLogEntry[] = res.rows.map((row: any) => ({
          id: row.id,
          actorId: row.actor_id,
          actorEmail: row.actor_email,
          actorRole: row.actor_role,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          metadata: row.metadata,
          timestamp: row.timestamp
        }));

        // Merge with existing logs, deduplicating by ID
        const existingIds = new Set(this.logs.map(l => l.id));
        for (const log of dbLogs) {
          if (!existingIds.has(log.id)) {
            this.logs.push(log);
            existingIds.add(log.id);
          }
        }
        this.logs.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
        this.persistToDisk();
      }
    } catch (err) {
      // Non-fatal if postgres is unavailable
    }
  }

  private persistToDisk(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.logs.slice(0, 5000), null, 2), 'utf-8');
    } catch (err) {
      console.error('[AuditLogService] Failed to persist audit logs to disk:', err);
    }
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('hash') ||
        lower.includes('key')
      ) {
        clean[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        clean[key] = this.sanitizeMetadata(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const record: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...entry,
      metadata: this.sanitizeMetadata(entry.metadata),
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(record); // newest first
    if (this.logs.length > 5000) {
      this.logs.pop();
    }

    this.persistToDisk();

    // Asynchronously persist to Postgres
    postgresClient.initialize().then(connected => {
      if (connected) {
        postgresClient.query(`
          INSERT INTO agentdesk_audit_logs (id, actor_id, actor_email, actor_role, action, entity_type, entity_id, result, metadata, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          record.id,
          record.actorId || '',
          record.actorEmail || '',
          record.actorRole || '',
          record.action,
          record.entityType,
          record.entityId || null,
          'SUCCESS',
          JSON.stringify(record.metadata || {}),
          record.timestamp
        ]).catch(err => {
          console.warn('[AuditLogService] Postgres async write warning:', err.message);
        });
      }
    }).catch(() => {});

    return record;
  }

  public logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    return this.log(entry);
  }

  public query(filter?: {
    tenantId?: string;
    actorEmail?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): AuditLogEntry[] {
    let result = [...this.logs];

    if (filter?.tenantId) {
      result = result.filter(l => l.tenantId === filter.tenantId);
    }
    if (filter?.actorEmail) {
      result = result.filter(l => l.actorEmail.toLowerCase() === filter.actorEmail!.toLowerCase());
    }
    if (filter?.action) {
      result = result.filter(l => l.action.toLowerCase().includes(filter.action!.toLowerCase()));
    }
    if (filter?.entityType) {
      result = result.filter(l => l.entityType.toLowerCase() === filter.entityType!.toLowerCase());
    }
    if (filter?.startDate) {
      result = result.filter(l => l.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      result = result.filter(l => l.timestamp <= filter.endDate!);
    }

    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }
}
