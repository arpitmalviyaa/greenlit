import { NextResponse } from "next/server";
import { errorResponse, getCreatorWorkspace } from "@/lib/engine/workspace/service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return NextResponse.json(await getCreatorWorkspace({
      status: url.searchParams.get("status"),
      sort: url.searchParams.get("sort"),
      archived: url.searchParams.get("archived") === "true",
    }));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
