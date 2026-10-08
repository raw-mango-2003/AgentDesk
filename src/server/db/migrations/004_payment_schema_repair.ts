/**
 * AgentDesk database migration 004: repair payment/billing schema drift.
 *
 * Migration 001 originally contained these billing tables, but its version can
 * already be marked as applied in long-lived databases. Keep this repair
 * additive and idempotent so older production databases receive the current
 * payment schema without rerunning the full baseline.
 */
export const version = '004_payment_schema_repair';
export const description = 'Repair payment intent, webhook, and invoice schema drift';

export const sql = `
CREATE TABLE IF NOT EXISTS agentdesk_payment_intents (
  order_id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL,
  pending_signup JSONB NOT NULL,
  payment_record JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_tenant
  ON agentdesk_payment_intents (tenant_id);

CREATE TABLE IF NOT EXISTS agentdesk_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(64) NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

ALTER TABLE agentdesk_invoices
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(128);

ALTER TABLE agentdesk_invoices
  ADD COLUMN IF NOT EXISTS description TEXT;
`;
