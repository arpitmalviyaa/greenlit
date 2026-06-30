import type {
  AutomationBundle,
  ContractVersionNode,
  ManagerWorkspaceData,
  CreatorWorkspaceData,
  UnifiedTimelineEvent,
  VersionGraph,
  WorkspaceSearchDocument,
} from "./model";

export function buildVersionGraph(contractId: string, versions: ContractVersionNode[]): VersionGraph {
  const ordered = [...versions].sort((a, b) => a.version_number - b.version_number || a.created_at.localeCompare(b.created_at));
  return {
    contract_id: contractId,
    versions: ordered,
    edges: ordered.slice(1).map((version, idx) => ({
      from_version_id: ordered[idx].id,
      to_version_id: version.id,
      kind: "successor",
    })),
    latest_version_id: ordered.at(-1)?.id ?? null,
  };
}

export function mergeTimelineEvents(input: {
  timeline?: Array<Record<string, unknown>>;
  evidenceTimeline?: Array<Record<string, unknown>>;
  auditLogs?: Array<Record<string, unknown>>;
}): UnifiedTimelineEvent[] {
  const events = [
    ...(input.timeline ?? []).map(normalizeTimeline),
    ...(input.evidenceTimeline ?? []).map(normalizeEvidenceTimeline),
    ...(input.auditLogs ?? []).map(normalizeAuditLog),
  ];
  return events.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

export function contractSearchDocument(input: {
  organisationId: string;
  contractId: string;
  title: string;
  rawText?: string | null;
  status?: string | null;
  riskScore?: number | null;
}): WorkspaceSearchDocument {
  return {
    organisation_id: input.organisationId,
    entity_type: "contracts",
    entity_id: input.contractId,
    title: input.title,
    body: [input.title, input.status, input.rawText].filter(Boolean).join("\n"),
    metadata: { status: input.status ?? null, risk_score: input.riskScore ?? null },
  };
}

export function clauseSearchDocument(input: {
  organisationId: string;
  clauseId: string;
  heading?: string | null;
  body: string;
  clauseType: string;
  riskCategory?: string | null;
}): WorkspaceSearchDocument {
  return {
    organisation_id: input.organisationId,
    entity_type: "clauses",
    entity_id: input.clauseId,
    title: input.heading || input.clauseType,
    body: input.body,
    metadata: { clause_type: input.clauseType, risk_category: input.riskCategory ?? null },
  };
}

export function reviewAutomationBundle(input: {
  organisationId: string;
  actorId?: string | null;
  contractId: string;
  contractTitle: string;
  action: string;
  summary: string;
  requestId?: string | null;
  correlationId?: string | null;
}): AutomationBundle {
  return {
    audit_log: {
      organisation_id: input.organisationId,
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: "contracts",
      entity_id: input.contractId,
      metadata: { summary: input.summary },
      request_id: input.requestId ?? null,
      correlation_id: input.correlationId ?? null,
    },
    timeline_event: {
      organisation_id: input.organisationId,
      contract_id: input.contractId,
      event_type: input.action,
      payload: { title: input.contractTitle, summary: input.summary },
    },
    search_document: contractSearchDocument({
      organisationId: input.organisationId,
      contractId: input.contractId,
      title: input.contractTitle,
      rawText: input.summary,
      status: input.action,
    }),
    background_job: {
      organisation_id: input.organisationId,
      kind: "search_indexing",
      payload: { entity_type: "contracts", entity_id: input.contractId },
      idempotency_key: `search:contracts:${input.contractId}`,
    },
    notification: {
      organisation_id: input.organisationId,
      profile_id: input.actorId ?? null,
      kind: "review_update",
      body: `${input.contractTitle}: ${input.summary}`,
    },
  };
}

export function creatorWorkspaceData(input: Partial<CreatorWorkspaceData>): CreatorWorkspaceData {
  return {
    contracts: input.contracts ?? [],
    brands: input.brands ?? [],
    negotiations: input.negotiations ?? [],
    templates: input.templates ?? [],
    clause_preferences: input.clause_preferences ?? [],
    saved_playbooks: input.saved_playbooks ?? [],
    review_history: input.review_history ?? [],
    notifications: input.notifications ?? [],
    recent_activity: input.recent_activity ?? [],
  };
}

export function managerWorkspaceData(input: Partial<ManagerWorkspaceData>): ManagerWorkspaceData {
  return {
    creators: input.creators ?? [],
    team: input.team ?? [],
    assignments: input.assignments ?? [],
    queues: input.queues ?? [],
    approvals: input.approvals ?? [],
    permissions: input.permissions ?? [],
    internal_review: input.internal_review ?? [],
    organisation_analytics: input.organisation_analytics ?? {},
    activity_feed: input.activity_feed ?? [],
    legal_review_queue: input.legal_review_queue ?? [],
  };
}

export function canReadWorkspace(role: string): boolean {
  return ["agency_admin", "creator", "manager", "brand"].includes(role);
}

export function canManageWorkspace(role: string): boolean {
  return ["agency_admin", "manager"].includes(role);
}

function normalizeTimeline(row: Record<string, unknown>): UnifiedTimelineEvent {
  return {
    id: String(row.id),
    source: "timeline",
    organisation_id: String(row.organisation_id),
    contract_id: nullableString(row.contract_id),
    event_type: String(row.event_type),
    title: titleFromPayload(row.payload) ?? String(row.event_type),
    description: descriptionFromPayload(row.payload),
    occurred_at: String(row.event_at ?? row.created_at),
    payload: record(row.payload),
  };
}

function normalizeEvidenceTimeline(row: Record<string, unknown>): UnifiedTimelineEvent {
  return {
    id: String(row.id),
    source: "evidence_timeline",
    organisation_id: String(row.organisation_id),
    sow_id: nullableString(row.sow_id),
    event_type: String(row.event_type),
    title: String(row.title ?? row.event_type),
    description: nullableString(row.description),
    actor_id: nullableString(row.actor_id),
    actor_name: nullableString(row.actor_name),
    occurred_at: String(row.occurred_at ?? row.created_at),
    reference_id: nullableString(row.reference_id),
    reference_table: nullableString(row.reference_table),
  };
}

function normalizeAuditLog(row: Record<string, unknown>): UnifiedTimelineEvent {
  return {
    id: String(row.id),
    source: "audit_logs",
    organisation_id: String(row.organisation_id),
    event_type: String(row.action),
    title: String(row.action),
    actor_id: nullableString(row.actor_id),
    occurred_at: String(row.created_at),
    reference_id: nullableString(row.entity_id),
    reference_table: nullableString(row.entity_type),
    payload: record(row.metadata),
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function titleFromPayload(value: unknown): string | null {
  const payload = record(value);
  return typeof payload.title === "string" ? payload.title : null;
}

function descriptionFromPayload(value: unknown): string | null {
  const payload = record(value);
  return typeof payload.summary === "string" ? payload.summary : null;
}
