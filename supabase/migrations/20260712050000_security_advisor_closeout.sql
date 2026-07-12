-- Close the remaining Supabase security-advisor findings (2026-07-12 run).
--
-- PROD-ONLY migration: the corpus staging project (xjlhtwsbfpsxwsnkkkzz) has
-- none of these functions/tables — do not apply it there.
--
-- 1. function_search_path_mutable (9 fns): pin search_path='' and
--    schema-qualify bodies. CREATE OR REPLACE keeps triggers/policies bound.
-- 2. platform_creator_overview: EXECUTE revoked from authenticated — the
--    /api/master/overview route now calls it with the service role after its
--    own platform_admins check (the function keeps its internal guard too).
-- 3. analytics_events / scope_items: RLS-no-policy is INTENTIONAL (service-role
--    only); documented via table comments.
-- 4. early_access: the always-true anon INSERT policy has no code path using it
--    (every "Get early access" CTA routes to /signup) — dropped.

-- ── 1. search_path pinning ────────────────────────────────────────────────────

create or replace function public.get_user_org_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select organisation_id from public.profiles where id = auth.uid()
$$;

create or replace function public.get_user_role()
returns public.user_role
language sql
stable
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.same_org(record_org_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select record_org_id = public.get_user_org_id()
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.update_claims_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.fn_approval_to_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sow_id uuid;
begin
  if new.contract_id is not null then
    if tg_op = 'INSERT' then
      insert into public.evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) values (
        new.organisation_id, new.contract_id, 'final_check_started',
        'Final Contract Check started: ' || new.title,
        new.submitted_by, new.id, 'approval_requests'
      );
    elsif new.status = 'approved' and old.status <> 'approved' then
      insert into public.evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) values (
        new.organisation_id, new.contract_id, 'contract_approval_granted',
        'Contract approval granted: ' || new.title,
        new.assigned_to, new.id, 'approval_requests'
      );
    elsif new.status = 'revision_requested' and old.status <> 'revision_requested' then
      insert into public.evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) values (
        new.organisation_id, new.contract_id, 'revision_requested',
        'Contract revision requested: ' || new.title,
        new.assigned_to, new.id, 'approval_requests'
      );
    end if;
    return new;
  end if;

  v_sow_id := coalesce(new.sow_id, (
    select sow_id from public.sow_deliverables where id = new.deliverable_id limit 1
  ));
  if v_sow_id is null then return new; end if;

  if tg_op = 'INSERT' then
    insert into public.evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    values (
      new.organisation_id, v_sow_id,
      case when new.deliverable_id is not null then 'deliverable_submitted' else 'sow_created' end,
      'Approval submitted: ' || new.title, new.submitted_by, new.id, 'approval_requests'
    );
  elsif new.status = 'approved' and old.status <> 'approved' then
    insert into public.evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    values (new.organisation_id, v_sow_id, 'approval_granted', 'Approval granted: ' || new.title, new.assigned_to, new.id, 'approval_requests');
  elsif new.status = 'revision_requested' and old.status <> 'revision_requested' then
    insert into public.evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    values (new.organisation_id, v_sow_id, 'revision_requested', 'Revision requested: ' || new.title, new.assigned_to, new.id, 'approval_requests');
  end if;
  return new;
end;
$$;

create or replace function public.fn_invoice_paid_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status <> 'paid' and new.sow_id is not null then
    insert into public.evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    values (new.organisation_id, new.sow_id, 'payment_made', 'Payment received for invoice ' || new.invoice_number, new.created_by, new.id, 'invoices');
  end if;
  return new;
end;
$$;

create or replace function public.fn_delivery_lock_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.contract_id is not null then
    if tg_op = 'UPDATE' and new.lock_status = 'complete' and old.lock_status <> 'complete' then
      insert into public.evidence_timeline (
        organisation_id, contract_id, event_type, title, actor_id, reference_id, reference_table
      ) values (
        new.organisation_id, new.contract_id, 'final_check_completed',
        'Final Contract Check cleared', new.locked_by, new.id, 'delivery_locks'
      );
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.evidence_timeline (organisation_id, sow_id, event_type, title, actor_id, reference_id, reference_table)
    values (new.organisation_id, new.sow_id, 'delivery_locked', 'Delivery locked for SOW', new.locked_by, new.id, 'delivery_locks');
  end if;
  return new;
end;
$$;

-- ── 2. platform_creator_overview: service-role only ──────────────────────────
-- The old body self-gated on auth.uid() ∈ platform_admins, which returns zero
-- rows under the service role (auth.uid() is null there). The API route
-- (/api/master/overview) is now the gate: it checks platform_admins with the
-- caller's session, then invokes this with the service role. EXECUTE revoked
-- from every client-facing role, so the internal guard is redundant — removed.
create or replace function public.platform_creator_overview()
returns table(profile_id uuid, creator_name text, email text, organisation_name text, contract_count bigint, pending_count bigint, last_contract_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select
    p.id,
    p.name,
    p.email,
    o.name,
    count(c.id),
    count(c.id) filter (where c.status = 'pending_review'),
    max(c.created_at)
  from public.profiles p
  left join public.organisations o on o.id = p.organisation_id
  left join public.contracts c on c.uploaded_by = p.id
  where p.role = 'creator'
  group by p.id, p.name, p.email, o.name;
$$;

revoke execute on function public.platform_creator_overview() from public, anon, authenticated;

-- ── 3. document intentional service-role-only tables ─────────────────────────
comment on table public.analytics_events is
  'Service-role only (RLS on, zero policies — intentional). Writes come exclusively from /api/public/event with an allowlisted event set.';
comment on table public.scope_items is
  'Service-role only (RLS on, zero policies — intentional). Legacy scope-monitor data retained read-only; the feature flag is OFF and no client path touches it.';

-- ── 4. early_access: drop the dead always-true anon INSERT policy ────────────
drop policy if exists "Anon users can insert only" on public.early_access;
