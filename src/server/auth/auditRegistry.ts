export type CredentialAuditAction = 
  | 'PLATFORM_ADMIN_BOOTSTRAP'
  | 'PLATFORM_ADMIN_LOGIN'
  | 'PLATFORM_ADMIN_PASSWORD_CHANGED'
  | 'PLATFORM_ADMIN_FIRST_LOGIN_PASSWORD_CHANGED'
  | 'BUSINESS_LOGIN_CREATED'
  | 'BUSINESS_LOGIN_REGENERATED'
  | 'BUSINESS_OWNER_INVITED'
  | 'ACCOUNT_SETUP_COMPLETED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'FIRST_LOGIN_PASSWORD_CHANGED'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_ENABLED';

export interface CredentialAuditEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: CredentialAuditAction;
  targetUserId?: string;
  targetUserEmail: string;
  targetTenantId?: string;
  timestamp: string;
  metadata?: Record<string, any>; // NEVER store passwords or secrets
}

const credentialAuditLogsStore: CredentialAuditEntry[] = [];

/**
 * Log a sensitive credential or account management action.
 * Passwords or raw tokens are strictly prohibited in metadata.
 */
export function logCredentialAction(entry: Omit<CredentialAuditEntry, 'id' | 'timestamp'>): CredentialAuditEntry {
  // Sanitize any metadata to strictly prevent passwords from being logged
  const cleanMetadata: Record<string, any> = {};
  if (entry.metadata) {
    for (const [key, value] of Object.entries(entry.metadata)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('hash')) {
        cleanMetadata[key] = '[REDACTED]';
      } else {
        cleanMetadata[key] = value;
      }
    }
  }

  const log: CredentialAuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
    metadata: cleanMetadata,
    timestamp: new Date().toISOString()
  };

  credentialAuditLogsStore.unshift(log); // newest first
  if (credentialAuditLogsStore.length > 500) {
    credentialAuditLogsStore.pop();
  }

  return log;
}

export function getCredentialAuditLogs(filter?: {
  tenantId?: string;
  targetEmail?: string;
  action?: string;
  limit?: number;
}): CredentialAuditEntry[] {
  let list = [...credentialAuditLogsStore];

  if (filter?.tenantId) {
    list = list.filter(l => l.targetTenantId === filter.tenantId);
  }
  if (filter?.targetEmail) {
    list = list.filter(l => l.targetUserEmail?.toLowerCase() === filter.targetEmail?.toLowerCase());
  }
  if (filter?.action) {
    list = list.filter(l => l.action === filter.action);
  }

  if (filter?.limit) {
    list = list.slice(0, filter.limit);
  }

  return list;
}
