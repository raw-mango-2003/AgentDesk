/**
 * AgentDesk database migration 002: lead deduplication safeguards.
 *
 * A visitor can submit the callback form more than once. A lead is therefore
 * unique per tenant/contact identity, not per browser submission. Existing
 * duplicate test/legacy rows are collapsed before the unique indexes are added.
 */
export const version = '002_lead_deduplication';
export const description = 'Deduplicate tenant leads and enforce unique email/phone identities';
export const sql = `
-- Keep the newest row for duplicate email identities within a tenant.
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_id, LOWER(BTRIM(email))
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM agentdesk_leads
  WHERE email IS NOT NULL AND BTRIM(email) <> ''
)
DELETE FROM agentdesk_leads lead
USING ranked
WHERE lead.ctid = ranked.ctid
  AND ranked.rn > 1;

-- Then collapse duplicate phone identities. Phone formatting differences are
-- normalized to digits only so +91 98765 43210 and 919876543210 match.
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_id, REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]+', '', 'g')
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM agentdesk_leads
  WHERE phone IS NOT NULL
    AND REGEXP_REPLACE(phone, '[^0-9]+', '', 'g') <> ''
)
DELETE FROM agentdesk_leads lead
USING ranked
WHERE lead.ctid = ranked.ctid
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agentdesk_leads_tenant_email_norm
  ON agentdesk_leads (tenant_id, LOWER(BTRIM(email)))
  WHERE email IS NOT NULL AND BTRIM(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_agentdesk_leads_tenant_phone_norm
  ON agentdesk_leads (
    tenant_id,
    REGEXP_REPLACE(phone, '[^0-9]+', '', 'g')
  )
  WHERE phone IS NOT NULL
    AND REGEXP_REPLACE(phone, '[^0-9]+', '', 'g') <> '';
`;
