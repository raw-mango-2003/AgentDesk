import crypto from 'crypto';
import { integrationStore } from './integrationStore.js';
import { IntegrationRecord } from './interfaces.js';

export interface GmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface GmailSendResult {
  success: boolean;
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED' | 'REAUTHORIZATION_REQUIRED' | 'DISCONNECTED';
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface GmailConnectionStatus {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'REAUTHORIZATION_REQUIRED';
  isConfigured: boolean;
  senderEmail: string;
  replyTo: string;
  scope: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  maskedClientId?: string;
  connectedAt?: string;
  lastSuccessfulSendAt?: string;
  lastVerifiedAt?: string;
  lastError?: string;
}

export class GmailService {
  public readonly senderEmail = 'hello.agentdesktech@gmail.com';
  public readonly defaultReplyTo = 'hello.agentdesktech@gmail.com';
  public readonly scope = 'https://www.googleapis.com/auth/gmail.send';

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private lastVerifiedAt?: string;
  private dynamicClientId?: string;
  private dynamicClientSecret?: string;

  constructor() {
    this.syncInitialState();
  }

  /**
   * Sync initial state from stored database record or environment variables
   */
  private syncInitialState(): void {
    const record = integrationStore.getIntegration('gmail_oauth');
    
    // If environment has a refresh token but store is empty, migrate it into encrypted store
    const envRefreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();
    if (envRefreshToken && record && !record.encryptedRefreshToken) {
      const encrypted = integrationStore.encryptSecret(envRefreshToken);
      integrationStore.updateIntegration('gmail_oauth', {
        encryptedRefreshToken: encrypted,
        status: 'CONNECTED',
        connectedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Get active integration record
   */
  public getStoredIntegration(): IntegrationRecord | null {
    return integrationStore.getIntegration('gmail_oauth');
  }

  /**
   * Resolve active Google OAuth 2.0 client credentials (env vars take precedence, falls back to persistent store)
   */
  public getClientCredentials(): { clientId: string; clientSecret: string } {
    const envClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const envClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    if (envClientId && envClientSecret) {
      return { clientId: envClientId, clientSecret: envClientSecret };
    }
    const stored = integrationStore.getClientCredentials();
    return {
      clientId: envClientId || stored.clientId || (this.dynamicClientId || '').trim(),
      clientSecret: envClientSecret || stored.clientSecret || (this.dynamicClientSecret || '').trim()
    };
  }

  /**
   * Resolve active Google OAuth 2.0 credentials
   */
  private getCredentials(): { clientId: string; clientSecret: string; refreshToken: string } | null {
    const { clientId, clientSecret } = this.getClientCredentials();

    const record = integrationStore.getIntegration('gmail_oauth');
    let refreshToken = '';

    if (record?.encryptedRefreshToken) {
      refreshToken = integrationStore.decryptSecret(record.encryptedRefreshToken);
    } else if (process.env.GOOGLE_REFRESH_TOKEN) {
      refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();
    }

    if (clientId && clientSecret && refreshToken) {
      return { clientId, clientSecret, refreshToken };
    }

    return null;
  }

  /**
   * Check if Gmail OAuth 2.0 is fully configured and connected
   */
  public isConfigured(): boolean {
    const record = integrationStore.getIntegration('gmail_oauth');
    if (!record || record.status === 'NOT_CONNECTED') {
      return false;
    }
    const creds = this.getCredentials();
    return !!(creds && creds.clientId && creds.clientSecret && creds.refreshToken);
  }

  /**
   * Safe status object for UI presentation (no secrets or refresh tokens exposed)
   */
  public getConnectionStatus(): GmailConnectionStatus {
    const record = integrationStore.getIntegration('gmail_oauth');
    const creds = this.getCredentials();
    const { clientId, clientSecret } = this.getClientCredentials();
    const hasRefreshToken = !!(creds?.refreshToken);

    let status: 'CONNECTED' | 'NOT_CONNECTED' | 'REAUTHORIZATION_REQUIRED' = 'NOT_CONNECTED';
    if (record) {
      if (record.status === 'REAUTHORIZATION_REQUIRED') {
        status = 'REAUTHORIZATION_REQUIRED';
      } else if (record.status === 'CONNECTED' && hasRefreshToken && clientId && clientSecret) {
        status = 'CONNECTED';
      } else {
        status = 'NOT_CONNECTED';
      }
    }

    let maskedClientId: string | undefined;
    if (clientId) {
      const parts = clientId.split('-');
      maskedClientId = parts[0] ? `${parts[0].slice(0, 8)}...apps.googleusercontent.com` : 'Configured';
    }

    return {
      status,
      isConfigured: status === 'CONNECTED',
      senderEmail: this.senderEmail,
      replyTo: this.defaultReplyTo,
      scope: this.scope,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken,
      maskedClientId,
      connectedAt: record?.connectedAt,
      lastSuccessfulSendAt: record?.lastSuccessfulSendAt,
      lastVerifiedAt: this.lastVerifiedAt,
      lastError: record?.lastError
    };
  }

  /**
   * Obtain fresh access token using decrypted refresh token
   */
  public async getAccessToken(): Promise<{ token: string | null; error?: string }> {
    const creds = this.getCredentials();
    if (!creds) {
      return { token: null, error: 'Gmail OAuth credentials are not fully configured' };
    }

    // Return cached token if valid (with 60-second safety cushion)
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return { token: this.cachedAccessToken };
    }

    try {
      const params = new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token'
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json() as any;

      if (!response.ok) {
        const errorDesc = data.error_description || data.error || `HTTP ${response.status}`;
        
        // Handle revoked or expired tokens
        if (data.error === 'invalid_grant' || response.status === 400 || response.status === 401) {
          integrationStore.updateIntegration('gmail_oauth', {
            status: 'REAUTHORIZATION_REQUIRED',
            lastError: `OAuth authorization revoked or expired: ${errorDesc}`
          });
        }

        const fullErr = `OAuth Token Refresh Failed: ${errorDesc}`;
        return { token: null, error: fullErr };
      }

      if (!data.access_token) {
        return { token: null, error: 'Google token response missing access_token' };
      }

      this.cachedAccessToken = data.access_token;
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
      this.lastVerifiedAt = new Date().toISOString();

      // Ensure record is marked CONNECTED
      integrationStore.updateIntegration('gmail_oauth', {
        status: 'CONNECTED',
        lastError: undefined
      });

      return { token: this.cachedAccessToken };
    } catch (err: any) {
      const msg = `Network error connecting to Google OAuth endpoint: ${err.message}`;
      return { token: null, error: msg };
    }
  }

  /**
   * Build RFC 2822 standard MIME message and encode to URL-safe base64
   */
  private createMimeMessage(options: GmailSendOptions): string {
    const boundary = `====agentdesk_${Date.now()}_${crypto.randomBytes(8).toString('hex')}====`;
    const cleanTo = options.to.trim();
    const cleanReplyTo = (options.replyTo || this.defaultReplyTo).trim();
    const fromHeader = `AgentDesk <${this.senderEmail}>`;
    
    // RFC 2047 UTF-8 encoded subject
    const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject, 'utf-8').toString('base64')}?=`;
    const plainText = options.text || options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const lines = [
      `From: ${fromHeader}`,
      `To: ${cleanTo}`,
      `Reply-To: ${cleanReplyTo}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(plainText, 'utf-8').toString('base64'),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(options.html, 'utf-8').toString('base64'),
      '',
      `--${boundary}--`
    ];

    const rawMime = lines.join('\r\n');

    return Buffer.from(rawMime, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Send transactional email using official Gmail API users.messages.send
   */
  public async sendEmail(options: GmailSendOptions): Promise<GmailSendResult> {
    const now = new Date().toISOString();

    if (!this.isConfigured()) {
      const errorMsg = 'Gmail API OAuth 2.0 is not connected. Connect Gmail in Platform Admin -> Integrations.';
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        error: errorMsg,
        timestamp: now
      };
    }

    const { token, error: tokenError } = await this.getAccessToken();

    if (!token) {
      return {
        success: false,
        status: 'REAUTHORIZATION_REQUIRED',
        error: tokenError || 'Unable to obtain Google OAuth access token',
        timestamp: now
      };
    }

    try {
      const rawMessage = this.createMimeMessage(options);

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
      });

      const data = await response.json() as any;

      if (!response.ok) {
        const errMsg = data.error?.message || `Gmail API returned HTTP ${response.status}`;
        
        if (response.status === 401 || response.status === 403) {
          integrationStore.updateIntegration('gmail_oauth', {
            status: 'REAUTHORIZATION_REQUIRED',
            lastError: errMsg
          });
          this.cachedAccessToken = null;
        } else {
          integrationStore.updateIntegration('gmail_oauth', {
            lastError: errMsg
          });
        }

        return {
          success: false,
          status: 'FAILED',
          error: errMsg,
          timestamp: now
        };
      }

      // Record successful send timestamp
      integrationStore.updateIntegration('gmail_oauth', {
        lastSuccessfulSendAt: now,
        lastError: undefined,
        status: 'CONNECTED'
      });
      this.lastVerifiedAt = now;

      return {
        success: true,
        status: 'SENT',
        messageId: data.id,
        timestamp: now
      };
    } catch (err: any) {
      const networkError = err.message || 'Network exception connecting to Gmail API';
      integrationStore.updateIntegration('gmail_oauth', {
        lastError: networkError
      });

      return {
        success: false,
        status: 'FAILED',
        error: networkError,
        timestamp: now
      };
    }
  }

