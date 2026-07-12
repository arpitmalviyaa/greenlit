// Legal-authority kinds and their retrieval weights. doc_kind IS the authority
// type — one source of truth, no parallel column (see 20260712010000 migration).

export const AUTHORITY_KINDS = [
  "act", "statute", "rule", "regulation",
  "notification", "circular", "case_law", "judgment", "guideline",
] as const;

export type AuthorityKind = (typeof AUTHORITY_KINDS)[number];

export function isAuthorityKind(kind: string): kind is AuthorityKind {
  return (AUTHORITY_KINDS as readonly string[]).includes(kind);
}

// Primary law outranks secondary sources. House knowledge sits at the DB
// default (0.5); founder can tune per-document in the admin panel.
export const AUTHORITY_WEIGHT: Record<AuthorityKind, number> = {
  act: 1.0,
  statute: 1.0,
  rule: 0.9,
  regulation: 0.9,
  notification: 0.8,
  circular: 0.8,
  case_law: 0.7,
  judgment: 0.7,
  guideline: 0.6,
};

export function defaultAuthorityWeight(kind: string): number {
  return isAuthorityKind(kind) ? AUTHORITY_WEIGHT[kind] : 0.5;
}
