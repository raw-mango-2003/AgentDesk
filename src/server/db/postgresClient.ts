import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { PGlite } from '@electric-sql/pglite';
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
  private pglite: PGlite | null = null;
  private isConnected = false;
  private lastError: string | null = null;
  private initPromise: Promise<boolean> | null = null;
  private lastAttemptAt = 0;
  private readonly retryCooldownMs = 10000;

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
    if (this.isConnected) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    const now = Date.now();
    if (now - this.lastAttemptAt < this.retryCooldownMs && !this.pglite) {
      return this.isConnected;
    }
    this.lastAttemptAt = now;

    this.initPromise = (async () => {
      // 1. If valid external DATABASE_URL is configured, attempt remote PostgreSQL pool
      if (this.pool) {
        try {
          const client = await this.pool.connect();
          try {
            await client.query('SELECT 1');
            this.isConnected = true;
            this.lastError = null;

            await runDatabaseMigrations(client);
            console.log('[PostgresClient] External PostgreSQL schema successfully verified and connected.');
            return true;
          } finally {
            client.release();
          }
        } catch (err: any) {
          console.warn(`[PostgresClient] External PostgreSQL unreachable (${err.message}). Activating persistent embedded PostgreSQL engine.`);
          this.pool = null;
        }
      }

      // 2. Optional development-only embedded PostgreSQL engine.
      // Production must use an external PostgreSQL DATABASE_URL so sessions and tenant data
      // are durable and shareable across instances.
      // An explicitly enabled embedded database is supported for AI Studio/preview and
      // other single-instance environments that do not provide an external PostgreSQL service.
      // It must never be an implicit fallback: operators must opt in with
      // ENABLE_EMBEDDED_DB=true. External PostgreSQL remains preferred and is required for
      // durable multi-instance production deployments.
      const embeddedDbExplicitlyEnabled = process.env.ENABLE_EMBEDDED_DB === 'true';

      if (!embeddedDbExplicitlyEnabled) {
        this.isConnected = false;
        this.lastError = 'PostgreSQL DATABASE_URL is unavailable or contains placeholder credentials. Set ENABLE_EMBEDDED_DB=true to enable development embedded PostgreSQL.';
        return false;
      }

      try {
        if (!this.pglite) {
          const dataDir = path.join(process.cwd(), 'data', 'postgres');
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          this.pglite = new PGlite(dataDir);
        }

        const runnerAdapter: any = {
          query: async (text: string, params?: any[]) => {
            if (!params || params.length === 0) {
              const res = await this.pglite!.exec(text);
              const last = res[res.length - 1];
              return { rows: last?.rows || [], rowCount: last?.rowCount || 0 };
            }
            const res = await this.pglite!.query(text, params);
            return { rows: res.rows, rowCount: res.rows.length };
          }
        };

        await runDatabaseMigrations(runnerAdapter);

        this.isConnected = true;
        this.lastError = null;
        const runtimeLabel = process.env.NODE_ENV === 'production'
          ? 'explicitly enabled production/preview'
          : 'development';
        console.warn(
          `[PostgresClient] Embedded PostgreSQL engine is active in ${runtimeLabel} mode. ` +
          'This storage is instance-local and is not suitable for durable multi-instance production data. ' +
          'Configure DATABASE_URL for persistent production deployments.'
        );
        return true;
      } catch (err: any) {
        this.isConnected = false;
        this.lastError = err.message;
        console.error('[PostgresClient] Error initializing PostgreSQL:', err.message);
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    if (!this.isConnected) {
      const ready = await this.initialize();
      if (!ready) {
        throw new Error(this.lastError || 'Database not connected');
      }
    }

    if (this.pool) {
      return this.pool.query(text, params);
    }

    if (this.pglite) {
      const res = await this.pglite.query(text, params);
      return {
        rows: res.rows,
        rowCount: res.rows.length,
        fields: res.fields
      };
    }

    throw new Error(this.lastError || 'Database not connected');
  }

  public isConfigured(): boolean {
    return isValidConfiguredDatabaseUrl(process.env.DATABASE_URL || '') || !!this.pglite;
  }

  public isDbConnected(): boolean {
    return this.isConnected;
  }

  public getStatus(): DbStatus {
    const isConfigured = this.isConfigured();
    return {
      isConnected: this.isConnected,
      isConfigured,
      provider: 'postgresql',
      error: this.lastError || undefined,
      lastCheckedAt: new Date().toISOString()
    };
  }
}

export const postgresClient = new PostgresClient();

