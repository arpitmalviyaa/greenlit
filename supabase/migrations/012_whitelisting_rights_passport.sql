-- Session 13: Whitelisting Guard, Rights Pricing, Creator Safety Passport

-- ============================================================
-- WHITELISTING REQUESTS
-- ============================================================

create table whitelisting_requests (
  id                    uuid primary key default uuid_generate_v4(),
  organisation_id       uuid not null references organisations(id) on delete cascade,
  sow_id                uuid references sows(id) on delete set null,
  creator_id            uuid not null references creators(id) on delete cascade,
  brand_name            text not null,
  platform              text not null
                        check (platform in ('instagram','youtube','twitter','linkedin','tiktok')),
  content_description   text not null,
  requested_rights      text[] not null default '{}',
  jurisdiction          varchar(2) not null default 'IN',
  analysis_json         jsonb,
  status                text not null default 'pending_review'
                        check (status in ('pending_review','approved','rejected','needs_amendment')),
  created_at            timestamptz not null default now()
);

alter table whitelisting_requests enable row level security;

create policy "whitelisting_select" on whitelisting_requests for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.organisation_id = whitelisting_requests.organisation_id
    )
  );

create policy "whitelisting_insert" on whitelisting_requests for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.organisation_id = whitelisting_requests.organisation_id
    )
  );

create policy "whitelisting_update" on whitelisting_requests for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organisation_id = whitelisting_requests.organisation_id
        and p.role = 'agency_admin'
    )
  );

-- ============================================================
-- RIGHTS VALUATIONS
-- ============================================================

create table rights_valuations (
  id                    uuid primary key default uuid_generate_v4(),
  organisation_id       uuid not null references organisations(id) on delete cascade,
  creator_id            uuid not null references creators(id) on delete cascade,
  content_type          text not null,
  platforms             text[] not null default '{}',
  duration_days         integer not null,
  territory             text not null,
  exclusivity           boolean not null default false,
  usage_types           text[] not null default '{}',
  jurisdiction          varchar(2) not null default 'IN',
  base_fee              numeric(12,2),
  suggested_range_low   numeric(12,2),
  suggested_range_high  numeric(12,2),
  reasoning             text,
  created_at            timestamptz not null default now()
);

alter table rights_valuations enable row level security;

create policy "rights_valuations_select" on rights_valuations for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.organisation_id = rights_valuations.organisation_id
    )
  );

create policy "rights_valuations_insert" on rights_valuations for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.organisation_id = rights_valuations.organisation_id
    )
  );

-- ============================================================
-- SAFETY PASSPORTS
-- ============================================================

create table safety_passports (
  id                uuid primary key default uuid_generate_v4(),
  organisation_id   uuid not null references organisations(id) on delete cascade,
  creator_id        uuid not null references creators(id) on delete cascade,
  jurisdiction      varchar(2) not null default 'IN',
  compliance_score  integer check (compliance_score between 0 and 100),
  last_assessed_at  timestamptz,
  checklist_json    jsonb not null default '[]',
  risk_flags        text[],
  status            text not null default 'clear'
                    check (status in ('clear','flagged','suspended')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organisation_id, creator_id)
);

alter table safety_passports enable row level security;

create policy "safety_passports_select" on safety_passports for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.organisation_id = safety_passports.organisation_id
    )
  );

create policy "safety_passports_insert_update" on safety_passports for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organisation_id = safety_passports.organisation_id
        and p.role = 'agency_admin'
    )
  );

create trigger safety_passports_updated_at
  before update on safety_passports
  for each row execute procedure update_updated_at_column();
