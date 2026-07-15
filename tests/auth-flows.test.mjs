import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("signup creates a Supabase user and sends confirmation to the app callback", () => {
  const source = read("app/(auth)/signup/page.tsx");
  assert.match(source, /supabase\.auth\.signUp\(/);
  assert.match(source, /data:\s*\{\s*name,\s*marketing_opt_in: false\s*\}/);
  assert.match(source, /emailRedirectTo:\s*`\$\{window\.location\.origin\}\/auth\/callback`/);
  assert.match(source, /captchaToken/);
  assert.match(source, /supabase\.auth\.resend\(/);
});

test("provider UI hides Apple until explicitly enabled", () => {
  const source = read("components/auth/social-auth.tsx");
  assert.match(source, /NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "false"/);
  assert.match(source, /NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true"/);
});

test("marketing consent is optional, off by default, and captured after verification", () => {
  const onboarding = read("app/onboarding/page.tsx");
  const route = read("app/api/org/create/route.ts");
  const migration = read("supabase/migrations/20260715000000_marketing_consent_default.sql");
  assert.match(onboarding, /useState\(false\)/);
  assert.match(onboarding, /Optional: send me product updates/);
  assert.match(route, /marketing_opt_in: marketing_opt_in === true/);
  assert.match(migration, /alter column marketing_opt_in set default false/);
});

test("login uses password auth and routes only after a returned user", () => {
  const source = read("app/(auth)/login/page.tsx");
  assert.match(source, /supabase\.auth\.signInWithPassword\(\{/);
  assert.match(source, /options: \{ captchaToken \}/);
  assert.match(source, /if \(!data\.user\)/);
  assert.match(source, /platform_admins/);
  assert.match(source, /onboarding_done/);
  assert.match(source, /router\.replace\(destinations\[profile\.role\]/);
});

test("logout invalidates Supabase auth before navigating to login", () => {
  const sidebar = read("components/dashboard/sidebar.tsx");
  const master = read("components/master/master-portal.tsx");
  for (const source of [sidebar, master]) {
    assert.match(source, /await (?:supabase|createClient\(\))\.auth\.signOut\(\)/);
  }
  assert.match(sidebar, /router\.push\("\/login"\)/);
});

test("browser sessions refresh tokens while server service clients do not persist them", () => {
  const browser = read("lib/supabase/client.ts");
  const middleware = read("lib/supabase/middleware.ts");
  const server = read("lib/supabase/server.ts");
  assert.match(browser, /persistSession:\s*true/);
  assert.match(browser, /autoRefreshToken:\s*true/);
  assert.match(middleware, /auth\.getSession\(\)/);
  assert.match(middleware, /auth\.getUser\(\)/);
  assert.match(server, /persistSession:\s*false,\s*autoRefreshToken:\s*false/);
});

test("forgot-password requests a recovery email without revealing account existence", () => {
  const source = read("app/(auth)/forgot-password/page.tsx");
  assert.match(source, /resetPasswordForEmail\(email/);
  assert.match(source, /redirectTo:\s*`\$\{window\.location\.origin\}\/auth\/callback`/);
  assert.match(source, /captchaToken/);
  assert.match(source, /If an account exists/);
});

test("recovery links verify the OTP and route to the password form", () => {
  const source = read("app/auth/confirm/[type]/[token]/route.ts");
  assert.match(source, /TYPES = new Set\(\[.*"recovery"/);
  assert.match(source, /verifyOtp\(\{ type: type as EmailOtpType, token_hash: token \}\)/);
  assert.match(source, /if \(type === "recovery"\)/);
  assert.match(source, /\/reset-password/);
});

test("reset-password requires a recovery session, updates the user, then signs out", () => {
  const source = read("app/(auth)/reset-password/page.tsx");
  assert.match(source, /supabase\.auth\.getSession\(\)/);
  assert.match(source, /if \(!data\.session\)/);
  assert.match(source, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(source, /await supabase\.auth\.signOut\(\)/);
  assert.match(source, /router\.push\("\/login\?reset=1"\)/);
});

test("protected dashboard pages verify the user server-side", () => {
  const source = read("app/(dashboard)/layout.tsx");
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /if \(!user\) redirect\("\/login"\)/);
});
