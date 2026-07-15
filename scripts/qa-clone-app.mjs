// Proves the running local application is wired to the clone by completing an
// authenticated workspace write and read, then removing every fixture.
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
const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const email = `qa-app-${stamp}@getgreenlit.in`;
const password = `Clone-App-${stamp}!Aa9`;
let userId = null;
let organisationId = null;

function sessionCookie(session) {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;
  const parts = value.match(/.{1,3180}/g) ?? [];
  const name = `sb-${EXPECTED_REF}-auth-token`;
  return parts.length === 1 ? `${name}=${parts[0]}` : parts.map((part, index) => `${name}.${index}=${part}`).join("; ");
}

try {
  const health = await fetch(`${appUrl}/api/health`);
  const healthBody = await health.json();
  console.log(`${health.ok && healthBody.ok ? "PASS" : "FAIL"} | anonymous health route | HTTP ${health.status}`);
  if (!health.ok || !healthBody.ok) process.exitCode = 1;

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError) throw new Error(`create app user: ${createError.message}`);
  userId = created.user.id;

  const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) throw new Error(`app sign in: ${signInError?.message ?? "missing session"}`);
  const cookie = sessionCookie(signedIn.session);

  const createOrg = await fetch(`${appUrl}/api/org/create`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ name: `Clone App Org ${stamp}`, account_type: "agency", jurisdiction_codes: ["IN"] }),
  });
  const orgBody = await createOrg.json();
  organisationId = orgBody.organisation?.id ?? null;
  console.log(`${createOrg.status === 201 && organisationId ? "PASS" : "FAIL"} | authenticated application write | POST /api/org/create -> HTTP ${createOrg.status}`);
  if (createOrg.status !== 201 || !organisationId) process.exitCode = 1;

  const billing = await fetch(`${appUrl}/api/billing/status`, { headers: { cookie } });
  const billingBody = await billing.json();
  const readPassed = billing.ok && Array.isArray(billingBody.active_jurisdictions) && billingBody.active_jurisdictions.includes("IN");
  console.log(`${readPassed ? "PASS" : "FAIL"} | authenticated application read | GET /api/billing/status -> HTTP ${billing.status}`);
  if (!readPassed) process.exitCode = 1;
} finally {
  if (organisationId) {
    await admin.from("organisation_jurisdictions").delete().eq("organisation_id", organisationId);
  }
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (organisationId) await admin.from("organisations").delete().eq("id", organisationId);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("ALL CLONE APPLICATION CHECKS PASSED");
