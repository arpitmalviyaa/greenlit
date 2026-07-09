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
