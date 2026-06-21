-- Negotiation Assistant standalone path. Legacy SOW links remain nullable for old rows.

ALTER TABLE deal_rooms
  ALTER COLUMN creator_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS counterparty_name TEXT;

ALTER TABLE scope_change_requests
  ALTER COLUMN sow_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE;

ALTER TABLE scope_alerts
  ALTER COLUMN sow_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE;

ALTER TABLE scope_change_requests
  DROP CONSTRAINT IF EXISTS scope_change_requests_context_check,
  ADD CONSTRAINT scope_change_requests_context_check
    CHECK (sow_id IS NOT NULL OR deal_room_id IS NOT NULL);

ALTER TABLE scope_alerts
  DROP CONSTRAINT IF EXISTS scope_alerts_context_check,
  ADD CONSTRAINT scope_alerts_context_check
    CHECK (sow_id IS NOT NULL OR deal_room_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_scope_change_requests_deal_room
  ON scope_change_requests(deal_room_id);

CREATE INDEX IF NOT EXISTS idx_scope_alerts_deal_room
  ON scope_alerts(deal_room_id);
