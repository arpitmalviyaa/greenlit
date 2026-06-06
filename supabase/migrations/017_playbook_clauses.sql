-- Session 18: Agency Legal Playbook + Clause Library + NDA Trap Detector

create type playbook_category as enum (
  'negotiation_rule','red_line','standard_position',
  'escalation_protocol','approved_language','jurisdiction_note'
);

create type clause_type as enum (
  'exclusivity','payment','ip_ownership','indemnity',
  'termination','usage_rights','confidentiality',
  'dispute_resolution','governing_law','other'
);

create type clause_risk_level as enum ('standard','favourable','unfavourable','red_line');

create type nda_verdict as enum ('safe','caution','dangerous');

create table playbook_entries (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  title            text not null,
  category         playbook_category not null,
  content          text not null,
  jurisdiction     varchar(2) not null default 'IN',
  tags             text[] not null default '{}',
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table playbook_entries enable row level security;

create policy "playbook_select" on playbook_entries for select
  using (organisation_id = get_user_org_id());

create policy "playbook_insert" on playbook_entries for insert
  with check (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "playbook_update" on playbook_entries for update
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "playbook_delete" on playbook_entries for delete
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create trigger playbook_entries_updated_at before update on playbook_entries
  for each row execute procedure set_updated_at();

create table clause_library (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  clause_name      text not null,
  clause_type      clause_type not null,
  clause_text      text not null,
  jurisdiction     varchar(2) not null default 'IN',
  risk_level       clause_risk_level not null default 'standard',
  notes            text,
  approved         boolean not null default false,
  analysis_json    jsonb,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

alter table clause_library enable row level security;

create policy "clause_library_select" on clause_library for select
  using (organisation_id = get_user_org_id());

create policy "clause_library_insert" on clause_library for insert
  with check (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "clause_library_update" on clause_library for update
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "clause_library_delete" on clause_library for delete
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create table nda_scans (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  nda_text         text not null,
  jurisdiction     varchar(2) not null default 'IN',
  traps_json       jsonb,
  safe_clauses_json jsonb,
  overall_verdict  nda_verdict,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

alter table nda_scans enable row level security;

create policy "nda_scans_select" on nda_scans for select
  using (organisation_id = get_user_org_id());

create policy "nda_scans_insert" on nda_scans for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());
