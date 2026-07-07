-- 035_corpus.sql — Q1 Corpus data layer (Day-0 sprint)
--
-- House knowledge store: contracts, disputes, judgments, negotiations, clause
-- notes and founder annotations that make every analysis smarter. This is NOT
-- tenant data — it is Greenlit's own reference corpus. Access is service-role
-- only: RLS is enabled with NO policies for the authenticated/anon roles, so the
-- client sees zero rows. The server (service role) bypasses RLS and is the sole
-- reader/writer.
--
-- DO NOT auto-apply in CI without review. Create only; apply manually.
--
-- Retrieval today = Postgres full-text search + metadata filters. The nullable
-- embedding vector(1536) column is added now (unpopulated) so pgvector semantic
-- search can be layered in later WITHOUT a schema migration.

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type corpus_doc_kind as enum
    ('contract', 'dispute', 'judgment', 'negotiation', 'clause_note', 'founder_annotation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type corpus_deal_type as enum
    ('paid_promotion', 'barter', 'ugc_license', 'ambassadorship', 'representation', 'platform', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type corpus_doc_status as enum
    ('processing', 'ready', 'needs_review', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type corpus_chunk_stance as enum
    ('market_standard', 'creator_favorable', 'brand_aggressive', 'dispute_source', 'founder_approved');
exception when duplicate_object then null; end $$;

-- ── corpus_documents ─────────────────────────────────────────────────────────
create table if not exists corpus_documents (
  id             uuid primary key default uuid_generate_v4(),
  uploaded_by    uuid references auth.users(id) on delete set null,
  doc_kind       corpus_doc_kind not null,
  deal_type      corpus_deal_type not null default 'other',
  title          text,
  source_note    text,              -- where it came from
  founder_note   text,              -- the founder's commentary
  file_path      text,              -- storage key in the `corpus` bucket (null for note-only docs)
  extracted_text text,
  status         corpus_doc_status not null default 'processing',
  created_at     timestamptz not null default now()
);

-- ── corpus_chunks ────────────────────────────────────────────────────────────
create table if not exists corpus_chunks (
  id           uuid primary key default uuid_generate_v4(),
  document_id  uuid not null references corpus_documents(id) on delete cascade,
  chunk_index  int not null,
  content      text not null,
  clause_type  text,               -- usage_rights, exclusivity, payment_terms, indemnity, termination, morality, ip_assignment, confidentiality, deliverables, ...
  risk_note    text,               -- what went wrong / why this matters
  stance       corpus_chunk_stance not null default 'market_standard',
  embedding    vector(1536),       -- nullable, unpopulated tonight (Week-1: pgvector)
  status       corpus_doc_status not null default 'ready',
  tsv          tsvector generated always as (
                 to_tsvector('english', coalesce(content, '') || ' ' || coalesce(risk_note, ''))
               ) stored,
  created_at   timestamptz not null default now()
);

-- ── analysis_corpus_refs ─────────────────────────────────────────────────────
-- Which corpus chunks fired for a given analysis. Future eval + "what knowledge
-- fired" debugging surface. Service-role only, same as the corpus itself.
create table if not exists analysis_corpus_refs (
  id           uuid primary key default uuid_generate_v4(),
  feature      text not null,      -- e.g. counsel.redflags
  contract_id  uuid,               -- soft ref; no FK so a purge of the corpus/contract never blocks logging
  chunk_ids    uuid[] not null default '{}',
  query        text,
  created_at   timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_corpus_chunks_tsv        on corpus_chunks using gin (tsv);
create index if not exists idx_corpus_chunks_document   on corpus_chunks (document_id);
create index if not exists idx_corpus_chunks_clause     on corpus_chunks (clause_type);
create index if not exists idx_corpus_chunks_stance     on corpus_chunks (stance);
create index if not exists idx_corpus_documents_deal    on corpus_documents (deal_type);
create index if not exists idx_corpus_documents_kind    on corpus_documents (doc_kind);
create index if not exists idx_corpus_documents_status  on corpus_documents (status);
create index if not exists idx_analysis_corpus_refs_contract on analysis_corpus_refs (contract_id);

-- ── RLS: service-role only, no client access ─────────────────────────────────
-- Enable RLS but define NO policies for authenticated/anon → those roles get
-- zero rows on every operation. The service role bypasses RLS entirely.
alter table corpus_documents      enable row level security;
alter table corpus_chunks         enable row level security;
alter table analysis_corpus_refs  enable row level security;

-- Belt-and-suspenders: explicit deny-all policies so intent is legible in the
-- policy list and a future permissive policy can't be added by accident without
-- someone first removing these.
drop policy if exists "corpus_documents deny all" on corpus_documents;
create policy "corpus_documents deny all" on corpus_documents
  for all to authenticated, anon using (false) with check (false);

drop policy if exists "corpus_chunks deny all" on corpus_chunks;
create policy "corpus_chunks deny all" on corpus_chunks
  for all to authenticated, anon using (false) with check (false);

drop policy if exists "analysis_corpus_refs deny all" on analysis_corpus_refs;
create policy "analysis_corpus_refs deny all" on analysis_corpus_refs
  for all to authenticated, anon using (false) with check (false);

-- ── Storage bucket ───────────────────────────────────────────────────────────
-- Private `corpus` bucket, outside every tenant workspace. No client policies:
-- only the service role (bypasses RLS) reads/writes objects here.
insert into storage.buckets (id, name, public)
values ('corpus', 'corpus', false)
on conflict (id) do nothing;
