// Live acceptance harness for the startup vertical (run via `npx tsx`).
// Exercises the REAL generation path — real prompts, real callStructured (forced tool
// use + zod validation), real diligence/consistency/normalize — against synthetic-but-
// realistic Indian instruments. Corpus augmentation (houseKnowledge) is omitted here;
// retrieval isolation is proven separately via SQL on staging.
//
// NOTE: documents below are SYNTHETIC representative instruments (no client PII).

import { readFileSync, writeFileSync } from "node:fs";
import {
  MEMO_SYSTEM, DOC_TERMS_SYSTEM, memoUser, docTermsUser, MemoSchema, DocTermsSchema,
} from "@/lib/anthropic/prompts/startup-review";
import { computeDiligenceFlags, crossDocChecks, normalizeMemo } from "@/lib/startup/diligence";
import { memoToHtml } from "@/lib/startup/memo-html";
import { callStructured } from "@/lib/anthropic/structured";

// Load ANTHROPIC_API_KEY from .env.local
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const TERM_SHEET = `NON-BINDING TERM SHEET — SERIES A PREFERRED (CCPS)
Company: Nimbus Logistics Technologies Private Limited (CIN pending), Bengaluru.
Investor: Meridian India Fund II. Investment: INR 40,00,00,000 for 18% on a fully-diluted basis.
Instrument: Compulsorily Convertible Preference Shares (CCPS). Pre-money valuation: INR 182,00,00,000.
Liquidation Preference: 1x non-participating, senior to all other shares.
Anti-dilution: broad-based weighted average.
ESOP: An ESOP pool equal to 10% of the fully-diluted capitalisation to be created/topped-up
PRE-money (i.e., dilutes existing shareholders only).
Board: 5 directors — 2 Founder, 1 Investor, 1 Independent (mutually agreed), 1 Nominee of lead.
Reserved Matters: investor consent required for new share issuances, budget approval, borrowing above
INR 5 crore, related-party transactions, changes to charter, and any change of the business.
Founder vesting: 4-year vesting, 1-year cliff, reverse-vesting on unvested shares; bad-leaver forfeits unvested.
Drag-along: on a sale approved by the Board and holders of majority preference shares.
Total fully-diluted shares (post): 12,00,000. This term sheet is signed and dated 12 June 2026.`;

const SHA = `SHAREHOLDERS' AGREEMENT (executed) — Nimbus Logistics Technologies Private Limited.
Parties: the Company; the Founders (A. Rao, S. Iyer); Meridian India Fund II ("Investor").
Share capital: total 12,00,000 shares on a fully-diluted basis.
Liquidation preference: 1x participating (Investor participates AND shares pro-rata in the balance).
Anti-dilution: full ratchet.
ESOP pool: 12% of fully-diluted capital, created POST-money.
Board: Investor may appoint 2 of 5 directors; quorum requires the Investor nominee present.
Reserved matters (Investor veto): issuance of securities, annual budget, CEO appointment/removal,
any borrowing, related-party transactions, amendment of Articles, winding up.
Transfer restrictions: ROFR + tag-along for Investor; Founders locked-in for 5 years.
Drag-along: Investor alone (holding preference majority) may drag all shareholders on a sale.
Founder vesting: 4-year, no cliff.
This SHA is executed but the signature page is undated.`;

async function reviewOne(label: string, subType: string, text: string) {
  console.log(`\n===== ${label} (${subType}) =====`);
  const terms = await callStructured({
    feature: "startup.doc_terms", promptVersion: "v1", model: "claude-haiku-4-5-20251001",
    maxTokens: 1500, system: DOC_TERMS_SYSTEM, user: docTermsUser(subType, text),
    schema: DocTermsSchema, toolName: "extract_doc_terms",
  });
  console.log("extracted terms:", JSON.stringify(terms));
  const raw = await callStructured({
    feature: "startup.review", promptVersion: "v1", model: "claude-sonnet-4-6",
    maxTokens: 4000, system: MEMO_SYSTEM,
    user: memoUser({ subType, docText: text, houseContext: "" }),
    schema: MemoSchema, toolName: "report_memo",
  });
  const memo = normalizeMemo(raw, computeDiligenceFlags([{ sub_type: subType, terms }]));
  console.log("bottom_line:", memo.bottom_line);
  console.log("top_issues:", memo.top_issues.map((i) => `[${i.why_it_matters}/${i.action}] ${i.clause_ref}`).join(" | "));
  console.log("diligence:", memo.diligence_flags.map((f) => `${f.item}:${f.status}`).join(", "));
  writeFileSync(`scripts/out-${subType}.html`, memoToHtml(memo, { prepared_for: "Nimbus founders", document_label: label, date: "2026-07-08", reviewed_by: "Adv. R. Kumar", status: "reviewed" }));
  writeFileSync(`scripts/out-${subType}.json`, JSON.stringify(memo));
  return { terms, memo };
}