  /**
   * Securely store obtained OAuth refresh token (encrypted server-side)
   */
  public async storeRefreshToken(
    refreshToken: string, 
    accountEmail: string = 'hello.agentdesktech@gmail.com'
  ): Promise<{ success: boolean; error?: string }> {
    const cleanToken = refreshToken.trim();
    if (!cleanToken) {
      return { success: false, error: 'Refresh token cannot be empty' };
    }

    const encrypted = integrationStore.encryptSecret(cleanToken);
    const now = new Date().toISOString();

    integrationStore.saveIntegration({
      id: 'gmail_oauth',
      provider: 'GOOGLE',
      type: 'GMAIL',
      accountEmail,
      encryptedRefreshToken: encrypted,
      status: 'CONNECTED',
      connectedAt: now,
      lastError: undefined,
      createdAt: now,
      updatedAt: now
    });

    // Invalidate cached access token and test connectivity
    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;

    const test = await this.getAccessToken();
    if (!test.token) {
      return {
        success: false,
        error: test.error || 'Failed to authenticate with Google using the new refresh token.'
      };
    }

    return { success: true };
  }

  /**
   * Set dynamic client credentials and persist them securely
   */
  public setClientCredentials(clientId: string, clientSecret: string): void {
    if (clientId) this.dynamicClientId = clientId.trim();
    if (clientSecret) this.dynamicClientSecret = clientSecret.trim();
    if (clientId && clientSecret) {
      integrationStore.saveClientCredentials(clientId.trim(), clientSecret.trim());
    }
  }

