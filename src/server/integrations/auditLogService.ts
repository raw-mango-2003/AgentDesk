import { IAuditLogService, AuditLogEntry } from './interfaces.js';

export class AuditLogService implements IAuditLogService {
  private logs: AuditLogEntry[] = [];

  constructor() {}

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
    if (this.logs.length > 2000) {
      this.logs.pop();
    }

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
