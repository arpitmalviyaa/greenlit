-- Session 20: Cross-Reference + Adversary Lens + Complaint Simulator

create type adversary_type as enum ('regulator','competitor','consumer','creator','brand');
create type complaint_body_type as enum ('ASCI','SEBI','MCA','consumer_court','FTC','ASA','ICO','other');

create table cross_reference_queries (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  query_text       text not null,
  jurisdictions    text[] not null,
  result_json      jsonb,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

alter table cross_reference_queries enable row level security;

create policy "cross_ref_select" on cross_reference_queries for select
  using (organisation_id = get_user_org_id());

create policy "cross_ref_insert" on cross_reference_queries for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());

create table adversary_analyses (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  scenario_text    text not null,
  adversary_type   adversary_type not null,
  jurisdiction     varchar(2) not null default 'IN',
  analysis_json    jsonb,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

alter table adversary_analyses enable row level security;

create policy "adversary_select" on adversary_analyses for select
  using (organisation_id = get_user_org_id());

create policy "adversary_insert" on adversary_analyses for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());

create table complaint_simulations (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  content_or_practice text not null,
  complaint_body   complaint_body_type not null,
  jurisdiction     varchar(2) not null default 'IN',
  simulation_json  jsonb,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

alter table complaint_simulations enable row level security;

create policy "complaint_sim_select" on complaint_simulations for select
  using (organisation_id = get_user_org_id());

create policy "complaint_sim_insert" on complaint_simulations for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());
