import { NextResponse } from "next/server";
import { errorResponse, listNotifications } from "@/lib/engine/workspace/service";

export async function GET(req: Request) {
  try {
    const unreadOnly = new URL(req.url).searchParams.get("unread") === "true";
    return NextResponse.json(await listNotifications({ unreadOnly }));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
