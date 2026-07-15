-- Marketing consent must be explicit. Existing user choices are preserved.
alter table public.profiles
  alter column marketing_opt_in set default false;

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
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
