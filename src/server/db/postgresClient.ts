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

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // ignore decoding errors
  }

  const checks = [trimmed.toLowerCase(), decoded.toLowerCase()];
  const placeholderKeywords = [
    '[your-password]',
    '[password]',
    '<password>',
    'your_password',
    'your-password',
    '%5byour-password%5d',
    '%5bpassword%5d',
    '%5byour_password%5d',
    'your-db-host',
    'localhost:5432/mydb'
  ];

  for (const str of checks) {
    for (const ph of placeholderKeywords) {
      if (str.includes(ph)) {
        return false;
      }
    }
  }

  return true;
}

export function getSafeDatabaseDiagnostics(): {
  isConfigured: boolean;
  isValidFormat: boolean;
  hasPlaceholder: boolean;
  host: string;
  port: string;
  database: string;
  hasUsername: boolean;
  hasPassword: boolean;
} {
  const raw = (process.env.DATABASE_URL || '').trim();
  if (!raw) {
    return {
      isConfigured: false,
      isValidFormat: false,
      hasPlaceholder: false,
      host: 'none',
      port: 'none',
      database: 'none',
      hasUsername: false,
      hasPassword: false
    };
  }

  const isValidFormat = raw.startsWith('postgres://') || raw.startsWith('postgresql://');
  const isValid = isValidConfiguredDatabaseUrl(raw);

  try {
    const u = new URL(raw);
    return {
      isConfigured: true,
      isValidFormat,
      hasPlaceholder: !isValid,
      host: u.hostname || 'unknown',
      port: u.port || '5432',
      database: u.pathname ? u.pathname.replace(/^\//, '') : 'unknown',
      hasUsername: Boolean(u.username),
      hasPassword: Boolean(u.password)
    };
  } catch {
    return {
      isConfigured: true,
      isValidFormat,
      hasPlaceholder: true,
      host: 'unparseable-host',
      port: 'unknown',
      database: 'unknown',
      hasUsername: false,
      hasPassword: false
    };
  }
}

function shouldUseSsl(dbUrl: string): boolean {
  try {
    const hostname = new URL(dbUrl).hostname.toLowerCase();
    return !['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return true;
  }
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
        ssl: shouldUseSsl(dbUrl) ? { rejectUnauthorized: false } : false,
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

    this.initPromise = (async () => {
      if (this.pool) {
        try {
          const client = await this.pool.connect();
          try {
            await client.query('SELECT 1');
            this.lastError = null;

            await runDatabaseMigrations(client);
            this.isConnected = true;
            console.log('[PostgresClient] External PostgreSQL schema successfully verified and connected.');
            return true;
          } finally {
            client.release();
          }
        } catch (err: any) {
          const safeMessage = err?.code ? `${err.message} (code: ${err.code})` : err.message;
          console.warn(`[PostgresClient] External PostgreSQL unreachable: ${safeMessage}`);
          this.isConnected = false;
          this.pool = null;
          this.lastError = `External PostgreSQL unreachable: ${safeMessage}`;
          // Recreate the pool so a transient network/database outage can recover
          // without requiring a process restart.
          this.initPool();
        }
      }

      const hasConfiguredDatabaseUrl = Boolean((process.env.DATABASE_URL || '').trim());

      // Never silently replace a configured PostgreSQL deployment with an
      // instance-local embedded database. A configured DATABASE_URL is the
      // persistence contract for sessions, integrations, tenants, and OAuth
      // credentials. Embedded storage is only a fallback when DATABASE_URL is
      // completely absent.
      if (hasConfiguredDatabaseUrl || process.env.ENABLE_EMBEDDED_DB !== 'true') {
        this.isConnected = false;
        if (!this.lastError) {
          this.lastError = hasConfiguredDatabaseUrl
            ? 'Configured DATABASE_URL could not be reached. Fix DATABASE_URL before enabling persistent application data.'
            : 'PostgreSQL DATABASE_URL is not configured. Set DATABASE_URL for persistent storage or ENABLE_EMBEDDED_DB=true for local development.';
        }
        return false;
      }

      try {
        if (!this.pglite) {
          const dataDir = path.join(process.cwd(), 'data', 'postgres');
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          try {
            this.pglite = new PGlite(dataDir);
            await this.pglite.waitReady;
          } catch (initClusterErr: any) {
            console.warn('[PostgresClient] Corrupted development cluster detected, rebuilding clean database directory:', initClusterErr.message);
            fs.rmSync(dataDir, { recursive: true, force: true });
            fs.mkdirSync(dataDir, { recursive: true });
            this.pglite = new PGlite(dataDir);
            await this.pglite.waitReady;
          }
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

  public async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (err: any) {
        console.warn('[PostgresClient] Pool shutdown warning:', err.message);
      }
      this.pool = null;
    }
    if (this.pglite) {
      try {
        await this.pglite.close();
      } catch (err: any) {
        console.warn('[PostgresClient] Embedded database shutdown warning:', err.message);
      }
      this.pglite = null;
    }
    this.isConnected = false;
  }
}

export const postgresClient = new PostgresClient();
