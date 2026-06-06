-- Session 14: Send Scanner

create type recipient_type as enum ('brand','creator','lawyer','public','regulator','other');
create type send_channel as enum ('email','whatsapp','sms','social','legal_filing','other');
create type overall_risk as enum ('high','medium','low','safe');
create type send_recommendation as enum ('send','review','do_not_send');
create type rewrite_goal as enum ('safer','firmer','friendlier','formal');

create table send_scans (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  content          text not null,
  recipient_type   recipient_type not null,
  channel          send_channel not null,
  jurisdiction     varchar(2) not null default 'IN',
  scan_result_json jsonb,
  rewrite_json     jsonb,
  counsel_json     jsonb,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);

alter table send_scans enable row level security;

create policy "send_scans_select" on send_scans for select
  using (organisation_id = get_user_org_id());

create policy "send_scans_insert" on send_scans for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());
