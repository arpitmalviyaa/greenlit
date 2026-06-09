-- Fix: handle_new_user trigger correctly creates profile row on auth signup.
-- The client-side INSERT in the signup page was failing because email confirmation
-- means there is no session at signup time (auth.uid() = null → RLS denies insert).
-- Profile creation must happen server-side in this trigger.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, email, onboarding_done)
  VALUES (
    NEW.id,
    'agency_admin',
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it points to the right function/table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
