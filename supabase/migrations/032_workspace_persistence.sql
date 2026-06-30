alter table contracts add column if not exists archived_at timestamptz;
alter table contracts add column if not exists archived_by uuid references profiles(id);

create table if not exists negotiation_memory (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  deal_room_id uuid references deal_rooms(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  profile_id uuid references profiles(id),
  memory_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists creator_clause_preferences (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  creator_id uuid references creators(id) on delete cascade,
  profile_id uuid references profiles(id),
  clause_type text not null,
  preference text not null,
  fallback_text text,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists workspace_assignments (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  deal_room_id uuid references deal_rooms(id) on delete cascade,
  assigned_to uuid not null references profiles(id),
  assigned_by uuid references profiles(id),
  assignment_type text not null default 'review',
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists review_metrics (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  reviewer_id uuid references profiles(id),
  metric_date date not null default current_date,
  reviews_completed integer not null default 0,
  comments_created integer not null default 0,
  revisions_created integer not null default 0,
  exports_created integer not null default 0,
  risk_score_delta integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organisation_id, contract_id, reviewer_id, metric_date)
);

create index if not exists idx_negotiation_memory_context
  on negotiation_memory (organisation_id, contract_id, deal_room_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_creator_clause_preferences_profile
  on creator_clause_preferences (organisation_id, profile_id, clause_type)
  where deleted_at is null;

create index if not exists idx_workspace_assignments_assignee
  on workspace_assignments (organisation_id, assigned_to, status, due_at)
  where deleted_at is null;

create index if not exists idx_review_metrics_org_date
  on review_metrics (organisation_id, metric_date desc);

alter table negotiation_memory enable row level security;
alter table creator_clause_preferences enable row level security;
alter table workspace_assignments enable row level security;
alter table review_metrics enable row level security;

create policy "negotiation_memory_same_org" on negotiation_memory for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "creator_clause_preferences_same_org" on creator_clause_preferences for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "workspace_assignments_same_org" on workspace_assignments for all using (same_org(organisation_id)) with check (same_org(organisation_id));
create policy "review_metrics_same_org" on review_metrics for all using (same_org(organisation_id)) with check (same_org(organisation_id));
