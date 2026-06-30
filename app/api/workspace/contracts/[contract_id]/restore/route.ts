import { NextResponse } from "next/server";
import { errorResponse, setContractArchived } from "@/lib/engine/workspace/service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ contract_id: string }> }
) {
  try {
    const { contract_id } = await params;
    return NextResponse.json(await setContractArchived(contract_id, false));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
