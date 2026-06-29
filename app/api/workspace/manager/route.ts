import { NextResponse } from "next/server";
import { errorResponse, getManagerWorkspace } from "@/lib/engine/workspace/service";

export async function GET() {
  try {
    return NextResponse.json(await getManagerWorkspace());
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
