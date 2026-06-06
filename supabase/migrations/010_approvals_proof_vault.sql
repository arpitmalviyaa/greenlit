-- Migration 010: Approvals, Proof Vault, Evidence Timeline

-- 1. approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid NOT NULL REFERENCES organisations(id),
  sow_id               uuid REFERENCES sows(id),
  deliverable_id       uuid REFERENCES sow_deliverables(id),
  submitted_by         uuid NOT NULL REFERENCES profiles(id),
  assigned_to          uuid REFERENCES profiles(id),
  title                TEXT NOT NULL,
  description          TEXT,
  content_url          TEXT,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revision_requested')),
  feedback             TEXT,
  due_date             DATE,
  resolved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: own org members
CREATE POLICY "approval_requests_select" ON approval_requests
  FOR SELECT USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

-- INSERT: creators, managers, agency_admin
CREATE POLICY "approval_requests_insert" ON approval_requests
  FOR INSERT WITH CHECK (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('creator','manager','agency_admin')
  );

-- UPDATE: agency_admin + brand
CREATE POLICY "approval_requests_update" ON approval_requests
  FOR UPDATE USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('agency_admin','brand')
  );

-- 2. proof_vault_entries
CREATE TABLE IF NOT EXISTS proof_vault_entries (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         uuid NOT NULL REFERENCES organisations(id),
  approval_request_id     uuid REFERENCES approval_requests(id),
  sow_id                  uuid REFERENCES sows(id),
  entry_type              TEXT NOT NULL CHECK (entry_type IN ('screenshot','video','document','url_capture','metric_report')),
  title                   TEXT NOT NULL,
  file_path               TEXT,
  external_url            TEXT,
  metadata_json           JSONB,
  uploaded_by             uuid NOT NULL REFERENCES profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE proof_vault_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proof_vault_select" ON proof_vault_entries
  FOR SELECT USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "proof_vault_insert" ON proof_vault_entries
  FOR INSERT WITH CHECK (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

-- 3. evidence_timeline
CREATE TABLE IF NOT EXISTS evidence_timeline (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES organisations(id),
  sow_id           uuid NOT NULL REFERENCES sows(id),
  event_type       TEXT NOT NULL CHECK (event_type IN (
    'sow_created','deliverable_submitted','approval_granted','revision_requested',
    'payment_made','scope_change','invoice_sent','delivery_locked','proof_uploaded'
  )),
  title            TEXT NOT NULL,
  description      TEXT,
  actor_id         uuid REFERENCES profiles(id),
  reference_id     uuid,
  reference_table  TEXT,
  metadata_json    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE evidence_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_timeline_select" ON evidence_timeline
  FOR SELECT USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

-- No client INSERT policy; inserts happen server-side via service client

-- Storage bucket comment
-- Create storage bucket 'proof-vault' (private, 50MB per file)

-- ============================================================
-- TRIGGERS: approval_requests → evidence_timeline
-- ============================================================

CREATE OR REPLACE FUNCTION fn_approval_to_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sow_id uuid;
  v_org_id uuid;
BEGIN
  -- Resolve sow_id — fallback to approval_requests.sow_id if deliverable has none
  v_sow_id := COALESCE(NEW.sow_id, (
    SELECT sow_id FROM sow_deliverables WHERE id = NEW.deliverable_id LIMIT 1
  ));
  v_org_id := NEW.organisation_id;

  IF v_sow_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    VALUES (
      v_org_id,
      v_sow_id,
      CASE WHEN NEW.deliverable_id IS NOT NULL THEN 'deliverable_submitted' ELSE 'sow_created' END,
      'Approval submitted: ' || NEW.title,
      NEW.submitted_by,
      NEW.id,
      'approval_requests'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
      INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
      VALUES (v_org_id, v_sow_id, 'approval_granted', 'Approval granted: ' || NEW.title, NEW.assigned_to, NEW.id, 'approval_requests');
    ELSIF NEW.status = 'revision_requested' AND OLD.status <> 'revision_requested' THEN
      INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
      VALUES (v_org_id, v_sow_id, 'revision_requested', 'Revision requested: ' || NEW.title, NEW.assigned_to, NEW.id, 'approval_requests');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_to_timeline ON approval_requests;
CREATE TRIGGER trg_approval_to_timeline
  AFTER INSERT OR UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION fn_approval_to_timeline();

-- ============================================================
-- TRIGGER: invoices status='paid' → evidence_timeline
-- ============================================================

CREATE OR REPLACE FUNCTION fn_invoice_paid_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' AND NEW.sow_id IS NOT NULL THEN
    INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    VALUES (NEW.organisation_id, NEW.sow_id, 'payment_made', 'Payment received for invoice ' || NEW.invoice_number, NEW.created_by, NEW.id, 'invoices');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_paid_timeline ON invoices;
CREATE TRIGGER trg_invoice_paid_timeline
  AFTER UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION fn_invoice_paid_timeline();

-- ============================================================
-- TRIGGER: delivery_locks INSERT → evidence_timeline
-- ============================================================

CREATE OR REPLACE FUNCTION fn_delivery_lock_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
  VALUES (NEW.organisation_id, NEW.sow_id, 'delivery_locked', 'Delivery locked for SOW', NEW.locked_by, NEW.id, 'delivery_locks');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_lock_timeline ON delivery_locks;
CREATE TRIGGER trg_delivery_lock_timeline
  AFTER INSERT ON delivery_locks
  FOR EACH ROW EXECUTE FUNCTION fn_delivery_lock_timeline();
