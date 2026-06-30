export type SearchDocumentType = "contracts" | "brands" | "creators" | "clauses" | "comments" | "versions";

export interface SearchDocument {
  id: string;
  organisation_id: string;
  document_type: SearchDocumentType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  organisation_id: string;
  document_type: SearchDocumentType;
  title: string;
  score: number;
  metadata: Record<string, unknown>;
}

const searchTypes = new Set<SearchDocumentType>(["contracts", "brands", "creators", "clauses", "comments", "versions"]);

export class SearchIndex {
  private readonly documents = new Map<string, SearchDocument>();
  private readonly termDocs = new Map<string, Set<string>>();
  private readonly termCounts = new Map<string, Map<string, number>>();

  upsert(document: SearchDocument): void {
    if (!searchTypes.has(document.document_type)) throw new Error(`UNSUPPORTED_SEARCH_TYPE:${document.document_type}`);
    this.delete(document.id);
    const counts = countTerms(`${document.title} ${document.body}`);
    this.documents.set(document.id, document);
    this.termCounts.set(document.id, counts);
    for (const term of Array.from(counts.keys())) {
      const docs = this.termDocs.get(term) ?? new Set<string>();
      docs.add(document.id);
      this.termDocs.set(term, docs);
    }
  }

  delete(documentId: string): void {
    const counts = this.termCounts.get(documentId);
    if (!counts) return;
    for (const term of Array.from(counts.keys())) {
      const docs = this.termDocs.get(term);
      docs?.delete(documentId);
      if (docs?.size === 0) this.termDocs.delete(term);
    }
    this.termCounts.delete(documentId);
    this.documents.delete(documentId);
  }

  search(query: string, input: { organisationId: string; documentTypes?: Set<SearchDocumentType>; limit?: number }): SearchResult[] {
    const terms = tokens(query);
    if (!terms.length) return [];
    const candidates = new Set(terms.flatMap((term) => Array.from(this.termDocs.get(term) ?? [])));
    const totalDocs = Math.max(1, this.documents.size);
    const scored: Array<{ score: number; document: SearchDocument }> = [];
    for (const id of Array.from(candidates)) {
      const document = this.documents.get(id);
      if (!document || document.organisation_id !== input.organisationId) continue;
      if (input.documentTypes && !input.documentTypes.has(document.document_type)) continue;
      const counts = this.termCounts.get(id)!;
      let score = 0;
      for (const term of terms) {
        const count = counts.get(term) ?? 0;
        if (count) score += count * Math.log(1 + totalDocs / Math.max(1, this.termDocs.get(term)?.size ?? 1));
      }
      if (score) scored.push({ score, document });
    }
    return scored
      .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title))
      .slice(0, input.limit ?? 20)
      .map(({ score, document }) => ({
        id: document.id,
        organisation_id: document.organisation_id,
        document_type: document.document_type,
        title: document.title,
        score: Number(score.toFixed(6)),
        metadata: document.metadata,
      }));
  }
}

function countTerms(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9_]{2,}/g) ?? [];
}
