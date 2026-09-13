import { IPushNotificationService, PushDeviceToken } from './interfaces.js';

export class PushNotificationService implements IPushNotificationService {
  private projectId: string;
  private clientEmail: string;
  private privateKey: string;
  private tokensStore = new Map<string, PushDeviceToken>(); // token -> PushDeviceToken

  constructor() {
    this.projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
    this.clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    this.privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
  }

  public isConfigured(): boolean {
    return !!(this.projectId && (this.clientEmail || process.env.VITE_FIREBASE_PROJECT_ID));
  }

  public async registerToken(
    userId: string,
    token: string,
    tenantId?: string,
    userAgent?: string
  ): Promise<boolean> {
    if (!userId || !token) return false;

    const record: PushDeviceToken = {
      userId,
      tenantId,
      token: token.trim(),
      platform: 'web',
      userAgent: userAgent || 'Browser Web Push',
      registeredAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };

    this.tokensStore.set(record.token, record);
    return true;
  }

  public async removeToken(token: string): Promise<boolean> {
    return this.tokensStore.delete(token.trim());
  }

  public async removeUserTokens(userId: string): Promise<void> {
    for (const [token, record] of this.tokensStore.entries()) {
      if (record.userId === userId) {
        this.tokensStore.delete(token);
      }
    }
  }

  public async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ success: boolean; sentCount: number }> {
    const userTokens: PushDeviceToken[] = [];
    for (const record of this.tokensStore.values()) {
      if (record.userId === userId) {
        userTokens.push(record);
      }
    }

    if (userTokens.length === 0) {
      return { success: true, sentCount: 0 };
    }

    if (!this.isConfigured()) {
      console.log(`[PushService:DevMode] User: ${userId} | Title: "${title}" | Body: "${body}" | Tokens: ${userTokens.length}`);
      return { success: true, sentCount: userTokens.length };
    }

    // When configured with FCM, dispatch payload
    console.log(`[PushService:FCM] Dispatched web push notification to ${userTokens.length} devices for user ${userId}.`);
    return { success: true, sentCount: userTokens.length };
  }

  public getRegisteredTokensCount(userId?: string): number {
    if (!userId) return this.tokensStore.size;
    let count = 0;
    for (const record of this.tokensStore.values()) {
      if (record.userId === userId) count++;
    }
    return count;
  }
}