  /**
   * Disconnect Gmail: revoke refresh token with Google, remove from database, mark NOT_CONNECTED
   */
  public async disconnect(): Promise<{ success: boolean; error?: string }> {
    const creds = this.getCredentials();

    // Revoke token with Google if available
    if (creds?.refreshToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(creds.refreshToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } catch (err) {
        // Non-fatal if revoke call fails
      }
    }

    integrationStore.updateIntegration('gmail_oauth', {
      encryptedRefreshToken: '',
      status: 'NOT_CONNECTED',
      lastError: undefined
    });

    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;

    return { success: true };
  }

  /**
   * Generate Google OAuth 2.0 authorization URL
   * Requests ONLY https://www.googleapis.com/auth/gmail.send with offline access and consent prompt
   */
  public getAuthorizationUrl(redirectUri: string, state: string, clientIdOverride?: string): string {
    const { clientId: resolvedClientId } = this.getClientCredentials();
    const clientId = (clientIdOverride || resolvedClientId).trim();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scope,
      access_type: 'offline',
      prompt: 'consent',
      state,
      include_granted_scopes: 'true'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens and store refresh token securely
   */
  public async exchangeAuthorizationCode(
    code: string,
    redirectUri: string
  ): Promise<{ success: boolean; error?: string; accountEmail?: string }> {
    const { clientId, clientSecret } = this.getClientCredentials();

    if (!clientId || !clientSecret) {
      return { 
        success: false, 
        error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured before exchanging code.' 
      };
    }

    try {
      const params = new URLSearchParams({
        code: code.trim(),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error_description || data.error || 'Failed to exchange authorization code with Google' 
        };
      }

      if (!data.refresh_token) {
        // If Google didn't return a refresh token, check if we already have one stored
        const existing = integrationStore.getIntegration('gmail_oauth');
        if (existing?.encryptedRefreshToken) {
          integrationStore.updateIntegration('gmail_oauth', {
            status: 'CONNECTED',
            lastError: undefined
          });
          return { success: true, accountEmail: this.senderEmail };
        }
        return {
          success: false,
          error: 'Google did not return a refresh token. Please re-authorize and ensure prompt=consent is used.'
        };
      }

      const storeResult = await this.storeRefreshToken(data.refresh_token, this.senderEmail);
      if (!storeResult.success) {
        return { success: false, error: storeResult.error };
      }

      return { success: true, accountEmail: this.senderEmail };
    } catch (err: any) {
      return { success: false, error: err.message || 'Exception during token exchange' };
    }
  }
}
