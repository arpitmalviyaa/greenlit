-- Session 10: Invoices & Delivery Lock

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft','sent','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lock_status AS ENUM ('pending','complete','disputed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES sow_payment_milestones(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  brand_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  line_items_json JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (same_org(organisation_id));

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (same_org(organisation_id));

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (same_org(organisation_id));

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    same_org(organisation_id) AND get_user_role() = 'agency_admin'
  );

-- delivery_locks (one per SOW)
CREATE TABLE IF NOT EXISTS delivery_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id UUID NOT NULL REFERENCES sows(id) ON DELETE CASCADE UNIQUE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL REFERENCES profiles(id),
  locked_at TIMESTAMPTZ DEFAULT now(),
  checklist_json JSONB NOT NULL DEFAULT '{}',
  all_deliverables_approved BOOLEAN DEFAULT false,
  all_milestones_paid BOOLEAN DEFAULT false,
  compliance_cleared BOOLEAN DEFAULT false,
  final_assets_uploaded BOOLEAN DEFAULT false,
  lock_status lock_status NOT NULL DEFAULT 'pending',
  notes TEXT
);

ALTER TABLE delivery_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dl_select" ON delivery_locks
  FOR SELECT USING (same_org(organisation_id));

CREATE POLICY "dl_insert" ON delivery_locks
  FOR INSERT WITH CHECK (
    same_org(organisation_id) AND get_user_role() = 'agency_admin'
  );

CREATE POLICY "dl_update" ON delivery_locks
  FOR UPDATE USING (
    same_org(organisation_id) AND get_user_role() = 'agency_admin'
  );
