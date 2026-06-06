-- Migration 004: Jurisdiction infrastructure + corpus layer

-- ── organisation_jurisdictions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisation_jurisdictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  jurisdiction_code VARCHAR(2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'coming_soon')),
  activated_at      TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, jurisdiction_code)
);

ALTER TABLE organisation_jurisdictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_jurisdiction_select" ON organisation_jurisdictions
  FOR SELECT USING (
    organisation_id = get_user_org_id()
  );

CREATE POLICY "org_jurisdiction_insert" ON organisation_jurisdictions
  FOR INSERT WITH CHECK (
    organisation_id = get_user_org_id()
    AND get_user_role() = 'agency_admin'
  );

CREATE POLICY "org_jurisdiction_update" ON organisation_jurisdictions
  FOR UPDATE USING (
    organisation_id = get_user_org_id()
    AND get_user_role() = 'agency_admin'
  );

-- ── jurisdiction_corpus ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jurisdiction_corpus (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code VARCHAR(2) NOT NULL,
  content_type      TEXT NOT NULL CHECK (content_type IN ('statute', 'judgment', 'regulation', 'news')),
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  source            VARCHAR NOT NULL,
  source_url        TEXT,
  last_updated      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corpus_jurisdiction ON jurisdiction_corpus (jurisdiction_code);

-- jurisdiction_corpus is read-only for authenticated users (no RLS needed for now — service role manages inserts)
ALTER TABLE jurisdiction_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corpus_select_authenticated" ON jurisdiction_corpus
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── Add jurisdiction column to contracts ────────────────────────────────────
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(2) NOT NULL DEFAULT 'IN';

-- ── Add jurisdiction column to content_scans ────────────────────────────────
ALTER TABLE content_scans ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(2) NOT NULL DEFAULT 'IN';

-- ── Seed: insert IN as active for all existing organisations ─────────────────
INSERT INTO organisation_jurisdictions (organisation_id, jurisdiction_code, status, activated_at)
SELECT id, 'IN', 'active', now()
FROM organisations
ON CONFLICT (organisation_id, jurisdiction_code) DO NOTHING;
