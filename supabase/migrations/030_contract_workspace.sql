-- Contract workspace: immutable revisions, negotiation history, and a
-- metadata-only platform administrator boundary.

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_select_self" ON platform_admins
  FOR SELECT USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  raw_text TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  comparison_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version_number)
);

ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_versions_owner_select" ON contract_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id AND c.uploaded_by = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  clause_index INTEGER,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'draft', 'internal')),
  source_text TEXT,
  generated_text TEXT,
  tone TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE negotiation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "negotiation_messages_owner_all" ON negotiation_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id AND c.uploaded_by = auth.uid()
    )
  ) WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id AND c.uploaded_by = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION platform_creator_overview()
RETURNS TABLE (
  profile_id UUID,
  creator_name TEXT,
  email TEXT,
  organisation_name TEXT,
  contract_count BIGINT,
  pending_count BIGINT,
  last_contract_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.email,
    o.name,
    COUNT(c.id),
    COUNT(c.id) FILTER (WHERE c.status = 'pending_review'),
    MAX(c.created_at)
  FROM profiles p
  LEFT JOIN organisations o ON o.id = p.organisation_id
  LEFT JOIN contracts c ON c.uploaded_by = p.id
  WHERE p.role = 'creator'
    AND EXISTS (SELECT 1 FROM platform_admins a WHERE a.user_id = auth.uid())
  GROUP BY p.id, p.name, p.email, o.name;
$$;

REVOKE ALL ON FUNCTION platform_creator_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_creator_overview() TO authenticated;

GRANT SELECT ON platform_admins TO authenticated;
GRANT SELECT, INSERT ON contract_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON negotiation_messages TO authenticated;
GRANT ALL ON platform_admins, contract_versions, negotiation_messages TO service_role;
