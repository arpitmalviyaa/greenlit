import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { FLAGS } from "@/lib/flags";

// Pages hidden behind feature flags (FEATURE_FLAGS.md). Backend API routes
// stay live; only the page URLs redirect while a flag is off.
const FLAGGED_PATHS: Array<[string, boolean]> = [
  ["/agency/send-scanner", FLAGS.sendScanner],
  ["/agency/term-sheets", FLAGS.termSheets],
  ["/agency/scope", FLAGS.scopeMonitor],
  ["/agency/meeting", FLAGS.meetingCounsel],
  ["/agency/delivery", FLAGS.delivery],
  ["/agency/timeline", FLAGS.timeline],
  ["/agency/playbook", FLAGS.legalPlaybook],
  ["/agency/cross-reference", FLAGS.crossReference],
];

// Old URLs folded into the merged Contracts page
const CONTRACT_REDIRECTS = ["/agency/counsel", "/agency/nda-scanner"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (CONTRACT_REDIRECTS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/agency/contracts", request.url));
  }
  for (const [path, enabled] of FLAGGED_PATHS) {
    if (!enabled && (pathname === path || pathname.startsWith(path + "/"))) {
      return NextResponse.redirect(new URL("/agency", request.url));
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:html|svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
