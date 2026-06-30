import { NextResponse } from "next/server";
import { errorResponse, searchWorkspace } from "@/lib/engine/workspace/service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") ?? "";
    const entityType = url.searchParams.get("type");
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return NextResponse.json(await searchWorkspace(query, { entityType, limit }));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
