/**
 * AgentDesk database migration 005: reconcile the additive baseline schema.
 *
 * Some long-lived databases have agentdesk_schema_migrations entries for
 * 001_baseline even though the baseline was expanded later. Replaying the
 * baseline here is safe because migration 001 contains only idempotent CREATE
 * TABLE/INDEX and ALTER TABLE ... IF NOT EXISTS statements.
 */
import * as baselineMigration from './migrations/001_baseline.js';

export const version = '005_baseline_schema_reconciliation';
export const description = 'Reconcile missing additive baseline tables and columns';
export const sql = baselineMigration.sql;
