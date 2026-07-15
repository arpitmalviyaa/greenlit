// Clone-only RLS regression. The service role is used only for fixtures and
// cleanup; every access assertion uses anon or authenticated clients.
import { createClient } from "@supabase/supabase-js";

const EXPECTED_REF = "juhwnamjakmkvixxwrvv";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];
const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const users = [];
const orgs = [];
const objectPaths = [];
let ownWriteId = null;

function record(flow, actor, operation, expected, passed, actual) {
  results.push({ flow, actor, operation, expected, passed, actual });
}

async function mustSingle(label, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function makeTenant(number) {
  const email = `greenlit.clone.rls.${stamp}.u${number}@example.com`;
  const password = `Clone-${stamp}-${number}!Aa9`;
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `Clone RLS User ${number}` },
  });
  if (userError) throw new Error(`create user ${number}: ${userError.message}`);
  users.push(created.user);

  const org = await mustSingle(`create org ${number}`, admin.from("organisations").insert({
    name: `Clone RLS Org ${number} ${stamp}`,
    slug: `clone-rls-${stamp}-${number}`,
  }).select().single());
  orgs.push(org);

  const { error: profileError } = await admin.from("profiles").update({
    organisation_id: org.id,
    role: "agency_admin",
    onboarding_done: true,
  }).eq("id", created.user.id);
  if (profileError) throw new Error(`update profile ${number}: ${profileError.message}`);

  const contract = await mustSingle(`create contract ${number}`, admin.from("contracts").insert({
    organisation_id: org.id,
    title: `Clone RLS Contract ${number}`,
    uploaded_by: created.user.id,
    status: "pending_review",
    raw_text: "clone isolation fixture",
  }).select().single());

  const approval = await mustSingle(`create approval ${number}`, admin.from("approval_requests").insert({
    organisation_id: org.id,
    title: `Clone RLS Approval ${number}`,
    submitted_by: created.user.id,
    status: "pending",
    contract_id: contract.id,
  }).select().single());

  const proof = await mustSingle(`create proof ${number}`, admin.from("proof_vault_entries").insert({
    organisation_id: org.id,
    contract_id: contract.id,
    entry_type: "document",
    title: `Clone RLS Proof ${number}`,
    uploaded_by: created.user.id,
  }).select().single());

  const delivery = await mustSingle(`create delivery ${number}`, admin.from("delivery_locks").insert({
    organisation_id: org.id,
    contract_id: contract.id,
    locked_by: created.user.id,
  }).select().single());

  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`sign in ${number}: ${signInError.message}`);
  return { client, user: created.user, org, contract, approval, proof, delivery };
}

async function expectVisible(flow, actor, query) {
  const { data, error } = await query;
  const passed = !error && (data ?? []).length === 1;
  record(flow, actor, "SELECT", "one permitted row", passed, error?.code ?? `${data?.length ?? 0} rows`);
}

async function expectHidden(flow, actor, query) {
  const { data, error } = await query;
  const passed = (data ?? []).length === 0 && (!error || error.code === "42501");
  record(flow, actor, "SELECT", "zero rows / access denied", passed, error?.code ?? `${data?.length ?? 0} rows`);
}

async function expectWriteDenied(flow, actor, query) {
  const { data, error, count } = await query;
  const returned = Array.isArray(data) ? data.length : (data ? 1 : 0);
  const passed = Boolean(error) || returned === 0 || count === 0;
  record(flow, actor, "WRITE", "RLS rejection / zero affected rows", passed, error?.code ?? `${returned} returned`);
}

