import { NextResponse } from "next/server";
import { errorResponse, markNotificationRead } from "@/lib/engine/workspace/service";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { notification_id?: string };
    if (!body.notification_id) return NextResponse.json({ error: "notification_id is required" }, { status: 400 });
    return NextResponse.json(await markNotificationRead(body.notification_id));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json({ error: response.error, error_id: response.error_id }, { status: response.status });
  }
}
