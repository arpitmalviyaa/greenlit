create extension if not exists "uuid-ossp";

create table if not exists compatibility_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  contract_version_id uuid,
  source_name text not null,
  valid boolean not null,
  package_valid boolean not null,
  ooxml_valid boolean not null,
  xml_schema_valid boolean not null,
  round_trip_valid boolean not null,
  feature_counts jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  editor_validations jsonb not null default '[]'::jsonb,
  snapshot_hash text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists golden_documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  name text not null,
  expected_features jsonb not null default '{}'::jsonb,
  snapshot_hash text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, name)
);

create index if not exists idx_compatibility_runs_org_created
  on compatibility_runs (organisation_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_golden_documents_org_name
  on golden_documents (organisation_id, name)
  where deleted_at is null;

alter table compatibility_runs enable row level security;
alter table golden_documents enable row level security;

create policy "compatibility_runs_select"
  on compatibility_runs for select
  using (same_org(organisation_id));

create policy "compatibility_runs_insert"
  on compatibility_runs for insert
  with check (same_org(organisation_id));

create policy "golden_documents_select"
  on golden_documents for select
  using (organisation_id is null or same_org(organisation_id));

create policy "golden_documents_insert"
  on golden_documents for insert
  with check (same_org(organisation_id));
