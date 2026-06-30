create extension if not exists pg_trgm;

alter table organisations add column if not exists deleted_at timestamptz;
alter table profiles add column if not exists deleted_at timestamptz;
alter table profiles add column if not exists refresh_token_hash text;
alter table contracts add column if not exists deleted_at timestamptz;
alter table contracts add column if not exists file_name text;
alter table contracts add column if not exists file_size_bytes bigint;
alter table contracts add column if not exists content_sha256 text;

create table if not exists brands (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists contract_versions (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  content_sha256 text not null,
  compatibility_status text not null default 'pending',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (contract_id, version_number)
);

create table if not exists contract_reviews (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  version_id uuid references contract_versions(id),
  status text not null default 'queued',
  summary text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists contract_clauses (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  version_id uuid references contract_versions(id),
  clause_type text not null,
  heading text,
  body text not null,
  risk_category text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists contract_comments (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  version_id uuid references contract_versions(id),
  clause_id uuid references contract_clauses(id),
  author_id uuid references profiles(id),
  body text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists contract_revisions (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  previous_version_id uuid references contract_versions(id),
  current_version_id uuid references contract_versions(id),
  semantic_status text not null,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists contract_exports (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  version_id uuid references contract_versions(id),
  storage_path text not null,
  signed_url_expires_at timestamptz,
  compatibility_run_id uuid references compatibility_runs(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  correlation_id text,
  created_at timestamptz not null default now()
);

create table if not exists background_jobs (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  kind text not null check (kind in ('document_parsing', 'review_generation', 'export', 'email', 'search_indexing', 'analytics', 'notifications')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'dead')),
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  idempotency_key text,
  run_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, idempotency_key)
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  profile_id uuid references profiles(id),
  kind text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists search_index (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  entity_type text not null check (entity_type in ('contracts', 'brands', 'creators', 'clauses', 'comments', 'versions')),
  entity_id uuid not null,
  title text not null,
  body text not null,
  search_vector tsvector generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) stored,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, entity_type, entity_id)
);

create table if not exists activity (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  actor_id uuid references profiles(id),
  contract_id uuid references contracts(id),
  kind text not null,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists timeline (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  event_type text not null,
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz
);

create index if not exists idx_profiles_org_email on profiles (organisation_id, email) where deleted_at is null;
create index if not exists idx_contracts_org_status on contracts (organisation_id, status) where deleted_at is null;
create index if not exists idx_contract_versions_contract on contract_versions (contract_id, version_number desc) where deleted_at is null;
create index if not exists idx_background_jobs_ready on background_jobs (status, run_at) where deleted_at is null;
create index if not exists idx_audit_logs_entity on audit_logs (organisation_id, entity_type, entity_id, created_at desc);
create index if not exists idx_search_index_vector on search_index using gin (search_vector);
create index if not exists idx_search_index_trgm on search_index using gin (title gin_trgm_ops);
create index if not exists idx_timeline_contract on timeline (contract_id, event_at desc) where deleted_at is null;

alter table brands enable row level security;
alter table contract_versions enable row level security;
alter table contract_reviews enable row level security;
alter table contract_clauses enable row level security;
alter table contract_comments enable row level security;
alter table contract_revisions enable row level security;
alter table contract_exports enable row level security;
alter table audit_logs enable row level security;
alter table background_jobs enable row level security;
alter table notifications enable row level security;
alter table search_index enable row level security;
alter table activity enable row level security;
alter table timeline enable row level security;

create policy "brands_same_org" on brands for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "contract_versions_same_org" on contract_versions for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "contract_reviews_same_org" on contract_reviews for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "contract_clauses_same_org" on contract_clauses for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "contract_comments_same_org" on contract_comments for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "contract_revisions_same_org" on contract_revisions for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "contract_exports_same_org" on contract_exports for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "audit_logs_same_org" on audit_logs for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "background_jobs_same_org" on background_jobs for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "notifications_same_org" on notifications for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "search_index_same_org" on search_index for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "activity_same_org" on activity for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "timeline_same_org" on timeline for all using (same_org(organisation_id)) with check (same_org(organisation_id));
