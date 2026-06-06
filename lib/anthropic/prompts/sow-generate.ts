export const SOW_GENERATE_SYSTEM = `You are a senior entertainment and influencer marketing lawyer drafting a Statement of Work.
Generate a complete, enforceable SOW in JSON. Use jurisdiction-appropriate legal language.
Return ONLY valid JSON — no markdown, no prose outside JSON.`;

export function sowGenerateUser(params: {
  brand_name: string;
  creator_handle: string;
  platforms: string[];
  budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  jurisdiction: string;
  extracted: object;
  corpus_context: string;
}): string {
  const { brand_name, creator_handle, platforms, budget, currency, start_date, end_date, jurisdiction, extracted, corpus_context } = params;

  return `${corpus_context ? `LEGAL CORPUS CONTEXT:\n${corpus_context}\n\n` : ""}Generate a complete SOW JSON for:
Brand: ${brand_name}
Creator: ${creator_handle}
Platforms: ${platforms.join(", ")}
Budget: ${currency} ${budget}
Period: ${start_date} to ${end_date}
Jurisdiction: ${jurisdiction}

Extracted terms: ${JSON.stringify(extracted)}

Return JSON:
{
  "title": "string",
  "parties": {
    "brand": { "name": "string", "address": "string" },
    "creator": { "handle": "string", "legal_name": "[CREATOR_LEGAL_NAME]", "address": "[CREATOR_ADDRESS]" }
  },
  "scope": "string (2–3 sentence summary)",
  "deliverables": [
    { "title": "string", "platform": "string", "content_type": "string", "quantity": 1, "due_date": "YYYY-MM-DD", "value": 0 }
  ],
  "payment_milestones": [
    { "title": "string", "amount": 0, "due_date": "YYYY-MM-DD", "trigger_event": "string" }
  ],
  "exclusivity_clause": "string",
  "usage_rights": "string",
  "cancellation_terms": "string",
  "jurisdiction_clause": "string",
  "governing_law": "string",
  "dispute_resolution": "string",
  "special_conditions": ["string"]
}`;
}
