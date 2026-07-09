// Founder Readiness Memo → self-contained, print-styled HTML.
// "Export PDF" = the reviewer prints this page to PDF (Cmd/Ctrl-P). No PDF library
// exists in the app, and print-to-PDF needs zero dependencies.
// ponytail: browser print-to-PDF. Add @react-pdf/renderer only if server-side PDF
// bytes (email attach, headless) are ever required.

import type { Memo } from "@/lib/anthropic/prompts/startup-review";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const AXIS_LABEL: Record<string, string> = { control: "Control", economics: "Economics", diligence: "Diligence" };
const ACTION_LABEL: Record<string, string> = { accept: "Accept", negotiate: "Negotiate", fix_now: "Fix now" };
const STATUS_LABEL: Record<string, string> = { green: "OK", attention: "Attention", missing: "Missing" };
const ITEM_LABEL: Record<string, string> = {
  ip_assignments: "IP assignments", cap_table: "Cap table", dpdpa_consent: "DPDPA consent",
  data_processing: "Data processing", key_contracts_executed: "Key contracts executed",
  esop_docs: "ESOP documents", founder_agreements: "Founder agreements", statutory_registers: "Statutory registers",
};

export interface MemoHeader {
  prepared_for?: string | null;
  document_label?: string | null;
  date?: string | null;
  reviewed_by?: string | null;
  status?: "draft" | "reviewed";
}

export function memoToHtml(memo: Memo, header: MemoHeader = {}): string {
  const draft = header.status !== "reviewed";
  const issues = memo.top_issues.map((i) => `
    <div class="issue ${esc(i.action)}">
      <div class="issue-head"><span class="badge">${esc(AXIS_LABEL[i.why_it_matters] ?? i.why_it_matters)}</span>
        <span class="badge action">${esc(ACTION_LABEL[i.action] ?? i.action)}</span>
        <span class="ref">${esc(i.clause_ref)}</span></div>
      <p>${esc(i.plain_english)}</p>
      <p class="wording"><strong>Suggested wording:</strong> ${esc(i.suggested_wording)}</p>
    </div>`).join("");

  const flags = memo.diligence_flags.map((f) => `
    <tr class="s-${esc(f.status)}"><td>${esc(ITEM_LABEL[f.item] ?? f.item)}</td>
      <td class="status">${esc(STATUS_LABEL[f.status] ?? f.status)}</td>
      <td>${esc(f.note)}</td></tr>`).join("");

  const lawyer = memo.needs_lawyer.length
    ? `<ul>${memo.needs_lawyer.map((n) => `<li><strong>${esc(n.item)}</strong> — ${esc(n.reason)}</li>`).join("")}</ul>`
    : `<p class="muted">Nothing here needs a lawyer beyond the standard review.</p>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Founder Readiness Memo</title>
<style>
  :root { --ink:#111; --muted:#666; --line:#e3e3e3; --green:#1a7f37; --amber:#9a6700; --red:#b42318; }
  * { box-sizing:border-box; }
  body { font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:var(--ink); max-width:820px; margin:32px auto; padding:0 24px; }
  h1 { font-size:22px; margin:0 0 2px; } h2 { font-size:15px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin:28px 0 10px; border-bottom:1px solid var(--line); padding-bottom:6px; }
  .header { border:1px solid var(--line); border-radius:10px; padding:14px 16px; margin-bottom:8px; }
  .header dl { display:grid; grid-template-columns:auto 1fr; gap:2px 12px; margin:6px 0 0; font-size:13px; }
  .header dt { color:var(--muted); } .header dd { margin:0; }
  .bottom-line { font-size:16px; background:#f7f7f5; border-left:3px solid var(--ink); padding:12px 14px; border-radius:0 6px 6px 0; }
  .issue { border:1px solid var(--line); border-radius:8px; padding:12px 14px; margin:10px 0; }
  .issue-head { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
  .badge { font-size:11px; text-transform:uppercase; letter-spacing:.03em; background:#eee; border-radius:20px; padding:2px 9px; }
  .badge.action { background:#111; color:#fff; } .ref { font-size:12px; color:var(--muted); margin-left:auto; }
  .wording { font-size:13px; color:#333; }
  table { width:100%; border-collapse:collapse; font-size:13px; } td { padding:7px 8px; border-top:1px solid var(--line); vertical-align:top; }
  td.status { font-weight:600; white-space:nowrap; } tr.s-green td.status { color:var(--green); } tr.s-attention td.status { color:var(--amber); } tr.s-missing td.status { color:var(--red); }
  .muted { color:var(--muted); } .footer { margin-top:32px; padding-top:12px; border-top:1px solid var(--line); font-size:12px; color:var(--muted); }
  .draft-banner { background:#fff4e5; border:1px solid #f0c98a; color:#8a5a00; border-radius:8px; padding:8px 12px; font-size:13px; margin-bottom:16px; }
  @media print { body { margin:0; max-width:none; } .no-print { display:none; } .issue, table, tr { page-break-inside:avoid; } }
</style></head><body>
${draft ? `<div class="draft-banner no-print">DRAFT — not yet reviewed. Export is disabled until an advocate marks this memo reviewed.</div>` : ""}
<header>
  <h1>Founder Readiness Memo</h1>
  <div class="header"><dl>
    <dt>Prepared for</dt><dd>${esc(header.prepared_for || "—")}</dd>
    <dt>Document reviewed</dt><dd>${esc(header.document_label || "—")}</dd>
    <dt>Date</dt><dd>${esc(header.date || "—")}</dd>
    <dt>Reviewed by</dt><dd>${esc(header.reviewed_by || "—")}</dd>
  </dl></div>
</header>

<h2>Bottom line</h2>
<p class="bottom-line">${esc(memo.bottom_line)}</p>

<h2>Top issues</h2>
${issues || `<p class="muted">No material issues surfaced.</p>`}

<h2>Diligence readiness</h2>
<table><tbody>${flags}</tbody></table>

<h2>What is standard — no action needed</h2>
<p>${esc(memo.standard_no_action)}</p>

<h2>Needs a lawyer</h2>
${lawyer}

<h2>Next step</h2>
<p><strong>${esc(memo.next_step)}</strong></p>

<div class="footer">This is a readiness review, not formal legal advice.</div>
</body></html>`;
}
