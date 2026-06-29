import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export function internalError(operation: string, details?: { requestId?: string | null; message?: string | null }) {
  const errorId = randomUUID();
  console.error(operation, {
    error_id: errorId,
    request_id: details?.requestId ?? null,
    message: details?.message ?? "internal error",
  });
  return NextResponse.json({ error: "Internal server error", error_id: errorId }, { status: 500 });
}
