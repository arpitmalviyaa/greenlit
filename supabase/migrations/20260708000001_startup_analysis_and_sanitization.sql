-- 20260708000001_startup_analysis_and_sanitization.sql
-- Phase 2/3/4: startup document review + data-room matters + Founder Readiness Memo
-- (with a human review gate), and the corpus sanitization gate.
--
-- Additive only. Startup tables are service-role-only (RLS enabled, deny-all for
-- client roles) — the exact pattern corpus tables use, since this vertical has no
-- tenant-facing UI. Workspace isolation is by `workspace_id` (query-scoped by the
-- admin surface); no FK to organisations so the vertical stays decoupled from the
-- creator schema.
-- ponytail: workspace_id has no FK + no same_org RLS. Add both if the startup
-- vertical ever gets tenant-facing reads (out of scope now).

-- ── Enum: memo review gate ───────────────────────────────────────────────────
do $$ begin
  create type startup_memo_status as enum ('draft', 'reviewed');
exception when duplicate_object then null; end $$;

-- ── startup_matters ──────────────────────────────────────────────────────────
-- One matter groups N documents. A single-document review is a matter with one doc.
create table if not exists startup_matters (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid,                      -- founder's workspace (no FK; isolation by query)
  created_by      uuid references auth.users(id) on delete set null,
  title           text not null,
  sub_type        text,                      -- 'data_room' for multi-doc; else the single doc's sub_type
  founder_context jsonb,                     -- { stage, round, concerns }
  created_at      timestamptz not null default now()
);

-- ── startup_documents ────────────────────────────────────────────────────────
create table if not exists startup_documents (
  id             uuid primary key default uuid_generate_v4(),
  matter_id      uuid not null references startup_matters(id) on delete cascade,
  workspace_id   uuid,
  sub_type       text not null,              -- term_sheet | sha | ssa | safe_ccps | esop | ... (validated in app code)
  title          text,
  file_path      text,                       -- storage key in the `startup-docs` bucket
  extracted_text text,
  doc_analysis   jsonb,                       -- per-doc axis findings + extracted key_terms
  status         text not null default 'processing',   -- processing | ready | failed
  created_at     timestamptz not null default now()
);

-- ── startup_memos ────────────────────────────────────────────────────────────
-- The Founder Readiness Memo. Generated in DRAFT; only REVIEWED unlocks export.
create table if not exists startup_memos (
  id            uuid primary key default uuid_generate_v4(),
  matter_id     uuid not null references startup_matters(id) on delete cascade,
  workspace_id  uuid,
  memo_json     jsonb not null,
  status        startup_memo_status not null default 'draft',
  prepared_for  text,
  document_label text,                        -- "document reviewed" header field
  reviewed_by   text,                         -- advocate name (editable header field)
  reviewer_user uuid references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_startup_documents_matter on startup_documents (matter_id);
create index if not exists idx_startup_memos_matter      on startup_memos (matter_id);
create index if not exists idx_startup_matters_workspace on startup_matters (workspace_id);

-- ── RLS: service-role only, no client access (mirrors corpus tables) ─────────
alter table startup_matters   enable row level security;
alter table startup_documents enable row level security;
alter table startup_memos     enable row level security;

drop policy if exists "startup_matters deny all" on startup_matters;
create policy "startup_matters deny all" on startup_matters
  for all to authenticated, anon using (false) with check (false);
drop policy if exists "startup_documents deny all" on startup_documents;
create policy "startup_documents deny all" on startup_documents
  for all to authenticated, anon using (false) with check (false);
drop policy if exists "startup_memos deny all" on startup_memos;
create policy "startup_memos deny all" on startup_memos
  for all to authenticated, anon using (false) with check (false);

-- ── Storage bucket for founder documents ─────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('startup-docs', 'startup-docs', false)
on conflict (id) do nothing;

-- ── D: corpus sanitization gate ──────────────────────────────────────────────
-- Unsanitized docs must never appear in retrieval. New uploads default to false
-- (require an explicit sanitize confirmation); existing corpus is already curated,
-- so backfill it to true — retrieval of the current corpus is unchanged.
alter table corpus_documents add column if not exists sanitized boolean not null default false;
update corpus_documents set sanitized = true where sanitized = false;
