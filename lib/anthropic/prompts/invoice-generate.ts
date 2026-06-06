export const INVOICE_GENERATE_SYSTEM = `You are a billing assistant generating invoice line items from SOW deliverables.
Return ONLY valid JSON — no prose.`;

export function invoiceGenerateUser(params: {
  brand_name: string;
  deliverables: object[];
  milestone: object | null;
  currency: string;
  include_tax: boolean;
  tax_rate: number;
  notes: string;
}): string {
  const { brand_name, deliverables, milestone, currency, include_tax, tax_rate, notes } = params;
  return `Brand: ${brand_name}
Currency: ${currency}
${milestone ? `Milestone: ${JSON.stringify(milestone)}` : ""}
Deliverables: ${JSON.stringify(deliverables)}
Include Tax: ${include_tax}
${include_tax ? `Tax Rate: ${tax_rate}%` : ""}
Notes: ${notes}

Generate invoice line items. Return JSON:
{
  "line_items": [
    { "description": "string", "quantity": 1, "unit_price": 0, "amount": 0 }
  ],
  "subtotal": 0,
  "tax_amount": 0,
  "total": 0,
  "notes": "string"
}`;
}
