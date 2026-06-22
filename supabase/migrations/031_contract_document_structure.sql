ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS document_html TEXT;

ALTER TABLE negotiation_messages
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
  CHECK (channel IN ('email', 'whatsapp', 'internal'));
