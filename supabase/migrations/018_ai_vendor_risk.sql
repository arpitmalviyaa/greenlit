-- Session 19: AI Workflow Risk Scanner + Vendor Shield

create table ai_workflow_scans (
  id                   uuid primary key default uuid_generate_v4(),
  organisation_id      uuid not null references organisations(id) on delete cascade,
  workflow_description text not null,
  ai_tools_used        text[] not null default '{}',
  jurisdiction         varchar(2) not null default 'IN',
  risk_report_json     jsonb,
  created_by           uuid not null references profiles(id),
  created_at           timestamptz not null default now()
);

alter table ai_workflow_scans enable row level security;

create policy "ai_workflow_scans_select" on ai_workflow_scans for select
  using (organisation_id = get_user_org_id());

create policy "ai_workflow_scans_insert" on ai_workflow_scans for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());

create table vendor_contracts (
  id                   uuid primary key default uuid_generate_v4(),
  organisation_id      uuid not null references organisations(id) on delete cascade,
  vendor_name          text not null,
  contract_text        text not null,
  jurisdiction         varchar(2) not null default 'IN',
  shield_analysis_json jsonb,
  risk_score           integer check (risk_score >= 0 and risk_score <= 100),
  created_by           uuid not null references profiles(id),
  created_at           timestamptz not null default now()
);

alter table vendor_contracts enable row level security;

create policy "vendor_contracts_select" on vendor_contracts for select
  using (organisation_id = get_user_org_id());

create policy "vendor_contracts_insert" on vendor_contracts for insert
  with check (organisation_id = get_user_org_id() and created_by = auth.uid());
