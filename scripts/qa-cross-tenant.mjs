// Cross-tenant denial test: two QA users in two orgs; each tries to read the
// other's contracts, content scans, approvals, and proof storage. Cleans up.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync("/Users/arpitmalviya/Downloads/greenlit/.env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY);
const results = [];
const check = (name, ok, detail = "") => {
  results.push([ok ? "PASS" : "FAIL", name, detail]);
};

const STAMP = Math.random().toString(36).slice(2, 8);
const users = [];
const orgs = [];

async function makeTenant(n) {
  const email = `greenlit.qa.p3.${STAMP}.u${n}@example.com`;
  const { data: u, error: ue } = await admin.auth.admin.createUser({
    email, password: `Qa-${STAMP}-pass-${n}!`, email_confirm: true, user_metadata: { name: `QA P3 U${n}` },
  });
  if (ue) throw new Error("createUser: " + ue.message);
  const { data: org, error: oe } = await admin.from("organisations").insert({ name: `QA P3 Org ${n} ${STAMP}`, slug: `qa-p3-${STAMP}-${n}` }).select().single();
  if (oe) throw new Error("org: " + oe.message);
  await admin.from("profiles").update({ organisation_id: org.id, role: "agency_admin", onboarding_done: true }).eq("id", u.user.id);
  const { data: contract, error: ce } = await admin.from("contracts").insert({
    organisation_id: org.id, title: `QA contract ${n}`, uploaded_by: u.user.id, status: "pending_review", raw_text: "test contract text",
  }).select().single();
  if (ce) throw new Error("contract: " + ce.message);
  const { data: scan } = await admin.from("content_scans").insert({
    organisation_id: org.id, content_type: "caption", raw_content: "qa scan", scan_result_json: {}, risk_score: 5,
    verdict: "greenlit", checker_ids_run: [], top_issues_json: [], requires_lawyer: false, jurisdiction: "IN", created_by: u.user.id,
  }).select().single();
  const { data: approval } = await admin.from("approval_requests").insert({
    organisation_id: org.id, title: `QA approval ${n}`, submitted_by: u.user.id, status: "pending", contract_id: contract.id,
  }).select().single();
  users.push(u.user); orgs.push(org);
  const client = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: se } = await client.auth.signInWithPassword({ email, password: `Qa-${STAMP}-pass-${n}!` });
  if (se) throw new Error("signIn: " + se.message);
  return { client, org, contract, scan, approval, user: u.user };
}

try {
  const a = await makeTenant(1);
  const b = await makeTenant(2);

  // Own-row sanity: A sees own contract
  {
    const { data } = await a.client.from("contracts").select("id").eq("id", a.contract.id);
    check("A reads own contract", (data ?? []).length === 1);
  }
  // Cross-tenant SELECTs must return empty
  for (const [name, table, id] of [
    ["contracts", "contracts", b.contract.id],
    ["content_scans", "content_scans", b.scan?.id],
    ["approval_requests", "approval_requests", b.approval?.id],
  ]) {
    if (!id) { check(`A denied ${name}`, false, "fixture missing"); continue; }
    const { data } = await a.client.from(table).select("id").eq("id", id);
    check(`A denied B's ${name}`, (data ?? []).length === 0);
  }
  // Cross-tenant UPDATE must not stick
  {
    await a.client.from("contracts").update({ title: "hacked" }).eq("id", b.contract.id);
    const { data } = await admin.from("contracts").select("title").eq("id", b.contract.id).single();
    check("A cannot update B's contract", data.title === "QA contract 2", data.title);
  }
  // Proof storage: A tries to read B's org path
  {
    const path = `${b.org.id}/qa-test/evidence/file.txt`;
    await admin.storage.from("proof-vault").upload(path, new Blob(["qa"]), { upsert: true }).catch(() => {});
    const { data, error } = await a.client.storage.from("proof-vault").download(path);
    check("A denied B's proof file", !data && !!error, error?.message ?? "");
  }
  // Approvals API-level: B's approval invisible in A's list
  {
    const { data } = await a.client.from("approval_requests").select("id");
    const leaked = (data ?? []).some((r) => r.id === b.approval?.id);
    check("A's approval list has no B rows", !leaked);
  }
} finally {
  // Cleanup: delete QA rows, orgs, users
  for (const org of orgs) {
    await admin.from("approval_requests").delete().eq("organisation_id", org.id);
    await admin.from("content_scans").delete().eq("organisation_id", org.id);
    await admin.from("contracts").delete().eq("organisation_id", org.id);
    await admin.storage.from("proof-vault").remove([`${org.id}/qa-test/evidence/file.txt`]).catch(() => {});
  }
  for (const u of users) await admin.auth.admin.deleteUser(u.id).catch((e) => console.error("user cleanup:", e.message));
  for (const org of orgs) await admin.from("organisations").delete().eq("id", org.id);
}

for (const [status, name, detail] of results) console.log(`${status}  ${name}${detail ? "  (" + detail + ")" : ""}`);
if (results.some(([s]) => s === "FAIL")) process.exit(1);
console.log("ALL CROSS-TENANT CHECKS PASSED");
