import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";
import { INVOICE_GENERATE_SYSTEM, invoiceGenerateUser } from "@/lib/anthropic/prompts/invoice-generate";
import { getNextInvoiceNumber } from "@/lib/utils/invoice-number";

function safeParse<T>(text: string): T | null {
  try { return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) as T; }
  catch { return null; }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("organisation_id, role").eq("id", user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  if (profile.role !== "agency_admin") return NextResponse.json({ error: "agency_admin only" }, { status: 403 });

  const body = await req.json() as {
    sow_id: string;
    milestone_id?: string;
    include_tax: boolean;
    tax_rate?: number;
    notes?: string;
  };
  const { sow_id, milestone_id, include_tax = false, tax_rate = 0, notes = "" } = body;
  if (!sow_id) return NextResponse.json({ error: "sow_id required" }, { status: 400 });

  const { data: sow } = await supabase
    .from("sows")
    .select("id, brand_name, currency, sow_deliverables(*), sow_payment_milestones(*)")
    .eq("id", sow_id)
    .eq("organisation_id", profile.organisation_id)
    .single();
  if (!sow) return NextResponse.json({ error: "SOW not found" }, { status: 404 });

  const milestone = milestone_id
    ? (sow.sow_payment_milestones as Array<{ id: string; title: string; amount: number }>).find((m) => m.id === milestone_id) ?? null
    : null;

  const ai = getAnthropicClient();
  const res = await ai.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 600,
    system: INVOICE_GENERATE_SYSTEM,
    messages: [{
      role: "user",
      content: invoiceGenerateUser({
        brand_name: sow.brand_name,
        deliverables: (sow.sow_deliverables as object[]) ?? [],
        milestone: milestone as object | null,
        currency: sow.currency ?? "INR",
        include_tax,
        tax_rate: include_tax ? (tax_rate ?? 18) : 0,
        notes,
      }),
    }],
  });

  const generated = safeParse<{
    line_items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
    subtotal: number; tax_amount: number; total: number; notes: string;
  }>(res.content[0].type === "text" ? res.content[0].text : "{}") ?? {
    line_items: [], subtotal: milestone?.amount ?? 0, tax_amount: 0, total: milestone?.amount ?? 0, notes,
  };

  const invoice_number = await getNextInvoiceNumber(profile.organisation_id);
  const service = await createServiceClient();

  const { data, error } = await service
    .from("invoices")
    .insert({
      organisation_id: profile.organisation_id,
      sow_id,
      milestone_id: milestone_id ?? null,
      invoice_number,
      brand_name: sow.brand_name,
      amount: generated.subtotal,
      currency: sow.currency ?? "INR",
      tax_amount: generated.tax_amount,
      total_amount: generated.total,
      status: "draft",
      line_items_json: generated.line_items as never,
      notes: generated.notes || notes || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
