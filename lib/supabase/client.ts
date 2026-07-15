import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { publicSupabaseEnv } from "@/lib/env";
import { toSessionCookie } from "./session-cookies";

export function createClient() {
  const env = publicSupabaseEnv();
  // Custom cookie handlers (mirroring @supabase/ssr's own document.cookie
  // defaults) so client-side token writes are ALSO session cookies. The library
  // hard-codes a 400-day maxAge with no override hook, so this is the only way
  // to make browser-close = logout airtight. See ./session-cookies.
  return createBrowserClient(
    env.url,
    env.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      cookies: {
        getAll() {
          const parsed = parse(document.cookie);
          return Object.keys(parsed).map((name) => ({ name, value: parsed[name] ?? "" }));
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            document.cookie = serialize(name, value, toSessionCookie(value, options));
          }
        },
      },
    }
  );
}
