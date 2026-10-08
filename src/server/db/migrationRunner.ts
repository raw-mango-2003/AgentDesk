import type pg from 'pg';
import * as baselineMigration from './migrations/001_baseline.js';
import * as leadDeduplicationMigration from './migrations/002_lead_deduplication.js';
import * as siteDesignMigration from './migrations/003_department_design.js';
import * as paymentSchemaRepairMigration from './migrations/004_payment_schema_repair.js';

export interface DbMigration {
  version: string;
  description: string;
  sql: string;
}

const MIGRATIONS: DbMigration[] = [
  baselineMigration,
  leadDeduplicationMigration,
  siteDesignMigration,
  paymentSchemaRepairMigration
];

export async function runDatabaseMigrations(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS agentdesk_schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const applied = await client.query<{ version: string }>(
    'SELECT version FROM agentdesk_schema_migrations ORDER BY version'
  );
  const appliedVersions = new Set(applied.rows.map(row => row.version));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO agentdesk_schema_migrations (version, description)
         VALUES ($1, $2)
         ON CONFLICT (version) DO NOTHING`,
        [migration.version, migration.description]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}
