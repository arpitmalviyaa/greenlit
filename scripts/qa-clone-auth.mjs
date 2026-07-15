// Live clone Auth validation. Admin APIs create links/users only; all session
// behavior is exercised with the clone anon key and the running local app.
import { createClient } from "@supabase/supabase-js";

const EXPECTED_REF = "juhwnamjakmkvixxwrvv";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.GREENLIT_CLONE_APP_URL ?? "http://127.0.0.1:3100";
const actualRef = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/)?.[1];

if (actualRef !== EXPECTED_REF) {
  console.error(`HARD GATE FAILED: expected clone ${EXPECTED_REF}, received ${actualRef ?? "no project"}`);
  process.exit(42);
}
if (!anonKey || !serviceKey) {
  console.error("Clone anon and service-role credentials are required through environment variables.");
  process.exit(2);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const results = [];
const userIds = [];
const record = (flow, passed, actual) => results.push({ flow, passed, actual });

async function createConfirmedUser() {
  // Public recovery rejects reserved example domains; use Greenlit's own domain.
  // Delivery is deliberately not asserted by this clone test.
  const email = `qa-auth-${stamp}@getgreenlit.in`;
  const password = `Clone-${stamp}!Aa9`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`create auth user: ${error.message}`);
  userIds.push(data.user.id);
  return { email, password };
}

async function consume(type, token) {
  return fetch(`${appUrl}/auth/confirm/${type}/${token}`, { redirect: "manual" });
}

try {
  const credentials = await createConfirmedUser();
  const { data: login, error: loginError } = await client.auth.signInWithPassword(credentials);
  record("email/password login", !loginError && Boolean(login.session?.access_token), loginError?.message ?? "session created");

  const { data: refreshed, error: refreshError } = await client.auth.refreshSession({ refresh_token: login.session?.refresh_token });
  record("refresh/session persistence", !refreshError && Boolean(refreshed.session?.access_token), refreshError?.message ?? "session refreshed");

  const { error: logoutError } = await client.auth.signOut();
  const { data: afterLogout } = await client.auth.getSession();
  record("logout/session invalidation", !logoutError && afterLogout.session === null, logoutError?.message ?? "session cleared");

  const { error: recoveryRequestError } = await client.auth.resetPasswordForEmail(credentials.email, {
    redirectTo: `${appUrl}/auth/callback`,
  });
  record("password recovery request accepted", !recoveryRequestError, recoveryRequestError?.message ?? "accepted; delivery not asserted");

  const { data: recovery, error: recoveryError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: credentials.email,
  });
  if (recoveryError) throw new Error(`generate recovery link: ${recoveryError.message}`);
  const recoveryResponse = await consume("recovery", recovery.properties.hashed_token);
  record("recovery callback", recoveryResponse.status === 307 && recoveryResponse.headers.get("location")?.endsWith("/reset-password"), `${recoveryResponse.status} ${recoveryResponse.headers.get("location")}`);
  const reusedRecovery = await consume("recovery", recovery.properties.hashed_token);
  record("reused recovery token fails safely", reusedRecovery.status === 307 && reusedRecovery.headers.get("location")?.includes("confirm_link_expired"), `${reusedRecovery.status} ${reusedRecovery.headers.get("location")}`);

  const signupEmail = `greenlit.clone.signup.${stamp}@example.com`;
  const { data: signup, error: signupError } = await admin.auth.admin.generateLink({
    type: "signup",
    email: signupEmail,
    password: `Clone-Signup-${stamp}!Aa9`,
    options: { data: { name: "Clone Signup User" } },
  });
  if (signupError) throw new Error(`generate signup link: ${signupError.message}`);
  if (signup.user?.id) userIds.push(signup.user.id);
  const signupResponse = await consume("signup", signup.properties.hashed_token);
  record("signup confirmation route", signupResponse.status === 307 && !signupResponse.headers.get("location")?.includes("error="), `${signupResponse.status} ${signupResponse.headers.get("location")}`);

  const inviteEmail = `greenlit.clone.invite.${stamp}@example.com`;
  const { data: invite, error: inviteError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: inviteEmail,
    options: { data: { name: "Clone Invite User" } },
  });
  if (inviteError) throw new Error(`generate invite link: ${inviteError.message}`);
  if (invite.user?.id) userIds.push(invite.user.id);
  const inviteResponse = await consume("invite", invite.properties.hashed_token);
  record("invitation route", inviteResponse.status === 307 && !inviteResponse.headers.get("location")?.includes("error="), `${inviteResponse.status} ${inviteResponse.headers.get("location")}`);

  for (const [type, token] of [["recovery", "abcdefghijklmnop"], ["invite", "abcdefghijklmnop"], ["signup", "abcdefghijklmnop"]]) {
    const response = await consume(type, token);
    record(`invalid ${type} token fails safely`, response.status === 307 && response.headers.get("location")?.includes("confirm_link_expired"), `${response.status} ${response.headers.get("location")}`);
  }
} finally {
  for (const id of new Set(userIds)) await admin.auth.admin.deleteUser(id);
}

for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} | ${result.flow} | ${result.actual}`);
if (results.some(({ passed }) => !passed)) process.exit(1);
console.log(`ALL CLONE AUTH CHECKS PASSED (${results.length} assertions; email/provider delivery not asserted)`);
