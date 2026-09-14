import { IErrorMonitoringService } from './interfaces.js';

export interface MonitoredError {
  id: string;
  message: string;
  stack?: string;
  level: 'info' | 'warning' | 'error';
  context?: Record<string, any>;
  user?: { id?: string; email?: string; tenantId?: string; role?: string } | null;
  timestamp: string;
}

export class ErrorMonitoringService implements IErrorMonitoringService {
  private dsn: string;
  private currentUser: { id?: string; email?: string; tenantId?: string; role?: string } | null = null;
  private recentErrors: MonitoredError[] = [];

  constructor() {
    this.dsn = (process.env.SENTRY_DSN || '').trim();
  }

  public isConfigured(): boolean {
    return Boolean(this.dsn && this.dsn.startsWith('http') && !this.dsn.includes('internal.agentdesk'));
  }

  public isLiveSentryConfigured(): boolean {
    return this.isConfigured();
  }

  public setUserContext(user: { id?: string; email?: string; tenantId?: string; role?: string } | null): void {
    this.currentUser = user;
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sanitize(item));

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('key') ||
        lower.includes('hash') ||
        lower.includes('authorization')
      ) {
        clean[key] = '[REDACTED_PII]';
      } else if (typeof value === 'object') {
        clean[key] = this.sanitize(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  public captureException(error: Error | any, context?: Record<string, any>): void {
    const errorRecord: MonitoredError = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message: error?.message || String(error),
      stack: error?.stack,
      level: 'error',
      context: this.sanitize(context),
      user: this.currentUser ? { ...this.currentUser } : null,
      timestamp: new Date().toISOString()
    };

    this.recentErrors.unshift(errorRecord);
    if (this.recentErrors.length > 100) {
      this.recentErrors.pop();
    }

    if (this.isLiveSentryConfigured()) {
      // Sentry DSN HTTP envelope dispatch
      try {
        const url = new URL(this.dsn);
        const projectId = url.pathname.replace('/', '');
        const sentryUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`;

        fetch(sentryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${url.username}, sentry_client=agentdesk-sentry/1.0`
          },
          body: JSON.stringify({
            event_id: errorRecord.id.replace('err_', ''),
            timestamp: errorRecord.timestamp,
            level: 'error',
            message: errorRecord.message,
            extra: errorRecord.context,
            user: errorRecord.user
          })
        }).catch(e => console.warn('[ErrorMonitoringService:NetworkNotice]', e.message));
      } catch (err: any) {
        console.warn('[ErrorMonitoringService:Notice]', err.message);
      }
    }
  }

  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
    const record: MonitoredError = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message,
      level,
      context: this.sanitize(context),
      user: this.currentUser ? { ...this.currentUser } : null,
      timestamp: new Date().toISOString()
    };

    this.recentErrors.unshift(record);
    if (this.recentErrors.length > 100) {
      this.recentErrors.pop();
    }
  }

  public getRecentErrors(limit: number = 30): MonitoredError[] {
    return this.recentErrors.slice(0, limit);
  }
}
