-- Migration 011: Deal Rooms, Exclusivity enhancements

-- Extend exclusivity_records
ALTER TABLE exclusivity_records
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id),
  ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(2) DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS sow_id uuid REFERENCES sows(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 1. deal_rooms
CREATE TABLE IF NOT EXISTS deal_rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  sow_id          uuid REFERENCES sows(id),
  creator_id      uuid NOT NULL REFERENCES creators(id),
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','archived')),
  jurisdiction    VARCHAR(2) DEFAULT 'IN',
  created_by      uuid NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deal_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_rooms_select" ON deal_rooms
  FOR SELECT USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "deal_rooms_insert" ON deal_rooms
  FOR INSERT WITH CHECK (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "deal_rooms_update" ON deal_rooms
  FOR UPDATE USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

-- 2. deal_messages
CREATE TABLE IF NOT EXISTS deal_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id     uuid NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  sender_id        uuid NOT NULL REFERENCES profiles(id),
  message_type     TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','term_proposal','counter_proposal','acceptance','rejection')),
  content          TEXT NOT NULL,
  term_json        JSONB,
  ai_analysis_json JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_messages_select" ON deal_messages
  FOR SELECT USING (
    deal_room_id IN (
      SELECT id FROM deal_rooms
      WHERE organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "deal_messages_insert" ON deal_messages
  FOR INSERT WITH CHECK (
    deal_room_id IN (
      SELECT id FROM deal_rooms
      WHERE organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    )
  );

-- 3. exclusivity_alerts
CREATE TABLE IF NOT EXISTS exclusivity_alerts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid NOT NULL REFERENCES organisations(id),
  creator_id          uuid NOT NULL REFERENCES creators(id),
  conflicting_sow_id  uuid REFERENCES sows(id),
  existing_record_id  uuid NOT NULL REFERENCES exclusivity_records(id),
  alert_message       TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('high','medium','low')),
  resolved            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exclusivity_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exclusivity_alerts_select" ON exclusivity_alerts
  FOR SELECT USING (
    organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

-- No client INSERT policy; inserts via service client
