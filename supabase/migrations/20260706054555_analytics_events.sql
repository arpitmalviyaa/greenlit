create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  path text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- service-role only: no client policies on purpose
