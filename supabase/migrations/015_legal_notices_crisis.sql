-- Session 16: Legal Notice Triage + Liability Map + Crisis Room

-- Add columns to existing legal_notices if not present
alter table legal_notices add column if not exists triage_json jsonb;
alter table legal_notices add column if not exists liability_map_json jsonb;
alter table legal_notices add column if not exists crisis_room_id uuid;
alter table legal_notices add column if not exists notice_type text;
alter table legal_notices add column if not exists sender text;
alter table legal_notices add column if not exists notice_text text;

create type crisis_severity as enum ('critical','high','medium','low');
create type crisis_status as enum ('active','monitoring','resolved');

create table crisis_rooms (
  id                uuid primary key default uuid_generate_v4(),
  organisation_id   uuid not null references organisations(id) on delete cascade,
  legal_notice_id   uuid references legal_notices(id),
  title             text not null,
  severity          crisis_severity not null,
  status            crisis_status not null default 'active',
  jurisdiction      varchar(2) not null default 'IN',
  timeline_json     jsonb not null default '[]',
  action_plan_json  jsonb,
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table crisis_rooms enable row level security;

create policy "crisis_rooms_select" on crisis_rooms for select
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "crisis_rooms_insert" on crisis_rooms for insert
  with check (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "crisis_rooms_update" on crisis_rooms for update
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create trigger crisis_rooms_updated_at before update on crisis_rooms
  for each row execute procedure set_updated_at();

create table liability_maps (
  id                uuid primary key default uuid_generate_v4(),
  organisation_id   uuid not null references organisations(id) on delete cascade,
  legal_notice_id   uuid references legal_notices(id),
  crisis_room_id    uuid references crisis_rooms(id),
  parties_json      jsonb not null default '[]',
  exposure_json     jsonb not null default '{}',
  mitigation_json   jsonb not null default '[]',
  jurisdiction      varchar(2) not null default 'IN',
  created_at        timestamptz not null default now()
);

alter table liability_maps enable row level security;

create policy "liability_maps_select" on liability_maps for select
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "liability_maps_insert" on liability_maps for insert
  with check (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));
