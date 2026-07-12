-- Move pgvector + pg_trgm out of the public schema into `extensions`.
-- Already applied out-of-band to PROD via the Supabase API; this file reconciles
-- repo/staging with prod so the three stop drifting.
--
-- Idempotent: each ALTER only fires if the extension is currently in `public`.
-- Supabase roles already carry `extensions` in their search_path, so retrieval
-- and index DDL (which never hardcode a schema) keep working after the move.

create schema if not exists extensions;

do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'vector' and n.nspname = 'public'
  ) then
    alter extension vector set schema extensions;
  end if;

  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm' and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;
