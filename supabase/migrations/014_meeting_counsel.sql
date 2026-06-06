-- Session 15: Meeting Counsel + Voice-to-Term Sheet

create type term_sheet_status as enum ('draft','shared','accepted','rejected');

create table meeting_transcripts (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  title            text not null,
  transcript_text  text not null,
  jurisdiction     varchar(2) not null default 'IN',
  participants     text[],
  meeting_date     date,
  analysis_json    jsonb,
  term_sheet_json  jsonb,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

alter table meeting_transcripts enable row level security;

create policy "meeting_transcripts_select" on meeting_transcripts for select
  using (organisation_id = get_user_org_id());

create policy "meeting_transcripts_insert" on meeting_transcripts for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());

create table term_sheets (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  transcript_id    uuid references meeting_transcripts(id),
  sow_id           uuid references sows(id),
  title            text not null,
  jurisdiction     varchar(2) not null default 'IN',
  terms_json       jsonb not null default '{}',
  status           term_sheet_status not null default 'draft',
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table term_sheets enable row level security;

create policy "term_sheets_select" on term_sheets for select
  using (organisation_id = get_user_org_id());

create policy "term_sheets_insert" on term_sheets for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());

create policy "term_sheets_update" on term_sheets for update
  using (organisation_id = get_user_org_id());

create policy "term_sheets_delete" on term_sheets for delete
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create trigger term_sheets_updated_at before update on term_sheets
  for each row execute procedure set_updated_at();
