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

  const body = await request.json() as { name?: string; jurisdiction_codes?: string[] };
  const { name, jurisdiction_codes } = body;

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Organisation name must be at least 2 characters" }, { status: 400 });
  }

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

  // Link profile to org and mark onboarding done
  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .update({ organisation_id: org.id, onboarding_done: true })
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

  return NextResponse.json({ organisation: org }, { status: 201 });
}
