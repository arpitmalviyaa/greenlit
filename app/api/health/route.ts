import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "greenlit",
    timestamp: new Date().toISOString(),
  });
}
