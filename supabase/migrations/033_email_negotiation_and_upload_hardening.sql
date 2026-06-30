create extension if not exists "uuid-ossp";

create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  provider text not null check (provider in ('manual', 'gmail', 'outlook', 'imap', 'api')),
  provider_thread_id text not null,
  subject text not null,
  participants jsonb not null default '[]'::jsonb,
  contract_id uuid references contracts(id) on delete set null,
  deal_room_id uuid references deal_rooms(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'drafted', 'sent_elsewhere', 'closed')),
  last_message_at timestamptz not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, provider, provider_thread_id)
);

create table if not exists email_messages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  thread_id uuid not null references email_threads(id) on delete cascade,
  provider_message_id text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_address text not null,
  to_addresses jsonb not null default '[]'::jsonb,
  cc_addresses jsonb not null default '[]'::jsonb,
  sent_at timestamptz not null,
  subject text not null,
  body_text text not null,
  body_sha256 text not null,
  headers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (thread_id, provider_message_id)
);

create table if not exists email_draft_replies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  thread_id uuid not null references email_threads(id) on delete cascade,
  contract_id uuid references contracts(id) on delete set null,
  profile_id uuid references profiles(id),
  source_message_id uuid references email_messages(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'discarded', 'sent_elsewhere')),
  subject text not null,
  body text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_email_threads_contract
  on email_threads (organisation_id, contract_id, last_message_at desc)
  where deleted_at is null;

create index if not exists idx_email_messages_thread
  on email_messages (thread_id, sent_at desc)
  where deleted_at is null;

create index if not exists idx_email_draft_replies_thread
  on email_draft_replies (thread_id, status, created_at desc)
  where deleted_at is null;

alter table email_threads enable row level security;
alter table email_messages enable row level security;
alter table email_draft_replies enable row level security;

create policy "email_threads_same_org" on email_threads for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "email_messages_same_org" on email_messages for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "email_draft_replies_same_org" on email_draft_replies for all using (same_org(organisation_id)) with check (same_org(organisation_id));
