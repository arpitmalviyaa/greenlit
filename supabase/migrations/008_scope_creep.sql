-- Session 9: Scope Creep Monitor

DO $$ BEGIN
  CREATE TYPE change_type AS ENUM (
    'add_deliverable','modify_deliverable','remove_deliverable',
    'extend_timeline','increase_budget','platform_change','other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE change_status AS ENUM ('pending','approved','rejected','negotiating');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM (
    'deliverable_overdue','budget_exceeded','timeline_drift',
    'unapproved_change','exclusivity_breach'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('high','medium','low');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- scope_change_requests
CREATE TABLE IF NOT EXISTS scope_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  change_type change_type NOT NULL,
  description TEXT NOT NULL,
  original_value JSONB,
  proposed_value JSONB,
  impact_analysis_json JSONB,
  status change_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scope_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scr_select" ON scope_change_requests
  FOR SELECT USING (same_org(organisation_id));

CREATE POLICY "scr_insert" ON scope_change_requests
  FOR INSERT WITH CHECK (same_org(organisation_id));

CREATE POLICY "scr_update" ON scope_change_requests
  FOR UPDATE USING (
    same_org(organisation_id) AND get_user_role() = 'agency_admin'
  );

-- scope_alerts (INSERT server-side only)
CREATE TABLE IF NOT EXISTS scope_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  metadata_json JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scope_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_select" ON scope_alerts
  FOR SELECT USING (same_org(organisation_id));

CREATE POLICY "sa_update" ON scope_alerts
  FOR UPDATE USING (same_org(organisation_id));
-- No client INSERT policy — server uses service role
