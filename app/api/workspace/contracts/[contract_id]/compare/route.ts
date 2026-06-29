import { NextResponse } from "next/server";
import { compareContractVersions, errorResponse } from "@/lib/engine/workspace/service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contract_id: string }> }
) {
  try {
    const { contract_id } = await params;
    const url = new URL(req.url);
    const previous = url.searchParams.get("previous_version_id");
    const current = url.searchParams.get("current_version_id");
    if (!previous || !current) {
      return NextResponse.json({ error: "previous_version_id and current_version_id are required" }, { status: 400 });
    }
    return NextResponse.json(await compareContractVersions(contract_id, previous, current));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
