// Production E2E: login → org create → contract upload (docx) → analyse →
// red flags → content check → certificate. Prints PASS/FAIL per step.
// Cleanup of the QA user/org happens separately.
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const APP = "https://app.getgreenlit.in";
const [EMAIL, PASSWORD] = process.argv.slice(2);
if (!EMAIL || !PASSWORD) { console.error("usage: node qa-prod-flow.mjs <email> <password>"); process.exit(2); }

// ── minimal valid .docx built by hand (zip with stored entries) ─────────────
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function makeZip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const data = Buffer.from(text);
    const nameB = Buffer.from(name);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); local.writeUInt32LE(0, 10); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameB.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, nameB, data);
    const cent = Buffer.alloc(46);
    cent.writeUInt32LE(0x02014b50, 0); cent.writeUInt16LE(20, 4); cent.writeUInt16LE(20, 6);
    cent.writeUInt32LE(crc, 16); cent.writeUInt32LE(data.length, 20); cent.writeUInt32LE(data.length, 24);
    cent.writeUInt16LE(nameB.length, 28); cent.writeUInt32LE(offset, 42);
    central.push(cent, nameB);
    offset += 30 + nameB.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, end]);
}
const CONTRACT_TEXT = `INFLUENCER MARKETING AGREEMENT between GlowUp Cosmetics Pvt Ltd and the Creator.
1. Deliverables: two Instagram reels and one story per month during the Term.
2. Fees: INR 2,00,000 payable within ninety (90) days after the Brand confirms satisfaction with the deliverables at its sole discretion.
3. Intellectual Property: all Content is assigned to the Brand in perpetuity, throughout the universe, in all media now known or hereafter devised, without further compensation.
4. Indemnity: the Creator shall indemnify and hold harmless the Brand from any and all claims, losses and expenses of whatever nature, without any cap or limitation.
5. Exclusivity: the Creator shall not promote any other brand in any category for twenty-four (24) months.
6. Termination: the Brand may terminate at any time for convenience without notice.
7. Governing law: courts of Mumbai, India.`;
const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${CONTRACT_TEXT.split("\n").map((l) => `<w:p><w:r><w:t xml:space="preserve">${l}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`;
const docx = makeZip([
  ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`],
  ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
  ["word/document.xml", docXml],
]);

// ── flow ─────────────────────────────────────────────────────────────────────
const results = [];
const check = (n, ok, d = "") => { results.push([ok ? "PASS" : "FAIL", n, d]); if (!ok) console.error("FAIL detail:", n, d); };

// login via Supabase to get access token, then use cookie-based app APIs?
// App routes read the session from cookies (SSR client). Simplest: use the
// auth cookies format Supabase SSR expects: sb-<ref>-auth-token cookie.
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\./)[1];
const authRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const session = await authRes.json();
check("login", authRes.ok && !!session.access_token, session.error_description ?? "");
if (!authRes.ok) { print(); process.exit(1); }

const cookieVal = `base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;
// chunk cookie like @supabase/ssr does when large
const chunks = cookieVal.match(/.{1,3180}/g);
const cookie = chunks.length === 1
  ? `sb-${ref}-auth-token=${chunks[0]}`
  : chunks.map((c, i) => `sb-${ref}-auth-token.${i}=${c}`).join("; ");

async function api(path, opts = {}) {
  const res = await fetch(`${APP}${path}`, { ...opts, headers: { cookie, ...(opts.headers ?? {}) } });
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  return { res, body };
}

// org create (fresh confirmed user has no org yet)
{
  const { res, body } = await api("/api/org/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "QA Flow Agency", jurisdiction_codes: ["IN"] }),
  });
  check("org create", res.ok || body?.error === "Profile already has an organisation", JSON.stringify(body).slice(0, 120));
}

// contract upload
let contractId = null;
{
  const form = new FormData();
  form.append("file", new Blob([docx], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "qa-contract.docx");
  form.append("title", "QA Prod Flow Contract");
  const { res, body } = await api("/api/counsel/upload", { method: "POST", body: form });
  contractId = body?.contract_id ?? null;
  check("contract upload + text extraction", res.ok && !!contractId && body.extraction_success, JSON.stringify(body).slice(0, 160));
}

// analyse
{
  const { res, body } = await api("/api/counsel/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract_id: contractId, jurisdiction: "IN" }),
  });
  const a = body?.analysis;
  check(
    "analyse (v3 structured)",
    res.ok && !!a && Array.isArray(a.risky_clauses) && typeof a.summary === "string" && Array.isArray(a.standard_terms),
    res.ok ? `score=${a?.risk_score} risky=${a?.risky_clauses?.length} std=${a?.standard_terms?.length}` : JSON.stringify(body).slice(0, 160)
  );
}

// red flags (the Phase 0 bug)
{
  const { res, body } = await api("/api/counsel/redflags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract_id: contractId }),
  });
  check("red flags scan", res.ok && Array.isArray(body?.flags) && body.flags.length > 0, res.ok ? `${body.flags.length} flags` : JSON.stringify(body).slice(0, 160));
}

// content check → certificate
{
  const { res, body } = await api("/api/content/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "Loved trying the new GlowUp serum — my honest thoughts after two weeks. #ad #partner @glowup", content_type: "caption" }),
  });
  check("content check", res.ok && !!body?.verdict, res.ok ? `${body.verdict} (${body.issues?.length ?? 0} issues)` : JSON.stringify(body).slice(0, 160));
  if (body?.verdict === "greenlit" && body?.scan_id) {
    const cert = await fetch(`${APP}/certificate/${body.scan_id}`);
    const html = await cert.text();
    check("public certificate page", cert.ok && html.includes("Cleared to publish"), `HTTP ${cert.status}`);
  } else {
    check("public certificate page", body?.verdict !== "greenlit", "no cert for non-greenlit verdict — expected only if content flagged");
  }
}

function print() {
  for (const [s, n, d] of results) console.log(`${s}  ${n}${d ? "  (" + d + ")" : ""}`);
  if (results.some(([s]) => s === "FAIL")) process.exit(1);
  console.log("ALL PROD FLOW CHECKS PASSED");
}
print();
