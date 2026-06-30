import { NextResponse } from "next/server";
import { errorResponse, getContractVersionGraph } from "@/lib/engine/workspace/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contract_id: string }> }
) {
  try {
    const { contract_id } = await params;
    return NextResponse.json(await getContractVersionGraph(contract_id));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
