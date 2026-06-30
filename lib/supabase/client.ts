import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/env";

export function createClient() {
  const env = publicSupabaseEnv();
  return createBrowserClient(
    env.url,
    env.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}