try {
  const a = await makeTenant(1);
  const b = await makeTenant(2);

  await expectVisible("profiles", "user A", a.client.from("profiles").select("id").eq("id", a.user.id));
  await expectHidden("profiles", "user B", b.client.from("profiles").select("id").eq("id", a.user.id));
  await expectVisible("organisations", "user A", a.client.from("organisations").select("id").eq("id", a.org.id));
  await expectHidden("organisations", "user B", b.client.from("organisations").select("id").eq("id", a.org.id));

  for (const [table, row] of [
    ["contracts", a.contract],
    ["approval_requests", a.approval],
    ["proof_vault_entries", a.proof],
    ["delivery_locks", a.delivery],
  ]) {
    await expectVisible(table, "user A", a.client.from(table).select("id").eq("id", row.id));
    await expectHidden(table, "user B direct PK", b.client.from(table).select("id").eq("id", row.id));
    const { data, error } = await b.client.from(table).select("id");
    const leaked = (data ?? []).some(({ id }) => id === row.id);
    record(table, "user B list", "SELECT list", "no user A row", !error && !leaked, error?.code ?? `${data?.length ?? 0} visible rows`);
  }

  await expectWriteDenied("contracts", "user A -> user B", a.client.from("contracts")
    .update({ title: "forged update" }).eq("id", b.contract.id).select("id"));
  await expectVisible("contracts after forged update", "user B", b.client.from("contracts")
    .select("id").eq("id", b.contract.id).eq("title", `Clone RLS Contract 2`));

  await expectWriteDenied("contracts", "user A -> user B", a.client.from("contracts")
    .delete().eq("id", b.contract.id).select("id"));
  await expectVisible("contracts after forged delete", "user B", b.client.from("contracts")
    .select("id").eq("id", b.contract.id));

  await expectWriteDenied("contracts forged organisation", "user A", a.client.from("contracts").insert({
    organisation_id: b.org.id,
    title: "forged organisation insert",
    uploaded_by: a.user.id,
    status: "pending_review",
  }).select("id"));

  const { data: ownWrite, error: ownWriteError } = await a.client.from("contracts").insert({
    organisation_id: a.org.id,
    title: "authenticated clone write",
    uploaded_by: a.user.id,
    status: "pending_review",
  }).select("id").single();
  ownWriteId = ownWrite?.id ?? null;
  record("contracts own write", "user A", "INSERT", "one permitted row", !ownWriteError && Boolean(ownWriteId), ownWriteError?.code ?? "inserted");

  for (const bucket of ["contracts", "proof-vault", "claim-evidence", "ip-evidence"]) {
    const ownPath = `${a.org.id}/clone-rls/${stamp}-${bucket}.txt`;
    const otherPath = `${b.org.id}/clone-rls/${stamp}-${bucket}.txt`;
    objectPaths.push([bucket, ownPath], [bucket, otherPath]);
    const { error: ownUploadError } = await a.client.storage.from(bucket).upload(ownPath, new Blob(["own"]));
    record(`${bucket} own path`, "user A", "UPLOAD", "permitted", !ownUploadError, ownUploadError?.message ?? "uploaded");
    const { data: ownDownload, error: ownDownloadError } = await a.client.storage.from(bucket).download(ownPath);
    record(`${bucket} own path`, "user A", "DOWNLOAD", "permitted", Boolean(ownDownload) && !ownDownloadError, ownDownloadError?.message ?? "downloaded");

    const { error: fixtureError } = await admin.storage.from(bucket).upload(otherPath, new Blob(["other"]));
    if (fixtureError) throw new Error(`${bucket} cross-path fixture: ${fixtureError.message}`);
    const { data: crossDownload, error: crossDownloadError } = await a.client.storage.from(bucket).download(otherPath);
    record(`${bucket} cross-tenant path`, "user A -> user B", "DOWNLOAD", "access denied", !crossDownload && Boolean(crossDownloadError), crossDownloadError?.message ?? "unexpected data");
    const forgedPath = `${b.org.id}/clone-rls/${stamp}-${bucket}-forged.txt`;
    objectPaths.push([bucket, forgedPath]);
    const { error: forgedUploadError } = await a.client.storage.from(bucket).upload(forgedPath, new Blob(["forged"]));
    record(`${bucket} cross-tenant path`, "user A -> user B", "UPLOAD", "access denied", Boolean(forgedUploadError), forgedUploadError?.message ?? "unexpected upload");
  }

  for (const table of [
    "analytics_events",
    "compliance_findings",
    "finding_feedback",
    "scope_items",
    "corpus_documents",
    "corpus_chunks",
    "analysis_corpus_refs",
    "startup_matters",
    "startup_documents",
    "startup_memos",
  ]) {
    await expectHidden(table, "user A", a.client.from(table).select("*").limit(1));
    await expectHidden(table, "anon", anon.from(table).select("*").limit(1));
  }

  await expectHidden("contracts", "anon", anon.from("contracts").select("id").limit(1));
  await expectWriteDenied("contracts", "anon", anon.from("contracts").insert({
    organisation_id: a.org.id,
    title: "anonymous forged insert",
    uploaded_by: a.user.id,
    status: "pending_review",
  }).select("id"));
} finally {
  if (ownWriteId) await admin.from("contracts").delete().eq("id", ownWriteId);
  for (const [bucket, path] of objectPaths) await admin.storage.from(bucket).remove([path]);
  for (const org of orgs) {
    await admin.from("delivery_locks").delete().eq("organisation_id", org.id);
    await admin.from("proof_vault_entries").delete().eq("organisation_id", org.id);
    await admin.from("approval_requests").delete().eq("organisation_id", org.id);
    await admin.from("contracts").delete().eq("organisation_id", org.id);
  }
  for (const user of users) await admin.auth.admin.deleteUser(user.id);
  for (const org of orgs) await admin.from("organisations").delete().eq("id", org.id);
}

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} | ${result.flow} | ${result.actor} | ${result.operation} | expected: ${result.expected} | actual: ${result.actual}`);
}
if (results.some(({ passed }) => !passed)) process.exit(1);
console.log(`ALL TWO-TENANT RLS CHECKS PASSED (${results.length} assertions)`);
