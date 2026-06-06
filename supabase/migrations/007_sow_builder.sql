-- Session 8: SOW Builder

-- Enums
DO $$ BEGIN
  CREATE TYPE sow_category AS ENUM ('influencer_campaign','brand_deal','content_production','ambassador','event','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sow_status AS ENUM ('draft','sent','negotiating','signed','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE deliverable_platform AS ENUM ('instagram','youtube','twitter','linkedin','tiktok','offline','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE deliverable_content_type AS ENUM ('post','reel','story','video','blog','podcast','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE deliverable_status AS ENUM ('pending','in_progress','submitted','approved','rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('pending','invoiced','paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- sow_templates
CREATE TABLE IF NOT EXISTS sow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category sow_category NOT NULL DEFAULT 'other',
  template_json JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER sow_templates_updated_at
  BEFORE UPDATE ON sow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sow_templates_select" ON sow_templates
  FOR SELECT USING (same_org(organisation_id));

CREATE POLICY "sow_templates_insert" ON sow_templates
  FOR INSERT WITH CHECK (same_org(organisation_id));

CREATE POLICY "sow_templates_update" ON sow_templates
  FOR UPDATE USING (same_org(organisation_id));

CREATE POLICY "sow_templates_delete" ON sow_templates
  FOR DELETE USING (
    same_org(organisation_id) AND get_user_role() = 'agency_admin'
  );

-- sows
CREATE TABLE IF NOT EXISTS sows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  template_id UUID REFERENCES sow_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  jurisdiction VARCHAR(2) DEFAULT 'IN',
  status sow_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  total_value NUMERIC(12,2),
  currency VARCHAR(3) DEFAULT 'INR',
  sow_json JSONB NOT NULL DEFAULT '{}',
  ai_suggestions_json JSONB,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER sows_updated_at
  BEFORE UPDATE ON sows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sows_select" ON sows
  FOR SELECT USING (same_org(organisation_id));

CREATE POLICY "sows_insert" ON sows
  FOR INSERT WITH CHECK (same_org(organisation_id));

CREATE POLICY "sows_update" ON sows
  FOR UPDATE USING (same_org(organisation_id));

CREATE POLICY "sows_delete" ON sows
  FOR DELETE USING (
    same_org(organisation_id) AND get_user_role() = 'agency_admin'
  );

-- sow_deliverables
CREATE TABLE IF NOT EXISTS sow_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  platform deliverable_platform NOT NULL DEFAULT 'other',
  content_type deliverable_content_type NOT NULL DEFAULT 'other',
  quantity INTEGER DEFAULT 1,
  due_date DATE,
  value NUMERIC(12,2),
  status deliverable_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sow_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sow_deliverables_select" ON sow_deliverables
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_deliverables.sow_id AND same_org(sows.organisation_id))
  );

CREATE POLICY "sow_deliverables_insert" ON sow_deliverables
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_deliverables.sow_id AND same_org(sows.organisation_id))
  );

CREATE POLICY "sow_deliverables_update" ON sow_deliverables
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_deliverables.sow_id AND same_org(sows.organisation_id))
  );

CREATE POLICY "sow_deliverables_delete" ON sow_deliverables
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_deliverables.sow_id AND same_org(sows.organisation_id))
    AND get_user_role() = 'agency_admin'
  );

-- sow_payment_milestones
CREATE TABLE IF NOT EXISTS sow_payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  trigger_event TEXT,
  status milestone_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sow_payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sow_milestones_select" ON sow_payment_milestones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_payment_milestones.sow_id AND same_org(sows.organisation_id))
  );

CREATE POLICY "sow_milestones_insert" ON sow_payment_milestones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_payment_milestones.sow_id AND same_org(sows.organisation_id))
  );

CREATE POLICY "sow_milestones_update" ON sow_payment_milestones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_payment_milestones.sow_id AND same_org(sows.organisation_id))
  );

CREATE POLICY "sow_milestones_delete" ON sow_payment_milestones
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sows WHERE sows.id = sow_payment_milestones.sow_id AND same_org(sows.organisation_id))
    AND get_user_role() = 'agency_admin'
  );
