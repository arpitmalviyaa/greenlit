export type WorkspaceRole = "agency_admin" | "creator" | "manager" | "brand";

export interface WorkspaceProfile {
  id: string;
  organisation_id: string;
  role: WorkspaceRole;
  name?: string | null;
  email?: string | null;
}

export interface ContractVersionNode {
  id: string;
  contract_id: string;
  version_number: number;
  storage_path: string;
  content_sha256: string;
  compatibility_status: string;
  created_at: string;
  created_by?: string | null;
}

export interface VersionGraph {
  contract_id: string;
  versions: ContractVersionNode[];
  edges: Array<{ from_version_id: string; to_version_id: string; kind: "successor" }>;
  latest_version_id: string | null;
}

export interface UnifiedTimelineEvent {
  id: string;
  source: "timeline" | "evidence_timeline" | "audit_logs";
  organisation_id: string;
  contract_id?: string | null;
  sow_id?: string | null;
  event_type: string;
  title: string;
  description?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  occurred_at: string;
  reference_id?: string | null;
  reference_table?: string | null;
  payload?: Record<string, unknown>;
}

export interface WorkspaceSearchDocument {
  organisation_id: string;
  entity_type: "contracts" | "brands" | "creators" | "clauses" | "comments" | "versions";
  entity_id: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

export interface AutomationBundle {
  audit_log: {
    organisation_id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    request_id?: string | null;
    correlation_id?: string | null;
  };
  timeline_event: {
    organisation_id: string;
    contract_id?: string | null;
    event_type: string;
    payload: Record<string, unknown>;
  };
  search_document?: WorkspaceSearchDocument;
  background_job?: {
    organisation_id: string;
    kind: string;
    payload: Record<string, unknown>;
    idempotency_key?: string | null;
  };
  notification?: {
    organisation_id: string;
    profile_id?: string | null;
    kind: string;
    body: string;
  };
}

export interface CreatorWorkspaceData {
  contracts: unknown[];
  brands: unknown[];
  negotiations: unknown[];
  templates: unknown[];
  clause_preferences: unknown[];
  saved_playbooks: unknown[];
  review_history: unknown[];
  notifications: unknown[];
  recent_activity: UnifiedTimelineEvent[];
}

export interface ManagerWorkspaceData {
  creators: unknown[];
  team: unknown[];
  assignments: unknown[];
  queues: unknown[];
  approvals: unknown[];
  permissions: string[];
  internal_review: unknown[];
  organisation_analytics: Record<string, number>;
  activity_feed: UnifiedTimelineEvent[];
  legal_review_queue: unknown[];
}
