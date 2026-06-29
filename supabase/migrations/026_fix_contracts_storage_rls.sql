-- 026_fix_contracts_storage_rls.sql
--
-- ROOT CAUSE (Cause A): storage path / policy scoping mismatch.
--
-- The `contracts` storage bucket (migration 023) scopes objects by auth.uid():
--   split_part(name, '/', 1) = auth.uid()::text
-- i.e. the first path segment must be the *uploading user's* id.
--
-- But the `contracts` TABLE is ORG-scoped (same_org(organisation_id)) — every
-- member of an organisation can SELECT a contract row (contracts_select), and
-- admins/managers can INSERT/UPDATE/DELETE. The storage objects must follow the
-- same org model, exactly like the evidence buckets in migration 025
-- (claim-evidence / ip-evidence / proof-vault all key by `<organisation_id>/...`).
--
-- Two concrete failures the uid scoping caused:
--   1. Upload: the app's "service" client routes STORAGE requests through the
--      caller's JWT (supabase-js sends the user access token for storage, even
--      when constructed with the service-role key). When the upload path was
--      prefixed with organisation_id, split_part(...)='<org_id>' never equalled
--      auth.uid() -> "new row violates row-level security policy".
--   2. Sharing: an object written under one member's uid could not be read or
--      deleted by an org colleague (uid mismatch), contradicting the org-scoped
--      contracts_select policy on the table.
--
-- FIX: re-scope the contracts bucket by organisation_id (matching the table and
-- migration 025). The upload route is updated in the same change to key objects
-- as `<organisation_id>/<timestamp>-<filename>` so path and policy agree.
--
-- NOTE: storage RLS resolves the caller's org from public.profiles, so any
-- member of the org (not just the uploader) can read/write/delete the org's
-- contract objects — consistent with same_org on the contracts table.

-- ── Drop the old uid-scoped policies (created in 023 + the UPDATE policy added
--    later as 20260613104401_fix_contracts_rls_update_policy) ──────────────────
DROP POLICY IF EXISTS "Users can upload their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own contracts"   ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON storage.objects;

-- ── Recreate as org-scoped policies (first path segment = caller's org) ───────
CREATE POLICY "contracts org read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts' AND
  split_part(name, '/', 1) = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "contracts org write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts' AND
  split_part(name, '/', 1) = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "contracts org update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  split_part(name, '/', 1) = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'contracts' AND
  split_part(name, '/', 1) = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "contracts org delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  split_part(name, '/', 1) = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);
