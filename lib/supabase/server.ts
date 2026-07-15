import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicSupabaseEnv, serviceSupabaseEnv } from "@/lib/env";
import { toSessionCookie } from "./session-cookies";

export async function createClient() {
  const cookieStore = await cookies();
  const env = publicSupabaseEnv();

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, toSessionCookie(value, options))
            );
          } catch {
            // Ignore: setAll called from Server Component (read-only)
          }
        },
      },
    }
  );
}

export async function createServiceClient() {
  const env = serviceSupabaseEnv();
  return createSupabaseClient(
    env.url,
    env.serviceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
