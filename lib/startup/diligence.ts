// Pure, dependency-free startup-analysis logic: the fixed diligence checklist,
// document-presence flags, deterministic cross-document consistency checks, and memo
// normalization. No imports → unit-testable in isolation (see tests/startup-logic.test.mjs).

// Fixed diligence checklist — the memo always reports exactly these eight, in order.
export const DILIGENCE_ITEMS = [
  "ip_assignments", "cap_table", "dpdpa_consent", "data_processing",
  "key_contracts_executed", "esop_docs", "founder_agreements", "statutory_registers",
] as const;
export type DiligenceItem = (typeof DILIGENCE_ITEMS)[number];

export type DiligenceStatus = "green" | "attention" | "missing";
export interface DiligenceFlag { item: DiligenceItem; status: DiligenceStatus; note: string }

// Structural subset of DocTerms that the checks read (avoids importing the zod type).
export interface DocTermsLike {
  company_name?: string | null;
  total_shares?: number | null;
  esop_pool_pct?: number | null;
  esop_pool_shares?: number | null;
  signed_and_dated?: boolean | null;
}
export interface MatterDoc { sub_type: string; title?: string | null; terms?: DocTermsLike | null }
export interface Inconsistency { field: string; detail: string; docs: string[] }

// Which diligence checklist items a document sub_type evidences.
// ponytail: coarse presence map, not a full diligence index. Widen the arrays if the
// taxonomy grows.
const SUBTYPE_COVERS: Record<string, DiligenceItem[]> = {
  ip_assignment: ["ip_assignments"],
  founder_agreement: ["founder_agreements"],
  esop: ["esop_docs"],
  dpdp_program: ["dpdpa_consent", "data_processing"],
  incorporation: ["statutory_registers", "cap_table"],
  sha: ["cap_table", "key_contracts_executed"],
  ssa: ["cap_table", "key_contracts_executed"],
  term_sheet: ["key_contracts_executed"],
  safe_ccps: ["key_contracts_executed"],
  employment: ["key_contracts_executed"],
  consultant: ["key_contracts_executed"],
  nda: ["key_contracts_executed"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Diligence flags from ACTUAL document presence/absence in the matter (not single-doc
// inference). Present → green (or 'attention' if a covering doc is unsigned/undated);
// absent → 'missing'. Always returns all 8 items, in canonical order.
export function computeDiligenceFlags(docs: MatterDoc[]): DiligenceFlag[] {
  return DILIGENCE_ITEMS.map((item) => {
    const covering = docs.filter((d) => (SUBTYPE_COVERS[d.sub_type] ?? []).includes(item));
    if (covering.length === 0) {
      return { item, status: "missing", note: "No document in the matter covers this." };
    }
    const unsigned = covering.filter((d) => d.terms && d.terms.signed_and_dated === false);
    if (unsigned.length) {
      return { item, status: "attention", note: `Present but unsigned/undated: ${unsigned.map((d) => d.title || d.sub_type).join(", ")}.` };
    }
    return { item, status: "green", note: `Covered by: ${covering.map((d) => d.title || d.sub_type).join(", ")}.` };
  });
}

// Deterministic cross-document consistency checks over per-doc extracted terms.
// Flags disagreeing company names, share counts (cap table vs SHA), and ESOP pool.
export function crossDocChecks(docs: MatterDoc[]): Inconsistency[] {
  const out: Inconsistency[] = [];
  const label = (d: MatterDoc) => d.title || d.sub_type;

  const checkField = <T>(field: string, get: (t: DocTermsLike) => T | null | undefined, human: string, eq?: (a: T, b: T) => boolean) => {
    const seen: { value: T; doc: string }[] = [];
    for (const d of docs) {
      const v = d.terms ? get(d.terms) : null;
      if (v === null || v === undefined) continue;
      seen.push({ value: v, doc: label(d) });
    }
    const equal = eq ?? ((a: T, b: T) => a === b);
    const distinct: { value: T; docs: string[] }[] = [];
    for (const s of seen) {
      const g = distinct.find((x) => equal(x.value, s.value));
      if (g) g.docs.push(s.doc); else distinct.push({ value: s.value, docs: [s.doc] });
    }
    if (distinct.length > 1) {
      out.push({
        field,
        detail: `${human} differ across documents: ${distinct.map((x) => `${JSON.stringify(x.value)} (${x.docs.join(", ")})`).join(" vs ")}.`,
        docs: distinct.flatMap((x) => x.docs),
      });
    }
  };

  checkField("company_name", (t) => t.company_name, "Company / entity name", (a, b) => norm(a) === norm(b));
  checkField("total_shares", (t) => t.total_shares, "Total share count (cap table vs SHA/SSA)");
  checkField("esop_pool_pct", (t) => t.esop_pool_pct, "ESOP pool % (term sheet vs ESOP scheme)");
  checkField("esop_pool_shares", (t) => t.esop_pool_shares, "ESOP pool share count");
  return out;
}

// Force diligence_flags to all 8 items in canonical order (using the authoritative
// computed list when provided) and cap top_issues at 3. Generic passthrough preserves
// the caller's precise memo type.
export function normalizeMemo<M extends { top_issues: unknown[]; diligence_flags: DiligenceFlag[] }>(
  memo: M, computed?: DiligenceFlag[]
): M {
  const byItem = new Map((computed ?? memo.diligence_flags).map((f) => [f.item, f]));
  const diligence_flags = DILIGENCE_ITEMS.map(
    (item) => byItem.get(item) ?? { item, status: "missing" as const, note: "Not assessed." }
  );
  return { ...memo, top_issues: memo.top_issues.slice(0, 3), diligence_flags };
}
