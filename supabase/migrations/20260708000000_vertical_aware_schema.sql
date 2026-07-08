-- 20260708000000_vertical_aware_schema.sql — Phase 1: vertical-aware corpus.
--
-- Adds a second vertical (Indian startup founders) alongside creators on the SAME
-- engine. A `vertical` partitions house-knowledge so creator and startup corpora
-- never co-retrieve; 'general' is cross-cutting knowledge shared by all.
--
-- Additive only. Existing rows default to 'creator' — nothing creator-facing changes.
-- DO NOT auto-apply in CI. Apply to a preview branch, prove isolation, then prod.

-- ── Enum ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type vertical as enum ('creator', 'startup', 'litigation', 'general');
exception when duplicate_object then null; end $$;

-- ── corpus_documents / corpus_chunks: vertical column ────────────────────────
-- `add column ... default 'creator'` backfills every existing row to 'creator'
-- in one shot (Postgres 11+ metadata-only), so no separate UPDATE is needed.
-- vertical is denormalized onto corpus_chunks so retrieval filters at the chunk
-- level without a join.
alter table corpus_documents add column if not exists vertical vertical not null default 'creator';
alter table corpus_chunks    add column if not exists vertical vertical not null default 'creator';

create index if not exists idx_corpus_chunks_vertical    on corpus_chunks (vertical);
create index if not exists idx_corpus_documents_vertical on corpus_documents (vertical);

-- ── contracts: sub_type ──────────────────────────────────────────────────────
-- Deliberately a nullable text column, NOT a widened deal_type enum: creator
-- flows leave it null; startup flows (Phase 2) write sub_type values validated in
-- application code. Promoted to a real enum only when the public product builds.
alter table contracts add column if not exists sub_type text;
