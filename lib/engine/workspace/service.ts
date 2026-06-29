import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import {
  buildVersionGraph,
  canManageWorkspace,
  canReadWorkspace,
  creatorWorkspaceData,
  managerWorkspaceData,
  mergeTimelineEvents,
  reviewAutomationBundle,
} from "./core";
import type { ContractVersionNode, WorkspaceProfile } from "./model";

type SupabaseAny = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  from: (table: string) => any;
};

export async function requireWorkspaceProfile(required: "read" | "manage" = "read"): Promise<{ supabase: SupabaseAny; service: SupabaseAny; profile: WorkspaceProfile }> {
  const supabase = await createClient() as SupabaseAny;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw workspaceError("Unauthorized", 401);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organisation_id, role, name, email")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) throw workspaceError("No organisation", 403);
  if (required === "read" && !canReadWorkspace(profile.role)) throw workspaceError("Insufficient permissions", 403);
  if (required === "manage" && !canManageWorkspace(profile.role)) throw workspaceError("Insufficient permissions", 403);
  return { supabase, service: await createServiceClient() as SupabaseAny, profile };
}

export async function searchWorkspace(query: string, options: { entityType?: string | null; limit?: number } = {}) {
  const { supabase, profile } = await requireWorkspaceProfile("read");
  if (!query.trim()) throw workspaceError("query is required", 400);
  let builder = supabase
    .from("search_index")
    .select("id, entity_type, entity_id, title, body, metadata, updated_at")
    .eq("organisation_id", profile.organisation_id)
    .is("deleted_at", null)
    .or(`title.ilike.%${escapeIlike(query)}%,body.ilike.%${escapeIlike(query)}%`)
    .order("updated_at", { ascending: false })
    .limit(Math.min(Math.max(options.limit ?? 20, 1), 50));
  if (options.entityType) builder = builder.eq("entity_type", options.entityType);
  const { data, error } = await builder;
  if (error) throw workspaceError(error.message, 500);
  return { results: data ?? [] };
}

