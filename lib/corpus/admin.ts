// Platform-admin gate for the corpus admin surface. Returns the user when the
// caller is in platform_admins, else null. Callers return 404 (not 403) so the
// admin surface is invisible to non-admins.
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("platform_admins").select("user_id").eq("user_id", user.id).single();
  return data ? user : null;
}
