-- ============================================================
-- GREENLIT — Initial Schema
-- Run this in Supabase SQL editor or via `supabase db push`
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('agency_admin', 'creator', 'manager', 'brand');
create type plan_tier as enum ('starter', 'growth', 'enterprise');
create type contract_status as enum ('pending_review', 'reviewed', 'signed', 'expired');
create type campaign_status as enum ('draft', 'active', 'delivered', 'disputed', 'closed');
create type approval_type as enum ('script', 'caption', 'video', 'claim', 'deliverable', 'change_request');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type scope_item_status as enum ('in_scope', 'out_of_scope', 'disputed');
create type evidence_type as enum ('contract', 'approval', 'email', 'whatsapp', 'voice_note', 'screenshot');
create type exclusivity_status as enum ('active', 'expired', 'disputed');
create type content_type as enum ('script', 'caption', 'video', 'reel', 'ad');
create type scan_verdict as enum ('greenlit', 'caution', 'blocked');
create type notice_urgency as enum ('low', 'medium', 'high', 'critical');

-- ============================================================
-- ORGANISATIONS
-- ============================================================

create table organisations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  plan        plan_tier not null default 'starter',
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table organisations enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  organisation_id   uuid references organisations(id) on delete set null,
  role              user_role not null,
  name              text not null,
  email             text not null,
  avatar_url        text,
  onboarding_done   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table profiles enable row level security;

-- Helper function: get the current user's organisation_id
create or replace function get_user_org_id()
returns uuid
language sql stable
as $$
  select organisation_id from profiles where id = auth.uid()
$$;

-- Helper function: get the current user's role
create or replace function get_user_role()
returns user_role
language sql stable
as $$
  select role from profiles where id = auth.uid()
$$;

-- Helper function: is user in same org as a given record
create or replace function same_org(record_org_id uuid)
returns boolean
language sql stable
as $$
  select record_org_id = get_user_org_id()
$$;

-- ============================================================
-- CONTRACTS
-- ============================================================

