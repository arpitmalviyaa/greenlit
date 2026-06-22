-- Contract-native Final Contract Check. Legacy SOW rows remain supported.

ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'negotiated';
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'approved';

ALTER TABLE deal_rooms
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

ALTER TABLE term_sheets
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

ALTER TABLE delivery_locks
  ALTER COLUMN sow_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE proof_vault_entries
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE evidence_timeline
  ALTER COLUMN sow_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE delivery_locks
  DROP CONSTRAINT IF EXISTS delivery_locks_context_check,
  ADD CONSTRAINT delivery_locks_context_check
    CHECK ((sow_id IS NOT NULL)::int + (contract_id IS NOT NULL)::int = 1);

ALTER TABLE approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_context_check,
  ADD CONSTRAINT approval_requests_context_check
    CHECK (NOT (sow_id IS NOT NULL AND contract_id IS NOT NULL));

ALTER TABLE evidence_timeline
  DROP CONSTRAINT IF EXISTS evidence_timeline_context_check,
  ADD CONSTRAINT evidence_timeline_context_check
    CHECK ((sow_id IS NOT NULL)::int + (contract_id IS NOT NULL)::int = 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_locks_contract_unique
  ON delivery_locks(contract_id) WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_contract
  ON approval_requests(contract_id) WHERE contract_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_requests_contract_pending_unique
  ON approval_requests(contract_id) WHERE contract_id IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_evidence_timeline_contract
  ON evidence_timeline(contract_id) WHERE contract_id IS NOT NULL;

ALTER TABLE evidence_timeline
  DROP CONSTRAINT IF EXISTS evidence_timeline_event_type_check;

ALTER TABLE evidence_timeline
  ADD CONSTRAINT evidence_timeline_event_type_check CHECK (event_type IN (
    'sow_created','deliverable_submitted','approval_granted','revision_requested',
    'payment_made','scope_change','invoice_sent','delivery_locked','proof_uploaded',
    'final_check_started','contract_approval_granted','final_check_completed'
  ));

CREATE OR REPLACE FUNCTION fn_approval_to_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sow_id uuid;
BEGIN
  IF NEW.contract_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) VALUES (
        NEW.organisation_id, NEW.contract_id, 'final_check_started',
        'Final Contract Check started: ' || NEW.title,
        NEW.submitted_by, NEW.id, 'approval_requests'
      );
    ELSIF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
      INSERT INTO evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) VALUES (
        NEW.organisation_id, NEW.contract_id, 'contract_approval_granted',
        'Contract approval granted: ' || NEW.title,
        NEW.assigned_to, NEW.id, 'approval_requests'
      );
    ELSIF NEW.status = 'revision_requested' AND OLD.status <> 'revision_requested' THEN
      INSERT INTO evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) VALUES (
        NEW.organisation_id, NEW.contract_id, 'revision_requested',
        'Contract revision requested: ' || NEW.title,
        NEW.assigned_to, NEW.id, 'approval_requests'
      );
    END IF;
    RETURN NEW;
  END IF;

  v_sow_id := COALESCE(NEW.sow_id, (
    SELECT sow_id FROM sow_deliverables WHERE id = NEW.deliverable_id LIMIT 1
  ));
  IF v_sow_id IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    VALUES (
      NEW.organisation_id, v_sow_id,
      CASE WHEN NEW.deliverable_id IS NOT NULL THEN 'deliverable_submitted' ELSE 'sow_created' END,
      'Approval submitted: ' || NEW.title, NEW.submitted_by, NEW.id, 'approval_requests'
    );
  ELSIF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    VALUES (NEW.organisation_id, v_sow_id, 'approval_granted', 'Approval granted: ' || NEW.title, NEW.assigned_to, NEW.id, 'approval_requests');
  ELSIF NEW.status = 'revision_requested' AND OLD.status <> 'revision_requested' THEN
    INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    VALUES (NEW.organisation_id, v_sow_id, 'revision_requested', 'Revision requested: ' || NEW.title, NEW.assigned_to, NEW.id, 'approval_requests');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delivery_lock_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.contract_id IS NOT NULL THEN
    IF TG_OP = 'UPDATE' AND NEW.lock_status = 'complete' AND OLD.lock_status <> 'complete' THEN
      INSERT INTO evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) VALUES (
        NEW.organisation_id, NEW.contract_id, 'final_check_completed',
        'Final Contract Check cleared', NEW.locked_by, NEW.id, 'delivery_locks'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    VALUES (NEW.organisation_id, NEW.sow_id, 'delivery_locked', 'Delivery locked for SOW', NEW.locked_by, NEW.id, 'delivery_locks');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_lock_timeline ON delivery_locks;
CREATE TRIGGER trg_delivery_lock_timeline
  AFTER INSERT OR UPDATE ON delivery_locks
  FOR EACH ROW EXECUTE FUNCTION fn_delivery_lock_timeline();
