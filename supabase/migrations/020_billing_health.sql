-- Session 21: Billing + Plan Management + Agency Health Dashboard

create type plan_name as enum ('free','pro','agency','enterprise');
create type subscription_status as enum ('active','past_due','cancelled','trialing');
create type billing_event_type as enum (
  'subscription_created','payment_success','payment_failed',
  'subscription_cancelled','plan_upgraded','plan_downgraded','jurisdiction_added'
);

create table subscription_plans (
  id                 uuid primary key default uuid_generate_v4(),
  name               plan_name not null unique,
  price_inr          numeric(10,2) not null,
  price_usd          numeric(10,2) not null,
  features_json      jsonb not null default '{}',
  jurisdiction_limit integer not null default 1,
  created_at         timestamptz not null default now()
);

-- Seed plans
insert into subscription_plans (name, price_inr, price_usd, features_json, jurisdiction_limit) values
('free', 0, 0, '{"modules":["content_scan","counsel_upload"]}', 1),
('pro', 399, 5, '{"modules":["content_scan","counsel_upload","all_counsel_tools","send_scanner","nda_scanner"]}', 2),
('agency', 999, 12, '{"modules":["content_scan","counsel_upload","all_counsel_tools","send_scanner","nda_scanner","sow","scope","delivery","approvals","deals","whitelisting","rights","passport","playbook"]}', 4),
('enterprise', 3499, 42, '{"modules":["all"]}', 7);

create table organisation_subscriptions (
  id                          uuid primary key default uuid_generate_v4(),
  organisation_id             uuid not null unique references organisations(id) on delete cascade,
  plan_id                     uuid not null references subscription_plans(id),
  razorpay_subscription_id    text,
  razorpay_customer_id        text,
  status                      subscription_status not null default 'trialing',
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table organisation_subscriptions enable row level security;

create policy "org_subscriptions_select" on organisation_subscriptions for select
  using (organisation_id = get_user_org_id());

create policy "org_subscriptions_insert" on organisation_subscriptions for insert
  with check (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create policy "org_subscriptions_update" on organisation_subscriptions for update
  using (organisation_id = get_user_org_id() and exists (
    select 1 from profiles where id = auth.uid() and role = 'agency_admin'
  ));

create trigger org_subscriptions_updated_at before update on organisation_subscriptions
  for each row execute procedure set_updated_at();

create table billing_events (
  id                  uuid primary key default uuid_generate_v4(),
  organisation_id     uuid not null references organisations(id) on delete cascade,
  event_type          billing_event_type not null,
  amount              numeric(10,2),
  currency            varchar(3) not null default 'INR',
  razorpay_event_id   text,
  metadata_json       jsonb,
  created_at          timestamptz not null default now()
);

alter table billing_events enable row level security;

create policy "billing_events_select" on billing_events for select
  using (organisation_id = get_user_org_id());

-- No INSERT policy for billing_events — server-side only