export async function listNotifications(options: { unreadOnly?: boolean } = {}) {
  const { supabase, profile } = await requireWorkspaceProfile("read");
  let builder = supabase
    .from("notifications")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .or(`profile_id.is.null,profile_id.eq.${profile.id}`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (options.unreadOnly) builder = builder.is("read_at", null);
  const { data, error } = await builder;
  if (error) throw workspaceError(error.message, 500);
  return { notifications: data ?? [] };
}

export async function markNotificationRead(notificationId: string) {
  const { service, profile } = await requireWorkspaceProfile("read");
  const { data, error } = await service
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("organisation_id", profile.organisation_id)
    .select()
    .single();
  if (error) throw workspaceError(error.message, 500);
  return { notification: data };
}

export async function listContractComments(contractId: string) {
  assertUuid(contractId, "contract_id");
  const { supabase, profile } = await requireWorkspaceProfile("read");
  await requireOrgContract(supabase, profile.organisation_id, contractId);
  const { data, error } = await supabase
    .from("contract_comments")
    .select("id, contract_id, version_id, clause_id, author_id, body, status, created_at")
    .eq("organisation_id", profile.organisation_id)
    .eq("contract_id", contractId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw workspaceError(error.message, 500);
  return { comments: data ?? [] };
}

export async function createContractComment(input: { contractId: string; body: string; versionId?: string | null; clauseId?: string | null }) {
  assertUuid(input.contractId, "contract_id");
  if (input.versionId) assertUuid(input.versionId, "version_id");
  if (input.clauseId) assertUuid(input.clauseId, "clause_id");
  const body = input.body.trim();
  if (!body) throw workspaceError("body is required", 400);
  if (body.length > 5000) throw workspaceError("body must be 5000 characters or fewer", 400);
  const { service, profile } = await requireWorkspaceProfile("read");
  await requireOrgContract(service, profile.organisation_id, input.contractId);
  const { data, error } = await service
    .from("contract_comments")
    .insert({
      organisation_id: profile.organisation_id,
      contract_id: input.contractId,
      version_id: input.versionId ?? null,
      clause_id: input.clauseId ?? null,
      author_id: profile.id,
      body,
      status: "open",
    })
    .select("id, contract_id, version_id, clause_id, author_id, body, status, created_at")
    .single();
  if (error) throw workspaceError(error.message, 500);
  return { comment: data };
}

export async function getUnifiedTimeline(input: { contractId?: string | null; sowId?: string | null; includeAudit?: boolean }) {
  const { supabase, profile } = await requireWorkspaceProfile("read");
  const [timeline, evidenceTimeline, auditLogs] = await Promise.all([
    input.contractId
      ? supabase.from("timeline").select("*").eq("organisation_id", profile.organisation_id).eq("contract_id", input.contractId).is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    input.sowId
      ? supabase.from("evidence_timeline").select("*").eq("organisation_id", profile.organisation_id).eq("sow_id", input.sowId)
      : Promise.resolve({ data: [], error: null }),
    input.includeAudit
      ? supabase.from("audit_logs").select("*").eq("organisation_id", profile.organisation_id).order("created_at", { ascending: true }).limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const firstError = timeline.error ?? evidenceTimeline.error ?? auditLogs.error;
  if (firstError) throw workspaceError(firstError.message, 500);
  return { events: mergeTimelineEvents({ timeline: timeline.data ?? [], evidenceTimeline: evidenceTimeline.data ?? [], auditLogs: auditLogs.data ?? [] }) };
}

export async function getContractVersionGraph(contractId: string) {
  const { supabase, profile } = await requireWorkspaceProfile("read");
  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("organisation_id", profile.organisation_id)
    .single();
  if (!contract) throw workspaceError("Contract not found", 404);
  const { data, error } = await supabase
    .from("contract_versions")
    .select("id, contract_id, version_number, storage_path, content_sha256, compatibility_status, created_at, created_by")
    .eq("organisation_id", profile.organisation_id)
    .eq("contract_id", contractId)
    .is("deleted_at", null)
    .order("version_number", { ascending: true });
  if (error) throw workspaceError(error.message, 500);
  return { graph: buildVersionGraph(contractId, (data ?? []) as ContractVersionNode[]) };
}

export async function compareContractVersions(contractId: string, previousVersionId: string, currentVersionId: string) {
  const { supabase, profile } = await requireWorkspaceProfile("read");
  const { data, error } = await supabase
    .from("contract_revisions")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .eq("contract_id", contractId)
    .eq("previous_version_id", previousVersionId)
    .eq("current_version_id", currentVersionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw workspaceError(error.message, 500);
  return { comparison: data?.[0] ?? null };
}

export async function getCreatorWorkspace(options: { status?: string | null; archived?: boolean; sort?: string | null } = {}) {
  const { supabase, profile } = await requireWorkspaceProfile("read");
  let contractQuery = supabase
    .from("contracts")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order(sortColumn(options.sort), { ascending: options.sort === "title" })
    .limit(50);
  if (options.archived) contractQuery = contractQuery.not("archived_at", "is", null);
  else contractQuery = contractQuery.is("archived_at", null).is("deleted_at", null);
  if (options.status) contractQuery = contractQuery.eq("status", options.status);
  const [contracts, brands, negotiations, templates, playbooks, notifications, timeline] = await Promise.all([
    contractQuery,
    supabase.from("brands").select("*").eq("organisation_id", profile.organisation_id).is("deleted_at", null).order("name"),
    supabase.from("deal_rooms").select("*").eq("organisation_id", profile.organisation_id).order("created_at", { ascending: false }).limit(50),
    supabase.from("clause_library").select("*").eq("organisation_id", profile.organisation_id).order("created_at", { ascending: false }).limit(50),
    supabase.from("playbook_entries").select("*").eq("organisation_id", profile.organisation_id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("notifications").select("*").eq("organisation_id", profile.organisation_id).or(`profile_id.is.null,profile_id.eq.${profile.id}`).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
    supabase.from("timeline").select("*").eq("organisation_id", profile.organisation_id).is("deleted_at", null).order("event_at", { ascending: false }).limit(20),
  ]);
  const [preferences, memory] = await Promise.all([
    supabase.from("creator_clause_preferences").select("*").eq("organisation_id", profile.organisation_id).or(`profile_id.is.null,profile_id.eq.${profile.id}`).is("deleted_at", null).order("priority", { ascending: false }),
    supabase.from("negotiation_memory").select("*").eq("organisation_id", profile.organisation_id).or(`profile_id.is.null,profile_id.eq.${profile.id}`).is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
  ]);
  assertNoErrors([contracts, brands, negotiations, templates, playbooks, notifications, timeline, preferences, memory]);
  return {
    workspace: creatorWorkspaceData({
      contracts: contracts.data ?? [],
      brands: brands.data ?? [],
      negotiations: [...(negotiations.data ?? []), ...(memory.data ?? [])],
      templates: templates.data ?? [],
      clause_preferences: preferences.data ?? [],
      saved_playbooks: playbooks.data ?? [],
      review_history: contracts.data ?? [],
      notifications: notifications.data ?? [],
      recent_activity: mergeTimelineEvents({ timeline: timeline.data ?? [] }),
    }),
  };
}

export async function getManagerWorkspace() {
  const { supabase, profile } = await requireWorkspaceProfile("manage");
  const [creators, team, assignments, queues, approvals, reviews, timeline, metrics] = await Promise.all([
    supabase.from("creators").select("*").eq("organisation_id", profile.organisation_id).order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, name, email, role, onboarding_done").eq("organisation_id", profile.organisation_id).is("deleted_at", null).order("name"),
    supabase.from("workspace_assignments").select("*").eq("organisation_id", profile.organisation_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(100),
    supabase.from("background_jobs").select("*").eq("organisation_id", profile.organisation_id).is("deleted_at", null).order("run_at", { ascending: true }).limit(100),
    supabase.from("approval_requests").select("*").eq("organisation_id", profile.organisation_id).order("created_at", { ascending: false }).limit(100),
    supabase.from("contract_reviews").select("*").eq("organisation_id", profile.organisation_id).in("status", ["queued", "running"]).is("deleted_at", null).order("created_at", { ascending: true }).limit(100),
    supabase.from("timeline").select("*").eq("organisation_id", profile.organisation_id).is("deleted_at", null).order("event_at", { ascending: false }).limit(50),
    supabase.from("review_metrics").select("*").eq("organisation_id", profile.organisation_id).order("metric_date", { ascending: false }).limit(100),
  ]);
  assertNoErrors([creators, team, assignments, queues, approvals, reviews, timeline, metrics]);
  return {
    workspace: managerWorkspaceData({
      creators: creators.data ?? [],
      team: team.data ?? [],
      assignments: assignments.data ?? [],
      queues: queues.data ?? [],
      approvals: approvals.data ?? [],
      permissions: ["contract:read", "contract:write", "review:create", "assignment:manage"],
      internal_review: reviews.data ?? [],
      organisation_analytics: {
        creators: creators.data?.length ?? 0,
        team: team.data?.length ?? 0,
        pending_jobs: (queues.data ?? []).filter((job: { status: string }) => job.status === "queued").length,
        pending_approvals: (approvals.data ?? []).filter((approval: { status: string }) => approval.status === "pending").length,
        reviews_completed: (metrics.data ?? []).reduce((sum: number, metric: { reviews_completed?: number }) => sum + (metric.reviews_completed ?? 0), 0),
      },
      activity_feed: mergeTimelineEvents({ timeline: timeline.data ?? [] }),
      legal_review_queue: reviews.data ?? [],
    }),
  };
}

export async function setContractArchived(contractId: string, archived: boolean) {
  const { service, profile } = await requireWorkspaceProfile("manage");
  const patch = archived
    ? { archived_at: new Date().toISOString(), archived_by: profile.id }
    : { archived_at: null, archived_by: null };
  const { data, error } = await service
    .from("contracts")
    .update(patch)
    .eq("id", contractId)
    .eq("organisation_id", profile.organisation_id)
    .select("id, archived_at")
    .single();
  if (error) throw workspaceError(error.message, 500);
  await persistReviewAutomation({
    organisationId: profile.organisation_id,
    actorId: profile.id,
    contractId,
    contractTitle: `Contract ${contractId}`,
    action: archived ? "contract_archived" : "contract_restored",
    summary: archived ? "Contract archived" : "Contract restored",
  });
  return { contract: data };
}

export async function persistReviewAutomation(input: { organisationId: string; actorId?: string | null; contractId: string; contractTitle: string; action: string; summary: string }) {
  const service = await createServiceClient() as SupabaseAny;
  const bundle = reviewAutomationBundle(input);
  await Promise.all([
    service.from("audit_logs").insert(bundle.audit_log),
    service.from("timeline").insert(bundle.timeline_event),
    bundle.search_document ? service.from("search_index").upsert(bundle.search_document, { onConflict: "organisation_id,entity_type,entity_id" }) : Promise.resolve(),
    bundle.background_job ? service.from("background_jobs").insert(bundle.background_job) : Promise.resolve(),
    bundle.notification ? service.from("notifications").insert(bundle.notification) : Promise.resolve(),
  ]);
  return bundle;
}

export function workspaceError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export function errorResponse(error: unknown) {
  const err = error as { message?: string; status?: number };
  const status = err.status ?? 500;
  if (status >= 500) {
    const errorId = randomUUID();
    console.error("workspace_request_failed", {
      error_id: errorId,
      message: err.message ?? "Workspace request failed",
    });
    return { error: "Internal server error", status, error_id: errorId };
  }
  return { error: err.message ?? "Workspace request failed", status };
}

function assertNoErrors(results: Array<{ error?: { message: string } | null }>) {
  const error = results.find((result) => result.error)?.error;
  if (error) throw workspaceError(error.message, 500);
}

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, " ");
}

function sortColumn(value?: string | null) {
  if (value === "title") return "title";
  if (value === "created_at") return "created_at";
  return "updated_at";
}

async function requireOrgContract(client: SupabaseAny, organisationId: string, contractId: string) {
  const { data, error } = await client
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("organisation_id", organisationId)
    .single();
  if (error || !data) throw workspaceError("Contract not found", 404);
}

function assertUuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw workspaceError(`${field} must be a UUID`, 400);
  }
}
