import pg from 'pg';
import { runDatabaseMigrations } from './migrationRunner.js';
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

          // Apply committed, versioned migrations. Each migration runs once and
          // is recorded only after it completes successfully. This keeps schema
          // evolution out of the application bootstrap code.
          await runDatabaseMigrations(client);

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

  public isConfigured(): boolean {
    return isValidConfiguredDatabaseUrl(process.env.DATABASE_URL || '');
  }

  public isDbConnected(): boolean {
    return this.isConnected;
  }

  public getStatus(): DbStatus {
    const isConfigured = this.isConfigured();
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
