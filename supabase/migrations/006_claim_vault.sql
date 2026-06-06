-- Session 7: Claim Substantiation Vault

CREATE TYPE claim_category AS ENUM (
  'performance', 'health', 'financial', 'environmental', 'comparative', 'testimonial', 'other'
);

CREATE TYPE claim_verdict_type AS ENUM (
  'substantiated', 'unsubstantiated', 'needs_evidence', 'misleading'
);

CREATE TYPE claim_evidence_type AS ENUM (
  'study', 'certification', 'test_result', 'regulatory_approval', 'screenshot', 'other'
);

CREATE TYPE claim_audit_action AS ENUM (
  'created', 'evidence_added', 'verdict_updated', 'archived'
);

-- ─── claims ────────────────────────────────────────────────────────────────────

CREATE TABLE claims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  claim_text       TEXT NOT NULL,
  category         claim_category NOT NULL,
  jurisdiction     VARCHAR(2) NOT NULL DEFAULT 'IN',
  verdict          claim_verdict_type,
  risk_score       INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  analysis_json    JSONB,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claims_select" ON claims
  FOR SELECT USING (organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "claims_insert" ON claims
  FOR INSERT WITH CHECK (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "claims_update" ON claims
  FOR UPDATE USING (organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "claims_delete" ON claims
  FOR DELETE USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'agency_admin'
  );

CREATE INDEX claims_org_idx ON claims(organisation_id);

CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_claims_updated_at();

-- ─── claim_evidence ────────────────────────────────────────────────────────────

CREATE TABLE claim_evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id      UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  evidence_type claim_evidence_type NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  file_path     TEXT,
  source_url    TEXT,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE claim_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claim_evidence_select" ON claim_evidence
  FOR SELECT USING (
    (SELECT organisation_id FROM claims WHERE id = claim_evidence.claim_id)
    = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "claim_evidence_insert" ON claim_evidence
  FOR INSERT WITH CHECK (
    (SELECT organisation_id FROM claims WHERE id = claim_evidence.claim_id)
    = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "claim_evidence_delete" ON claim_evidence
  FOR DELETE USING (
    (SELECT organisation_id FROM claims WHERE id = claim_evidence.claim_id)
    = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'agency_admin'
  );

CREATE INDEX claim_evidence_claim_idx ON claim_evidence(claim_id);

-- ─── claim_audit_log ───────────────────────────────────────────────────────────

CREATE TABLE claim_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id     UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  action       claim_audit_action NOT NULL,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE claim_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT only for org members, no client INSERT
CREATE POLICY "claim_audit_log_select" ON claim_audit_log
  FOR SELECT USING (
    (SELECT organisation_id FROM claims WHERE id = claim_audit_log.claim_id)
    = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX claim_audit_log_claim_idx ON claim_audit_log(claim_id);

-- ─── Storage bucket: claim-evidence ───────────────────────────────────────────
-- Run in Supabase Storage dashboard:
--   Create bucket "claim-evidence" (private, 20MB per-file limit)
--   Folder structure: {organisation_id}/{claim_id}/{file_name}
-- Storage RLS policy (add in dashboard):
--   authenticated users can upload to folder matching their organisation_id
