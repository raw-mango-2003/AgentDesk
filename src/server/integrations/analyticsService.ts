import { IAnalyticsService, AnalyticsEventName } from './interfaces.js';

export class AnalyticsService implements IAnalyticsService {
  private apiKey: string;
  private host: string;
  private localEvents: Array<{ event: string; properties: any; distinctId: string; timestamp: string }> = [];

  constructor() {
    this.apiKey = (process.env.POSTHOG_API_KEY || '').trim();
    this.host = (process.env.POSTHOG_HOST || 'https://app.posthog.com').replace(/\/$/, '');
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 5;
  }

  private sanitizeProperties(props: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('hash')) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  public async track(event: AnalyticsEventName, properties: Record<string, any> = {}, distinctId: string = 'system'): Promise<void> {
    const cleanProps = this.sanitizeProperties(properties);
    const now = new Date().toISOString();

    this.localEvents.unshift({
      event,
      properties: cleanProps,
      distinctId,
      timestamp: now
    });

    if (this.localEvents.length > 300) {
      this.localEvents.pop();
    }

    if (!this.isConfigured()) {
      return;
    }

    try {
      await fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          event,
          properties: {
            ...cleanProps,
            distinct_id: distinctId,
            $time: Math.floor(Date.now() / 1000)
          }
        })
      });
    } catch (err: any) {
      console.error('[AnalyticsService:PostHogError]', err.message);
    }
  }

  public async identify(distinctId: string, traits: Record<string, any> = {}): Promise<void> {
    if (!this.isConfigured()) return;
    const cleanTraits = this.sanitizeProperties(traits);

    try {
      await fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          event: '$identify',
          properties: {
            distinct_id: distinctId,
            $set: cleanTraits
          }
        })
      });
    } catch (err: any) {
      console.error('[AnalyticsService:IdentifyError]', err.message);
    }
  }

  public async isFeatureEnabled(featureKey: string, distinctId: string = 'anonymous', tenantId?: string): Promise<boolean> {
    // Default feature flags based on plans and keys
    const defaults: Record<string, boolean> = {
      'ai_voice_agents': true,
      'whatsapp_integration': true,
      'multi_tenant_portal': true,
      'advanced_analytics': true,
      'export_data': true,
      'audit_logs': true
    };

    return defaults[featureKey] ?? true;
  }

  public getRecentEvents(limit: number = 50): Array<{ event: string; properties: any; distinctId: string; timestamp: string }> {
    return this.localEvents.slice(0, limit);
  }
}
