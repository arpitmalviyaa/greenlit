import { NextResponse } from "next/server";
import { errorResponse, getUnifiedTimeline } from "@/lib/engine/workspace/service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return NextResponse.json(await getUnifiedTimeline({
      contractId: url.searchParams.get("contract_id"),
      sowId: url.searchParams.get("sow_id"),
      includeAudit: url.searchParams.get("include_audit") === "true",
    }));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