async function reviewDataRoom() {
  console.log(`\n===== DATA ROOM (6+ docs) =====`);
  // 7 synthetic docs. Planted: total_shares mismatch (SHA 1,000,000 vs incorporation 900,000);
  // ESOP pool pct mismatch (term_sheet 10 vs esop 12); NO founder_agreement doc (missing flag).
  const docs = [
    { sub_type: "term_sheet", title: "Series A TS", terms: { company_name: "Nimbus Logistics", total_shares: 1000000, esop_pool_pct: 10, signed_and_dated: true } },
    { sub_type: "sha", title: "SHA", terms: { company_name: "Nimbus Logistics", total_shares: 1000000, esop_pool_pct: null, signed_and_dated: false } },
    { sub_type: "ssa", title: "SSA", terms: { company_name: "Nimbus Logistics", signed_and_dated: true } },
    { sub_type: "incorporation", title: "MOA/AOA + registers", terms: { company_name: "Nimbus Logistics", total_shares: 900000, signed_and_dated: true } },
    { sub_type: "esop", title: "ESOP Scheme", terms: { company_name: "Nimbus Logistics", esop_pool_pct: 12, signed_and_dated: true } },
    { sub_type: "ip_assignment", title: "Founder IP Assignment", terms: { signed_and_dated: true } },
    { sub_type: "dpdp_program", title: "DPDPA consent notes", terms: { signed_and_dated: true } },
  ];
  const diligence = computeDiligenceFlags(docs);
  const inconsistencies = crossDocChecks(docs);
  console.log("inconsistencies detected:", inconsistencies.length);
  inconsistencies.forEach((i) => console.log("  -", i.detail));
  console.log("missing flags:", diligence.filter((f) => f.status === "missing").map((f) => f.item).join(", "));

  const perDocSummary = docs.map((d, i) => `[${i + 1}] ${d.title} (${d.sub_type})\nterms: ${JSON.stringify(d.terms)}`).join("\n\n");
  const raw = await callStructured({
    feature: "startup.dataroom", promptVersion: "v1", model: "claude-sonnet-4-6", maxTokens: 4500,
    system: MEMO_SYSTEM,
    user: memoUser({
      subType: "data_room", houseContext: "",
      perDocSummary,
      presenceLine: diligence.map((f) => `- ${f.item}: ${f.status} — ${f.note}`).join("\n"),
      consistencyLine: inconsistencies.map((c) => `- ${c.detail}`).join("\n"),
    }),
    schema: MemoSchema, toolName: "report_memo",
  });
  const memo = normalizeMemo(raw, diligence);
  console.log("bottom_line:", memo.bottom_line);
  console.log("top_issues:", memo.top_issues.map((i) => `[${i.why_it_matters}/${i.action}] ${i.clause_ref}`).join(" | "));
  writeFileSync("scripts/out-dataroom.json", JSON.stringify(memo));
  writeFileSync("scripts/out-dataroom.html", memoToHtml(memo, { document_label: "Data room — 7 documents", date: "2026-07-08", status: "reviewed" }));
  return { memo, inconsistencies, diligence };
}

(async () => {
  const results = {
    termSheet: await reviewOne("Series A Term Sheet", "term_sheet", TERM_SHEET),
    sha: await reviewOne("Shareholders' Agreement", "sha", SHA),
    dataRoom: await reviewDataRoom(),
  };
  writeFileSync("scripts/out-summary.json", JSON.stringify({
    term_sheet_memo: results.termSheet.memo, sha_memo: results.sha.memo, dataroom_memo: results.dataRoom.memo,
  }));
  console.log("\nDONE. HTML + JSON written to scripts/out-*.");
})();
