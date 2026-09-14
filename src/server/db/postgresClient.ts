import pg from 'pg';
const { Pool } = pg;

export interface DbStatus {
  isConnected: boolean;
  isConfigured: boolean;
  provider: 'postgresql' | 'resilient_file_store';
  error?: string;
  lastCheckedAt: string;
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
    if (!dbUrl) {
      this.lastError = 'DATABASE_URL is not set';
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
        console.warn('[PostgresClient:PoolError]', err.message);
        this.isConnected = false;
        this.lastError = err.message;
      });
    } catch (err: any) {
      console.warn('[PostgresClient:InitError]', err.message);
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
        console.warn(`[PostgresClient] Notice: PostgreSQL offline or credentials pending (${err.message}). Using resilient local storage fallback.`);
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
    return {
      isConnected: this.isConnected,
      isConfigured: Boolean(process.env.DATABASE_URL),
      provider: this.isConnected ? 'postgresql' : 'resilient_file_store',
      error: this.lastError || undefined,
      lastCheckedAt: new Date().toISOString()
    };
  }
}

export const postgresClient = new PostgresClient();
