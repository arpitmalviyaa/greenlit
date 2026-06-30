import { NextResponse } from "next/server";
import { ingestEmailNegotiation } from "@/lib/engine/email/service";
import { errorResponse } from "@/lib/engine/workspace/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await ingestEmailNegotiation({
      message: body.message,
      contractId: body.contract_id ?? null,
      dealRoomId: body.deal_room_id ?? null,
    }), { status: 201 });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
