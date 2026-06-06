import { createServiceClient } from "@/lib/supabase/server";

export async function getNextInvoiceNumber(organisation_id: string): Promise<string> {
  const service = await createServiceClient();
  const year = new Date().getFullYear();

  const { count } = await service
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisation_id)
    .like("invoice_number", `INV-${year}-%`);

  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `INV-${year}-${seq}`;
}
