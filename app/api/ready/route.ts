import { NextResponse } from "next/server";
import { productionConfigFromEnv, ConfigValidationError } from "@/lib/engine/infrastructure/config";

export function GET() {
  try {
    productionConfigFromEnv();
    return NextResponse.json({ ok: true, service: "greenlit" });
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return NextResponse.json({ ok: false, code: "CONFIGURATION_ERROR" }, { status: 503 });
    }
    throw error;
  }
}
