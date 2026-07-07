-- Store marketing/newsletter consent captured at signup (DPDPA: consent-based).
-- The signup form passes marketing_opt_in in user metadata; the trigger copies it.

alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email, onboarding_done, marketing_opt_in)
  values (
    new.id,
    'agency_admin',
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    false,
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
