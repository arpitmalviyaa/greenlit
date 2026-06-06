-- Session 17: IP Records + Infringement Evidence Vault + Takedown Assistant

-- Add columns to existing ip_records if not present
alter table ip_records add column if not exists title text;
alter table ip_records add column if not exists ip_type text;
alter table ip_records add column if not exists registration_number text;
alter table ip_records add column if not exists registration_date date;
alter table ip_records add column if not exists expiry_date date;
alter table ip_records add column if not exists jurisdiction varchar(2) default 'IN';
alter table ip_records add column if not exists status text default 'active' check (status in ('active','expired','disputed','abandoned'));
alter table ip_records add column if not exists created_by uuid references profiles(id);

create type infringement_status as enum ('detected','notice_sent','takedown_requested','taken_down','dispute_filed','resolved');
create type notice_type_enum as enum ('dmca','platform_report','cease_and_desist','legal_demand');
create type takedown_status as enum ('draft','sent','acknowledged','complied','disputed');

create table infringement_records (
  id                  uuid primary key default uuid_generate_v4(),
  organisation_id     uuid not null references organisations(id) on delete cascade,
  ip_record_id        uuid not null references ip_records(id) on delete cascade,
  infringing_url      text not null,
  platform            text not null,
  infringement_type   text not null,
  description         text,
  evidence_paths      text[] not null default '{}',
  jurisdiction        varchar(2) not null default 'IN',
  status              infringement_status not null default 'detected',
  analysis_json       jsonb,
  detected_at         timestamptz not null default now(),
  created_by          uuid not null references profiles(id),
  created_at          timestamptz not null default now()
);

alter table infringement_records enable row level security;

create policy "infringement_select" on infringement_records for select
  using (organisation_id = get_user_org_id());

create policy "infringement_insert" on infringement_records for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());

create policy "infringement_update" on infringement_records for update
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create table takedown_notices (
  id                      uuid primary key default uuid_generate_v4(),
  organisation_id         uuid not null references organisations(id) on delete cascade,
  infringement_record_id  uuid not null references infringement_records(id) on delete cascade,
  platform                text not null,
  notice_type             notice_type_enum not null,
  notice_text             text not null,
  generated_by_ai         boolean not null default true,
  status                  takedown_status not null default 'draft',
  filing_instructions     text[],
  sent_at                 timestamptz,
  created_at              timestamptz not null default now()
);

alter table takedown_notices enable row level security;

create policy "takedown_select" on takedown_notices for select
  using (organisation_id = get_user_org_id());

create policy "takedown_insert" on takedown_notices for insert
  with check (organisation_id = get_user_org_id());

create policy "takedown_update" on takedown_notices for update
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

-- Storage bucket note: create 'ip-evidence' bucket (private, 100MB per file) in Supabase dashboard
