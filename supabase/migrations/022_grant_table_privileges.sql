-- Every table in the public schema was missing SELECT/INSERT/UPDATE/DELETE
-- for all roles. Migrations applied via MCP/CLI do not get Supabase's
-- auto-grant treatment (which only fires via the dashboard SQL editor).
-- This migration restores the standard Supabase privilege pattern:
--   service_role  → full access (still subject to SECURITY DEFINER functions)
--   authenticated → full CRUD  (RLS policies are the real access gate)
--   anon          → SELECT only on public-readable tables

-- service_role: full access to all tables (bypasses RLS, used by server routes)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- authenticated: full CRUD on all tables (RLS policies enforce row-level rules)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- anon: read-only on the two tables that genuinely need public access
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT ON public.organisations TO anon;

-- Ensure future tables created in this schema also get the grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
