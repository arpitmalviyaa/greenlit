import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json() as { name?: string; account_type?: string; jurisdiction_codes?: string[] };
  const { name, account_type, jurisdiction_codes } = body;

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Workspace name must be at least 2 characters" }, { status: 400 });
  }

  // Map the account-type choice to a role + its dashboard.
  const ROLE_MAP: Record<string, { role: string; redirect: string }> = {
    agency: { role: "agency_admin", redirect: "/agency" },
    manager: { role: "manager", redirect: "/manager" },
    creator: { role: "creator", redirect: "/creator" },
    brand: { role: "brand", redirect: "/brand" },
  };
  const mapped = ROLE_MAP[account_type ?? "agency"] ?? ROLE_MAP.agency;

  // Use service role to bypass RLS for org creation (user has no org yet)
  const serviceSupabase = await createServiceClient();

  const baseSlug = slugify(name.trim());
  let slug = baseSlug;
  let attempt = 0;

  // Ensure slug uniqueness
  while (true) {
    const { data: existing } = await serviceSupabase
      .from("organisations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Create organisation
  const { data: org, error: orgError } = await serviceSupabase
    .from("organisations")
    .insert({ name: name.trim(), slug })
    .select()
    .single();

  if (orgError || !org) {
    return internalError("app/api/org/create/route.ts", { message: orgError?.message ?? null });
  }

  // Link profile to org, set the chosen role, mark onboarding done
  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .update({ organisation_id: org.id, role: mapped.role, onboarding_done: true })
    .eq("id", user.id);

  if (profileError) {
    // Rollback org if profile update fails
    await serviceSupabase.from("organisations").delete().eq("id", org.id);
    return internalError("app/api/org/create/route.ts", { message: profileError.message });
  }

  // Insert jurisdictions — IN always included regardless of what is passed
  const codes = Array.from(new Set(["IN", ...(jurisdiction_codes ?? [])]));
  for (const code of codes) {
    try {
      await serviceSupabase
        .from("organisation_jurisdictions")
        .insert({ organisation_id: org.id, jurisdiction_code: code, status: "active" });
    } catch {
      // ignore duplicates silently
    }
  }

  return NextResponse.json({ organisation: org, redirect: mapped.redirect }, { status: 201 });
}
