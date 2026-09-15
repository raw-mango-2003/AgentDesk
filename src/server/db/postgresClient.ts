import pg from 'pg';
const { Pool } = pg;

export interface DbStatus {
  isConnected: boolean;
  isConfigured: boolean;
  provider: 'postgresql' | 'resilient_file_store';
  error?: string;
  lastCheckedAt: string;
}

export function isValidConfiguredDatabaseUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return false;
  }
  // Check for template placeholder patterns
  if (
    trimmed.includes('[YOUR-PASSWORD]') ||
    trimmed.includes('[PASSWORD]') ||
    trimmed.includes('<PASSWORD>') ||
    trimmed.includes('YOUR_PASSWORD') ||
    trimmed.includes('YOUR-PASSWORD') ||
    trimmed.includes('[your-password]') ||
    trimmed.includes('your_password')
  ) {
    return false;
  }
  return true;
}

class PostgresClient {
  private pool: pg.Pool | null = null;
  private isConnected = false;
  private lastError: string | null = null;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.initPool();
  }

  private initPool(): void {
    const dbUrl = (process.env.DATABASE_URL || '').trim();
    if (!isValidConfiguredDatabaseUrl(dbUrl)) {
      this.lastError = 'DATABASE_URL is not configured or contains placeholder credentials';
      this.pool = null;
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 10
      });

      this.pool.on('error', (err) => {
        this.isConnected = false;
        this.lastError = err.message;
      });
    } catch (err: any) {
      this.pool = null;
      this.lastError = err.message;
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (!this.pool) {
        return false;
      }

      try {
        const client = await this.pool.connect();
        try {
          await client.query('SELECT 1');
          this.isConnected = true;
          this.lastError = null;

          // Initialize database schema tables if not exist
          await client.query(`
            CREATE TABLE IF NOT EXISTS agentdesk_integrations (
              id VARCHAR(128) PRIMARY KEY,
              provider VARCHAR(64) NOT NULL,
              type VARCHAR(64) NOT NULL,
              account_email VARCHAR(255) NOT NULL,
              encrypted_refresh_token TEXT,
              status VARCHAR(64) NOT NULL,
              connected_at VARCHAR(64),
              last_successful_send_at VARCHAR(64),
              last_error TEXT,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            ALTER TABLE agentdesk_integrations ADD COLUMN IF NOT EXISTS encrypted_client_id TEXT;
            ALTER TABLE agentdesk_integrations ADD COLUMN IF NOT EXISTS encrypted_client_secret TEXT;

            CREATE TABLE IF NOT EXISTS agentdesk_oauth_states (
              state VARCHAR(128) PRIMARY KEY,
              user_id VARCHAR(128),
              created_at BIGINT NOT NULL,
              expires_at BIGINT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_sessions (
              token VARCHAR(255) PRIMARY KEY,
              user_id VARCHAR(128) NOT NULL,
              email VARCHAR(255) NOT NULL,
              role VARCHAR(64) NOT NULL,
              tenant_id VARCHAR(128) NOT NULL,
              created_at BIGINT NOT NULL,
              expires_at BIGINT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_webhook_events (
              event_id VARCHAR(255) PRIMARY KEY,
              provider VARCHAR(64) NOT NULL,
              event_type VARCHAR(128) NOT NULL,
              status VARCHAR(64) NOT NULL,
              payload JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS agentdesk_audit_logs (
              id VARCHAR(128) PRIMARY KEY,
              actor_id VARCHAR(128),
              actor_email VARCHAR(255),
              actor_role VARCHAR(64),
              action VARCHAR(128) NOT NULL,
              entity_type VARCHAR(64) NOT NULL,
              entity_id VARCHAR(128),
              result VARCHAR(64) NOT NULL,
              metadata JSONB,
              timestamp VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_users (
              id VARCHAR(128) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role VARCHAR(64) NOT NULL,
              tenant_id VARCHAR(128) NOT NULL,
              status VARCHAR(64) NOT NULL,
              must_change_password BOOLEAN DEFAULT FALSE,
              email_verified BOOLEAN DEFAULT FALSE,
              reset_token_hash TEXT,
              reset_token_expires BIGINT,
              verification_token_hash TEXT,
              verification_token_expires BIGINT,
              setup_token_hash TEXT,
              setup_token_expires BIGINT,
              two_factor_enabled BOOLEAN DEFAULT FALSE,
              two_factor_phone VARCHAR(64),
              failed_login_attempts INT DEFAULT 0,
              lockout_until BIGINT,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_tenants (
              id VARCHAR(128) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              industry VARCHAR(128),
              status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
              owner_id VARCHAR(128),
              plan_id VARCHAR(64) NOT NULL DEFAULT 'trial',
              currency VARCHAR(16) DEFAULT 'USD',
              settings JSONB,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_knowledge (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128) NOT NULL,
              business_id VARCHAR(128),
              title VARCHAR(512) NOT NULL,
              content TEXT NOT NULL,
              type VARCHAR(64) DEFAULT 'faq',
              category VARCHAR(128) DEFAULT 'General',
              status VARCHAR(64) DEFAULT 'active',
              active BOOLEAN DEFAULT TRUE,
              metadata JSONB,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON agentdesk_knowledge (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_files (
              key VARCHAR(255) PRIMARY KEY,
              filename VARCHAR(255) NOT NULL,
              content_type VARCHAR(128) NOT NULL,
              size_bytes BIGINT NOT NULL,
              tenant_id VARCHAR(128) NOT NULL,
              is_private BOOLEAN DEFAULT TRUE,
              uploaded_at VARCHAR(64) NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_files_tenant ON agentdesk_files (tenant_id);

            CREATE TABLE IF NOT EXISTS agentdesk_rate_limits (
              key VARCHAR(255) PRIMARY KEY,
              count INT NOT NULL DEFAULT 1,
              reset_at BIGINT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agentdesk_invoices (
              id VARCHAR(128) PRIMARY KEY,
              tenant_id VARCHAR(128) NOT NULL,
              razorpay_invoice_id VARCHAR(128),
              amount NUMERIC(12, 2) NOT NULL,
              currency VARCHAR(16) NOT NULL,
              status VARCHAR(64) NOT NULL,
              hosted_invoice_url TEXT,
              created_at VARCHAR(64) NOT NULL,
              updated_at VARCHAR(64) NOT NULL
            );
          `);

          console.log('[PostgresClient] PostgreSQL schema successfully verified and connected.');
          return true;
        } finally {
          client.release();
        }
      } catch (err: any) {
        this.isConnected = false;
        this.lastError = err.message;
        console.log(`[PostgresClient] Notice: PostgreSQL standby (${err.message}). Using resilient local storage.`);
        return false;
      }
    })();

    return this.initPromise;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    if (!this.isConnected || !this.pool) {
      throw new Error(this.lastError || 'Database not connected');
    }
    return this.pool.query(text, params);
  }

  public getStatus(): DbStatus {
    const isConfigured = isValidConfiguredDatabaseUrl(process.env.DATABASE_URL || '');
    return {
      isConnected: this.isConnected,
      isConfigured,
      provider: this.isConnected ? 'postgresql' : 'resilient_file_store',
      error: this.lastError || undefined,
      lastCheckedAt: new Date().toISOString()
    };
  }
}

export const postgresClient = new PostgresClient();
