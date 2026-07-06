import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicSupabaseEnv, StartupConfigError } from "@/lib/env";

// Middleware is intentionally lightweight — only refreshes the session cookie
// and handles the unauthenticated → /login redirect.
// Role-based routing and profile lookups live in server layouts, not here,
// to stay well within Edge Runtime CPU limits.

const PUBLIC_ROUTES = ["/api/health", "/api/ready", "/login", "/signup", "/auth/callback", "/invite", "/pricing"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  const pathname = request.nextUrl.pathname;
  let status = 200;
  let userId: string | null = null;

  function finish(response: NextResponse) {
    status = response.status;
    response.headers.set("x-request-id", requestId);
    response.headers.set("x-content-type-options", "nosniff");
    response.headers.set("x-frame-options", "DENY");
    response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
    response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("content-security-policy", "default-src 'self'; connect-src 'self' https://*.supabase.co https://api.razorpay.com; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; frame-src https://api.razorpay.com https://checkout.razorpay.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    console.info("greenlit_request", {
      request_id: requestId,
      user_id: userId,
      endpoint: pathname,
      status,
      duration_ms: Date.now() - startedAt,
    });
    return response;
  }

  let env: ReturnType<typeof publicSupabaseEnv>;
  try {
    env = publicSupabaseEnv();
  } catch (error) {
    if (error instanceof StartupConfigError) {
      return finish(NextResponse.json({ error: "Service is not configured", code: "CONFIGURATION_ERROR" }, { status: 503 }));
    }
    throw error;
  }

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session cookie on every matched request.
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  userId = user?.id ?? null;

  const isPublicRoute = pathname === "/" || PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Unauthenticated user hitting a protected route → send to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return finish(NextResponse.redirect(url));
  }

  // Authenticated user hitting login/signup → send to agency dashboard
  // (full role-based routing is handled inside the dashboard layout)
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/agency";
    return finish(NextResponse.redirect(url));
  }

  return finish(supabaseResponse);
}
