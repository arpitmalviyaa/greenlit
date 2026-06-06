-- Session 6: Content Scanner Advanced
-- Table: content_advanced_scans

CREATE TYPE scan_type_advanced AS ENUM (
  'defamation_heatmap',
  'brand_compare',
  'platform_scan',
  'regulated',
  'dark_patterns'
);

CREATE TABLE content_advanced_scans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  scan_type        scan_type_advanced NOT NULL,
  input_json       JSONB NOT NULL,
  result_json      JSONB NOT NULL,
  jurisdiction     VARCHAR(2) NOT NULL DEFAULT 'IN',
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_advanced_scans ENABLE ROW LEVEL SECURITY;

-- SELECT / INSERT: own org members
CREATE POLICY "content_advanced_scans_select" ON content_advanced_scans
  FOR SELECT USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "content_advanced_scans_insert" ON content_advanced_scans
  FOR INSERT WITH CHECK (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- DELETE: agency_admin only
CREATE POLICY "content_advanced_scans_delete" ON content_advanced_scans
  FOR DELETE USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'agency_admin'
  );

CREATE INDEX content_advanced_scans_org_idx ON content_advanced_scans(organisation_id);
CREATE INDEX content_advanced_scans_type_idx ON content_advanced_scans(scan_type);
