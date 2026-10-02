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

-- If application code submits the same contact again, redirect the insert to
-- the existing tenant lead so the existing ON CONFLICT(id) update path remains
-- safe without creating a second contact record.
CREATE OR REPLACE FUNCTION agentdesk_merge_duplicate_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  existing_id VARCHAR(128);
  existing_created_at VARCHAR(64);
BEGIN
  SELECT id, created_at
    INTO existing_id, existing_created_at
  FROM agentdesk_leads
  WHERE tenant_id = NEW.tenant_id
    AND (
      (NEW.email IS NOT NULL AND BTRIM(NEW.email) <> ''
       AND email IS NOT NULL AND LOWER(BTRIM(email)) = LOWER(BTRIM(NEW.email)))
      OR
      (NEW.phone IS NOT NULL AND REGEXP_REPLACE(NEW.phone, '[^0-9]+', '', 'g') <> ''
       AND phone IS NOT NULL
       AND REGEXP_REPLACE(phone, '[^0-9]+', '', 'g') = REGEXP_REPLACE(NEW.phone, '[^0-9]+', '', 'g'))
    )
  ORDER BY updated_at DESC, created_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    NEW.id := existing_id;
    NEW.created_at := existing_created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agentdesk_merge_duplicate_lead ON agentdesk_leads;
CREATE TRIGGER trg_agentdesk_merge_duplicate_lead
BEFORE INSERT ON agentdesk_leads
FOR EACH ROW
EXECUTE FUNCTION agentdesk_merge_duplicate_lead();

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
