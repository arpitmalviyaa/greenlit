// Pure, dependency-free clause-aware chunker. No `@/` imports so it stays
// unit-testable via Node's type-stripping (tests/corpus-chunk.test.mjs).

// ~800 tokens ≈ 3200 chars. Clause boundary regex catches numbered clauses
// (1., 1.1, 12.), "Section N", "Article N", and short ALL-CAPS headings.
const CHAR_BUDGET = 3200;
const CLAUSE_BOUNDARY = /\n(?=\s*(?:\d{1,2}(?:\.\d{1,2})*\.?\s|section\s+\d+|article\s+\d+|[A-Z][A-Z \-]{4,}\n))/i;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  // First split on clause boundaries, then hard-wrap any oversized piece.
  const pieces = clean.split(CLAUSE_BOUNDARY).map((p) => p.trim()).filter(Boolean);
  const source = pieces.length > 1 ? pieces : [clean];

  const chunks: string[] = [];
  for (const piece of source) {
    if (piece.length <= CHAR_BUDGET) {
      chunks.push(piece);
      continue;
    }
    // Oversized clause / no boundaries found → wrap on paragraph, then hard char.
    const paras = piece.split(/\n{2,}/);
    let buf = "";
    for (const para of paras) {
      if ((buf + "\n\n" + para).length > CHAR_BUDGET && buf) {
        chunks.push(buf.trim());
        buf = "";
      }
      if (para.length > CHAR_BUDGET) {
        for (let i = 0; i < para.length; i += CHAR_BUDGET) chunks.push(para.slice(i, i + CHAR_BUDGET));
      } else {
        buf = buf ? buf + "\n\n" + para : para;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
  }
  return chunks.filter(Boolean);
}

// ── statutory chunking ────────────────────────────────────────────────────────
// Splits an act/statute/regulation into per-section chunks, each carrying the
// section reference ("s.2", "s.12A", "r.4") so retrieval can cite the exact
// provision. Falls back to plain chunkText behaviour (null refs) when no
// section structure is detectable.

export interface SectionChunk {
  content: string;
  section_ref: string | null;
}

// Matches section headings at line start: "Section 12.", "12.", "12A.", and
// rule/regulation forms "Rule 4", "Regulation 3". Requires the heading to start
// the line so clause cross-references mid-sentence don't split.
const SECTION_HEAD = /^(?:(?:section|sec\.?)\s+(\d+[A-Z]{0,2})|(?:rule)\s+(\d+[A-Z]{0,2})|(?:regulation|reg\.?)\s+(\d+[A-Z]{0,2})|(\d+[A-Z]{0,2})\.(?=\s+\S))/i;

export function chunkSections(text: string): SectionChunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const lines = clean.split("\n");
  const sections: { ref: string | null; lines: string[] }[] = [{ ref: null, lines: [] }];
  for (const line of lines) {
    const m = line.trim().match(SECTION_HEAD);
    if (m) {
      const num = m[1] ?? m[2] ?? m[3] ?? m[4];
      const prefix = m[2] ? "r." : m[3] ? "reg." : "s.";
      sections.push({ ref: `${prefix}${num.toUpperCase()}`, lines: [line] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }

  const out: SectionChunk[] = [];
  for (const s of sections) {
    const content = s.lines.join("\n").trim();
    if (!content) continue;
    // Oversized section → re-wrap via chunkText; every piece keeps the ref.
    for (const piece of chunkText(content)) out.push({ content: piece, section_ref: s.ref });
  }

  // No section structure detected → behave exactly like chunkText (null refs).
  return out.some((c) => c.section_ref) ? out : out.map((c) => ({ ...c, section_ref: null }));
}