create table contracts (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  title           text not null,
  file_url        text,
  uploaded_by     uuid not null references profiles(id),
  status          contract_status not null default 'pending_review',
  risk_score      integer check (risk_score between 0 and 100),
  analysis_json   jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table contracts enable row level security;

-- ============================================================
-- CAMPAIGNS
-- ============================================================

create table campaigns (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  title           text not null,
  brand_name      text not null,
  creator_id      uuid references profiles(id),
  manager_id      uuid references profiles(id),
  status          campaign_status not null default 'draft',
  risk_score      integer check (risk_score between 0 and 100),
  contract_id     uuid references contracts(id),
  start_date      date,
  end_date        date,
  budget_inr      numeric(12,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table campaigns enable row level security;

-- ============================================================
-- CREATORS (extended profile for creator role)
-- ============================================================

create table creators (
  id                  uuid primary key default uuid_generate_v4(),
  organisation_id     uuid not null references organisations(id) on delete cascade,
  profile_id          uuid not null unique references profiles(id) on delete cascade,
  rate_card_json      jsonb,
  exclusivity_log_json jsonb,
  risk_score          integer check (risk_score between 0 and 100),
  brand_safety_rating integer check (brand_safety_rating between 0 and 100),
  active_deals_count  integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table creators enable row level security;

-- ============================================================
-- SOWS
-- ============================================================

create table sows (
  id                  uuid primary key default uuid_generate_v4(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  organisation_id     uuid not null references organisations(id) on delete cascade,
  deliverables_json   jsonb not null default '[]',
  signed_at           timestamptz,
  signed_by           uuid references profiles(id),
  created_by          uuid not null references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table sows enable row level security;

-- ============================================================
-- SCOPE ITEMS
-- ============================================================

create table scope_items (
  id                uuid primary key default uuid_generate_v4(),
  sow_id            uuid not null references sows(id) on delete cascade,
  description       text not null,
  status            scope_item_status not null default 'in_scope',
  flagged_at        timestamptz,
  flagged_by        uuid references profiles(id),
  change_request_id uuid,
  created_at        timestamptz not null default now()
);

alter table scope_items enable row level security;

-- ============================================================
-- APPROVALS
-- ============================================================

create table approvals (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  campaign_id     uuid references campaigns(id),
  type            approval_type not null,
  status          approval_status not null default 'pending',
  title           text not null,
  content_url     text,
  notes           text,
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  evidence_url    text,
  requested_by    uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table approvals enable row level security;

-- ============================================================
-- EVIDENCE VAULT
-- ============================================================

create table evidence_vault (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  campaign_id     uuid references campaigns(id),
  type            evidence_type not null,
  file_url        text not null,
  file_hash       text,
  title           text,
  description     text,
  metadata_json   jsonb,
  uploaded_by     uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);

alter table evidence_vault enable row level security;

-- ============================================================
-- EXCLUSIVITY RECORDS
-- ============================================================

create table exclusivity_records (
  id          uuid primary key default uuid_generate_v4(),
  creator_id  uuid not null references creators(id) on delete cascade,
  brand_name  text not null,
  category    text not null,
  start_date  date not null,
  end_date    date not null,
  contract_id uuid references contracts(id),
  status      exclusivity_status not null default 'active',
  created_at  timestamptz not null default now()
);

alter table exclusivity_records enable row level security;

-- ============================================================
-- CONTENT SCANS
-- ============================================================

create table content_scans (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  campaign_id     uuid references campaigns(id),
  content_type    content_type not null,
  raw_content     text,
  content_url     text,
  scan_result_json jsonb,
  risk_score      integer check (risk_score between 0 and 100),
  verdict         scan_verdict,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);

alter table content_scans enable row level security;

-- ============================================================
-- LEGAL NOTICES
-- ============================================================

create table legal_notices (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  file_url        text,
  analysis_json   jsonb,
  urgency         notice_urgency,
  deadline        date,
  resolved        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table legal_notices enable row level security;

-- ============================================================
-- IP RECORDS
-- ============================================================

create table ip_records (
  id                      uuid primary key default uuid_generate_v4(),
  organisation_id         uuid not null references organisations(id) on delete cascade,
  asset_type              text not null,
  asset_url               text,
  registration_details_json jsonb,
  evidence_vault_id       uuid references evidence_vault(id),
  created_at              timestamptz not null default now()
);

alter table ip_records enable row level security;

-- ============================================================
-- INVITATIONS (for inviting non-admin users)
-- ============================================================

create table invitations (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  email           text not null,
  role            user_role not null,
  token           text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by      uuid not null references profiles(id),
  accepted_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  created_at      timestamptz not null default now()
);

alter table invitations enable row level security;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organisations_updated_at before update on organisations
  for each row execute procedure handle_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute procedure handle_updated_at();
create trigger contracts_updated_at before update on contracts
  for each row execute procedure handle_updated_at();
create trigger campaigns_updated_at before update on campaigns
  for each row execute procedure handle_updated_at();
create trigger sows_updated_at before update on sows
  for each row execute procedure handle_updated_at();
create trigger approvals_updated_at before update on approvals
  for each row execute procedure handle_updated_at();
create trigger legal_notices_updated_at before update on legal_notices
  for each row execute procedure handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- organisations: members can see their own org; agency_admin can update
create policy "org_select" on organisations for select
  using (id = get_user_org_id());
create policy "org_update" on organisations for update
  using (id = get_user_org_id() and get_user_role() = 'agency_admin');

-- profiles: users see only same-org profiles
create policy "profile_select" on profiles for select
  using (organisation_id = get_user_org_id() or id = auth.uid());
create policy "profile_insert" on profiles for insert
  with check (id = auth.uid());
create policy "profile_update" on profiles for update
  using (id = auth.uid() or
         (organisation_id = get_user_org_id() and get_user_role() = 'agency_admin'));

-- Standard same-org policy factory for all data tables
-- contracts
create policy "contracts_select" on contracts for select using (same_org(organisation_id));
create policy "contracts_insert" on contracts for insert
  with check (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "contracts_update" on contracts for update
  using (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "contracts_delete" on contracts for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- campaigns
create policy "campaigns_select" on campaigns for select
  using (same_org(organisation_id) and (
    get_user_role() in ('agency_admin', 'manager') or
    creator_id = auth.uid()
  ));
create policy "campaigns_insert" on campaigns for insert
  with check (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "campaigns_update" on campaigns for update
  using (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "campaigns_delete" on campaigns for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- creators
create policy "creators_select" on creators for select
  using (same_org(organisation_id) and (
    get_user_role() in ('agency_admin', 'manager') or profile_id = auth.uid()
  ));
create policy "creators_insert" on creators for insert
  with check (same_org(organisation_id));
create policy "creators_update" on creators for update
  using (same_org(organisation_id) and (
    get_user_role() in ('agency_admin', 'manager') or profile_id = auth.uid()
  ));
create policy "creators_delete" on creators for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- sows
create policy "sows_select" on sows for select using (same_org(organisation_id));
create policy "sows_insert" on sows for insert
  with check (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "sows_update" on sows for update
  using (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "sows_delete" on sows for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- approvals — brand role gets select
create policy "approvals_select" on approvals for select using (same_org(organisation_id));
create policy "approvals_insert" on approvals for insert
  with check (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "approvals_update" on approvals for update
  using (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager', 'brand'));
create policy "approvals_delete" on approvals for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- evidence vault
create policy "vault_select" on evidence_vault for select using (same_org(organisation_id));
create policy "vault_insert" on evidence_vault for insert
  with check (same_org(organisation_id));
create policy "vault_delete" on evidence_vault for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- exclusivity_records — join through creators
create policy "exclusivity_select" on exclusivity_records for select
  using (
    exists (
      select 1 from creators c
      where c.id = exclusivity_records.creator_id
        and same_org(c.organisation_id)
        and (get_user_role() in ('agency_admin', 'manager') or c.profile_id = auth.uid())
    )
  );
create policy "exclusivity_insert" on exclusivity_records for insert
  with check (
    exists (
      select 1 from creators c
      where c.id = exclusivity_records.creator_id and same_org(c.organisation_id)
    )
  );
create policy "exclusivity_update" on exclusivity_records for update
  using (
    exists (
      select 1 from creators c
      where c.id = exclusivity_records.creator_id and same_org(c.organisation_id)
        and get_user_role() in ('agency_admin', 'manager')
    )
  );

-- content scans
create policy "scans_select" on content_scans for select using (same_org(organisation_id));
create policy "scans_insert" on content_scans for insert
  with check (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager', 'creator'));
create policy "scans_delete" on content_scans for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- legal notices
create policy "notices_select" on legal_notices for select
  using (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "notices_insert" on legal_notices for insert
  with check (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "notices_update" on legal_notices for update
  using (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager'));
create policy "notices_delete" on legal_notices for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- ip records
create policy "ip_select" on ip_records for select
  using (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager', 'creator'));
create policy "ip_insert" on ip_records for insert
  with check (same_org(organisation_id) and get_user_role() in ('agency_admin', 'manager', 'creator'));
create policy "ip_delete" on ip_records for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- invitations
create policy "inv_select" on invitations for select
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');
create policy "inv_insert" on invitations for insert
  with check (same_org(organisation_id) and get_user_role() = 'agency_admin');
create policy "inv_delete" on invitations for delete
  using (same_org(organisation_id) and get_user_role() = 'agency_admin');

-- ============================================================
-- STORAGE BUCKETS (run separately in Supabase dashboard or CLI)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('contracts', 'contracts', false);
-- insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false);
-- insert into storage.buckets (id, name, public) values ('content', 'content', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
