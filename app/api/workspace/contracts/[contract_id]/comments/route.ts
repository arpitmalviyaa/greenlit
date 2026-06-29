import { NextResponse } from "next/server";
import { createContractComment, errorResponse, listContractComments } from "@/lib/engine/workspace/service";

export async function GET(_: Request, { params }: { params: Promise<{ contract_id: string }> }) {
  try {
    const { contract_id } = await params;
    return NextResponse.json(await listContractComments(contract_id));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ contract_id: string }> }) {
  try {
    const { contract_id } = await params;
    const body = await request.json();
    return NextResponse.json(await createContractComment({
      contractId: contract_id,
      body: String(body.body ?? ""),
      versionId: body.version_id ?? null,
      clauseId: body.clause_id ?? null,
    }), { status: 201 });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
