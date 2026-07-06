-- Phase 0.4 security sweep: INSERT policies on profiles/user_profiles were
-- WITH CHECK (true), letting any client insert arbitrary rows. Profile rows
-- are created by the handle_new_user trigger (SECURITY DEFINER) and the
-- service-role client, both of which bypass RLS — so client INSERT only
-- needs to cover a user inserting their own row.

drop policy if exists "profile_insert" on public.profiles;
create policy "profile_insert" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile" on public.user_profiles
  for insert with check (user_id = auth.uid());
