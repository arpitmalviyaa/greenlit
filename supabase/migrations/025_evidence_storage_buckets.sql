-- 025_evidence_storage_buckets.sql
-- Provision the private storage buckets that earlier migrations only described in
-- comments but never created. Without these rows the corresponding upload routes
-- (claims evidence, IP evidence, approval proof vault) fail at runtime.
--
-- DO NOT auto-apply in CI without review. Create only; apply manually.
--
-- All three buckets are PRIVATE. Server-side uploads use the service role, which
-- bypasses RLS. The authenticated-role policies below scope object access to the
-- caller's organisation: uploaded object keys are `<organisation_id>/...`, so the
-- first path segment is matched against the org the user actually belongs to.
-- (The `contracts` bucket in migration 023 keys by auth.uid() and keeps its own
-- split_part(name,'/',1) = auth.uid() policy; these evidence buckets key by org.)

-- ── Buckets ──────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('claim-evidence', 'claim-evidence', false),
  ('ip-evidence',    'ip-evidence',    false),
  ('proof-vault',    'proof-vault',    false)
ON CONFLICT (id) DO NOTHING;

-- ── Helper predicate ─────────────────────────────────────────────────────────
-- An authenticated user may touch an object when the object's first folder
-- segment equals the organisation_id on their own profile row.
--   (storage.foldername(name))[1] = the caller's organisation_id

-- claim-evidence -----------------------------------------------------------------
DROP POLICY IF EXISTS "claim-evidence org read" ON storage.objects;
CREATE POLICY "claim-evidence org read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-evidence' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "claim-evidence org write" ON storage.objects;
CREATE POLICY "claim-evidence org write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-evidence' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "claim-evidence org delete" ON storage.objects;
CREATE POLICY "claim-evidence org delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-evidence' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- ip-evidence --------------------------------------------------------------------
DROP POLICY IF EXISTS "ip-evidence org read" ON storage.objects;
CREATE POLICY "ip-evidence org read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ip-evidence' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "ip-evidence org write" ON storage.objects;
CREATE POLICY "ip-evidence org write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ip-evidence' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "ip-evidence org delete" ON storage.objects;
CREATE POLICY "ip-evidence org delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ip-evidence' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- proof-vault --------------------------------------------------------------------
DROP POLICY IF EXISTS "proof-vault org read" ON storage.objects;
CREATE POLICY "proof-vault org read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proof-vault' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "proof-vault org write" ON storage.objects;
CREATE POLICY "proof-vault org write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proof-vault' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "proof-vault org delete" ON storage.objects;
CREATE POLICY "proof-vault org delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'proof-vault' AND
  (storage.foldername(name))[1] = (
    SELECT organisation_id::text FROM public.profiles WHERE id = auth.uid()
  )
);
