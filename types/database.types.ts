// Hand-authored for Session 1. Regenerate with:
//   supabase gen types typescript --local > types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "agency_admin" | "creator" | "manager" | "brand";
export type JurisdictionStatus = "active" | "pending" | "coming_soon";
export type CorpusContentType = "statute" | "judgment" | "regulation" | "news";
export type PlanTier = "starter" | "growth" | "enterprise";
export type ContractStatus = "pending_review" | "reviewed" | "signed" | "expired";
export type CampaignStatus = "draft" | "active" | "delivered" | "disputed" | "closed";
export type ApprovalType = "script" | "caption" | "video" | "claim" | "deliverable" | "change_request";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ScopeItemStatus = "in_scope" | "out_of_scope" | "disputed";
export type EvidenceType = "contract" | "approval" | "email" | "whatsapp" | "voice_note" | "screenshot";
export type ExclusivityStatus = "active" | "expired" | "disputed";
export type ContentType = "script" | "caption" | "video" | "reel" | "ad" | "podcast" | "carousel";
export type ScanVerdict = "greenlit" | "caution" | "blocked";
export type NoticeUrgency = "low" | "medium" | "high" | "critical";
export type ScanTypeAdvanced =
  | "defamation_heatmap"
  | "brand_compare"
  | "platform_scan"
  | "regulated"
  | "dark_patterns";

// ── Session 6 result shape interfaces ────────────────────────────────────────
export interface DefamationSpanResult {
  text: string;
  start: number;
  end: number;
  risk: "high" | "medium" | "low";
  reason: string;
}
export interface DefamationHeatmapResultShape { spans: DefamationSpanResult[] }

export interface BrandCompareResultShape {
  verdict: "safe" | "caution" | "risk";
  issues: string[];
  suggestions: string[];
}

export interface PlatformResultShape {
  platform: string;
  verdict: "safe" | "caution" | "risk";
  flags: string[];
}
export interface PlatformScanResultShape { results: PlatformResultShape[] }

export interface RegulatedIssueShape {
  rule: string;
  severity: "high" | "medium" | "low";
  excerpt: string;
}
export interface RegulatedScanResultShape {
  compliant: boolean;
  issues: RegulatedIssueShape[];
  required_disclosures: string[];
}

export interface DarkPatternShape {
  type: string;
  excerpt: string;
  explanation: string;
  severity: "high" | "medium" | "low";
}
export interface DarkPatternsResultShape { patterns: DarkPatternShape[] }

// ── Session 7 enums ───────────────────────────────────────────────────────────
export type ClaimCategory = "performance" | "health" | "financial" | "environmental" | "comparative" | "testimonial" | "other";
export type ClaimVerdict = "substantiated" | "unsubstantiated" | "needs_evidence" | "misleading";
export type ClaimEvidenceType = "study" | "certification" | "test_result" | "regulatory_approval" | "screenshot" | "other";
export type ClaimAuditAction = "created" | "evidence_added" | "verdict_updated" | "archived";

// ── Session 8 enums ───────────────────────────────────────────────────────────
export type SowCategory = "influencer_campaign" | "brand_deal" | "content_production" | "ambassador" | "event" | "other";
export type SowStatus = "draft" | "sent" | "negotiating" | "signed" | "cancelled";
export type DeliverablePlatform = "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok" | "offline" | "other";
export type DeliverableContentType = "post" | "reel" | "story" | "video" | "blog" | "podcast" | "other";
export type DeliverableStatus = "pending" | "in_progress" | "submitted" | "approved" | "rejected";
export type MilestoneStatus = "pending" | "invoiced" | "paid";

// ── Session 9 enums ───────────────────────────────────────────────────────────
export type ChangeType = "add_deliverable" | "modify_deliverable" | "remove_deliverable" | "extend_timeline" | "increase_budget" | "platform_change" | "other";
export type ChangeStatus = "pending" | "approved" | "rejected" | "negotiating";
export type AlertType = "deliverable_overdue" | "budget_exceeded" | "timeline_drift" | "unapproved_change" | "exclusivity_breach";
export type AlertSeverity = "high" | "medium" | "low";

// ── Session 10 enums ──────────────────────────────────────────────────────────
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type LockStatus = "pending" | "complete" | "disputed";

// ─── Table row / insert / update types ───────────────────────────────────────

interface OrganisationRow {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}
interface OrganisationInsert {
  id?: string;
  name: string;
  slug: string;
  plan?: PlanTier;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ProfileRow {
  id: string;
  organisation_id: string | null;
  role: UserRole;
  name: string;
  email: string;
  avatar_url: string | null;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}
interface ProfileInsert {
  id: string;
  organisation_id?: string | null;
  role: UserRole;
  name: string;
  email: string;
  avatar_url?: string | null;
  onboarding_done?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ContractRow {
  id: string;
  organisation_id: string;
  title: string;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  raw_text: string | null;
  uploaded_by: string;
  status: ContractStatus;
  risk_score: number | null;
  analysis_json: Json | null;
  jurisdiction: string;
  created_at: string;
  updated_at: string;
}
interface ContractInsert {
  id?: string;
  organisation_id: string;
  title: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  raw_text?: string | null;
  uploaded_by: string;
  status?: ContractStatus;
  risk_score?: number | null;
  analysis_json?: Json | null;
}

interface CampaignRow {
  id: string;
  organisation_id: string;
  title: string;
  brand_name: string;
  creator_id: string | null;
  manager_id: string | null;
  status: CampaignStatus;
  risk_score: number | null;
  contract_id: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_inr: number | null;
  created_at: string;
  updated_at: string;
}
interface CampaignInsert {
  id?: string;
  organisation_id: string;
  title: string;
  brand_name: string;
  creator_id?: string | null;
  manager_id?: string | null;
  status?: CampaignStatus;
  risk_score?: number | null;
  contract_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget_inr?: number | null;
}

interface CreatorRow {
  id: string;
  organisation_id: string;
  profile_id: string;
  rate_card_json: Json | null;
  exclusivity_log_json: Json | null;
  risk_score: number | null;
  brand_safety_rating: number | null;
  active_deals_count: number;
  created_at: string;
  updated_at: string;
}
interface CreatorInsert {
  id?: string;
  organisation_id: string;
  profile_id: string;
  rate_card_json?: Json | null;
  exclusivity_log_json?: Json | null;
  risk_score?: number | null;
  brand_safety_rating?: number | null;
  active_deals_count?: number;
}

interface ScopeItemRow {
  id: string;
  sow_id: string;
  description: string;
  status: ScopeItemStatus;
  flagged_at: string | null;
  flagged_by: string | null;
  change_request_id: string | null;
  created_at: string;
}
interface ScopeItemInsert {
  id?: string;
  sow_id: string;
  description: string;
  status?: ScopeItemStatus;
  flagged_at?: string | null;
  flagged_by?: string | null;
  change_request_id?: string | null;
}

interface ApprovalRow {
  id: string;
  organisation_id: string;
  campaign_id: string | null;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  content_url: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  evidence_url: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
}
interface ApprovalInsert {
  id?: string;
  organisation_id: string;
  campaign_id?: string | null;
  type: ApprovalType;
  status?: ApprovalStatus;
  title: string;
  content_url?: string | null;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  evidence_url?: string | null;
  requested_by?: string | null;
}

interface EvidenceRow {
  id: string;
  organisation_id: string;
  campaign_id: string | null;
  type: EvidenceType;
  file_url: string;
  file_hash: string | null;
  title: string | null;
  description: string | null;
  metadata_json: Json | null;
  uploaded_by: string;
  created_at: string;
}
interface EvidenceInsert {
  id?: string;
  organisation_id: string;
  campaign_id?: string | null;
  type: EvidenceType;
  file_url: string;
  file_hash?: string | null;
  title?: string | null;
  description?: string | null;
  metadata_json?: Json | null;
  uploaded_by: string;
}

interface ContentScanRow {
  id: string;
  organisation_id: string;
  campaign_id: string | null;
  content_type: ContentType;
  raw_content: string | null;
  content_url: string | null;
  scan_result_json: Json | null;
  risk_score: number | null;
  verdict: ScanVerdict | null;
  checker_ids_run: string[];
  top_issues_json: Json;
  requires_lawyer: boolean;
  jurisdiction: string;
  created_by: string;
  created_at: string;
}
interface ContentScanInsert {
  id?: string;
  organisation_id: string;
  campaign_id?: string | null;
  content_type: ContentType;
  raw_content?: string | null;
  content_url?: string | null;
  scan_result_json?: Json | null;
  risk_score?: number | null;
  verdict?: ScanVerdict | null;
  checker_ids_run?: string[];
  top_issues_json?: Json;
  requires_lawyer?: boolean;
  jurisdiction?: string;
  created_by: string;
}

interface LegalNoticeRow {
  id: string;
  organisation_id: string;
  file_url: string | null;
  analysis_json: Json | null;
  urgency: NoticeUrgency | null;
  deadline: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}
interface LegalNoticeInsert {
  id?: string;
  organisation_id: string;
  file_url?: string | null;
  analysis_json?: Json | null;
  urgency?: NoticeUrgency | null;
  deadline?: string | null;
  resolved?: boolean;
}

interface IpRecordRow {
  id: string;
  organisation_id: string;
  asset_type: string;
  asset_url: string | null;
  registration_details_json: Json | null;
  evidence_vault_id: string | null;
  created_at: string;
}
interface IpRecordInsert {
  id?: string;
  organisation_id: string;
  asset_type: string;
  asset_url?: string | null;
  registration_details_json?: Json | null;
  evidence_vault_id?: string | null;
}

interface InvitationRow {
  id: string;
  organisation_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}
interface InvitationInsert {
  id?: string;
  organisation_id: string;
  email: string;
  role: UserRole;
  token?: string;
  invited_by: string;
  accepted_at?: string | null;
  expires_at?: string;
}


interface OrganisationJurisdictionRow {
  id: string;
  organisation_id: string;
  jurisdiction_code: string;
  status: JurisdictionStatus;
  activated_at: string | null;
  created_at: string;
}
interface OrganisationJurisdictionInsert {
  id?: string;
  organisation_id: string;
  jurisdiction_code: string;
  status?: JurisdictionStatus;
  activated_at?: string | null;
  created_at?: string;
}

interface ContentAdvancedScanRow {
  id: string;
  organisation_id: string;
  scan_type: ScanTypeAdvanced;
  input_json: Json;
  result_json: Json;
  jurisdiction: string;
  created_by: string;
  created_at: string;
}
interface ContentAdvancedScanInsert {
  id?: string;
  organisation_id: string;
  scan_type: ScanTypeAdvanced;
  input_json: Json;
  result_json: Json;
  jurisdiction?: string;
  created_by: string;
  created_at?: string;
}

interface JurisdictionCorpusRow {
  id: string;
  jurisdiction_code: string;
  content_type: CorpusContentType;
  title: string;
  content: string;
  source: string;
  source_url: string | null;
  last_updated: string | null;
  created_at: string;
}
interface JurisdictionCorpusInsert {
  id?: string;
  jurisdiction_code: string;
  content_type: CorpusContentType;
  title: string;
  content: string;
  source: string;
  source_url?: string | null;
  last_updated?: string | null;
  created_at?: string;
}

interface ClaimRow {
  id: string;
  organisation_id: string;
  claim_text: string;
  category: ClaimCategory;
  jurisdiction: string;
  verdict: ClaimVerdict | null;
  risk_score: number | null;
  analysis_json: Json | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
interface ClaimInsert {
  id?: string;
  organisation_id: string;
  claim_text: string;
  category: ClaimCategory;
  jurisdiction?: string;
  verdict?: ClaimVerdict | null;
  risk_score?: number | null;
  analysis_json?: Json | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

interface ClaimEvidenceRow {
  id: string;
  claim_id: string;
  evidence_type: ClaimEvidenceType;
  title: string;
  description: string | null;
  file_path: string | null;
  source_url: string | null;
  uploaded_by: string;
  created_at: string;
}
interface ClaimEvidenceInsert {
  id?: string;
  claim_id: string;
  evidence_type: ClaimEvidenceType;
  title: string;
  description?: string | null;
  file_path?: string | null;
  source_url?: string | null;
  uploaded_by: string;
  created_at?: string;
}

interface ClaimAuditLogRow {
  id: string;
  claim_id: string;
  action: ClaimAuditAction;
  performed_by: string;
  metadata: Json | null;
  created_at: string;
}
interface ClaimAuditLogInsert {
  id?: string;
  claim_id: string;
  action: ClaimAuditAction;
  performed_by: string;
  metadata?: Json | null;
  created_at?: string;
}

// ── Session 8 row/insert types ────────────────────────────────────────────────

export interface SowTemplateRow {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  category: SowCategory;
  template_json: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface SowTemplateInsert {
  id?: string;
  organisation_id: string;
  name: string;
  description?: string | null;
  category?: SowCategory;
  template_json: Json;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface SowRow {
  id: string;
  organisation_id: string;
  campaign_id: string | null;
  template_id: string | null;
  title: string;
  brand_name: string;
  creator_id: string | null;
  jurisdiction: string;
  status: SowStatus;
  start_date: string | null;
  end_date: string | null;
  total_value: number | null;
  currency: string;
  sow_json: Json;
  ai_suggestions_json: Json | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface SowInsert {
  id?: string;
  organisation_id: string;
  campaign_id?: string | null;
  template_id?: string | null;
  title: string;
  brand_name: string;
  creator_id?: string | null;
  jurisdiction?: string;
  status?: SowStatus;
  start_date?: string | null;
  end_date?: string | null;
  total_value?: number | null;
  currency?: string;
  sow_json: Json;
  ai_suggestions_json?: Json | null;
  created_by: string;
}

export interface SowDeliverableRow {
  id: string;
  sow_id: string;
  title: string;
  description: string | null;
  platform: DeliverablePlatform;
  content_type: DeliverableContentType;
  quantity: number;
  due_date: string | null;
  value: number | null;
  status: DeliverableStatus;
  created_at: string;
}
export interface SowDeliverableInsert {
  id?: string;
  sow_id: string;
  title: string;
  description?: string | null;
  platform?: DeliverablePlatform;
  content_type?: DeliverableContentType;
  quantity?: number;
  due_date?: string | null;
  value?: number | null;
  status?: DeliverableStatus;
}

export interface SowPaymentMilestoneRow {
  id: string;
  sow_id: string;
  title: string;
  amount: number;
  due_date: string | null;
  trigger_event: string | null;
  status: MilestoneStatus;
  created_at: string;
}
export interface SowPaymentMilestoneInsert {
  id?: string;
  sow_id: string;
  title: string;
  amount: number;
  due_date?: string | null;
  trigger_event?: string | null;
  status?: MilestoneStatus;
}

// ── Session 9 row/insert types ────────────────────────────────────────────────

export interface ScopeChangeRequestRow {
  id: string;
  sow_id: string;
  organisation_id: string;
  requested_by: string;
  change_type: ChangeType;
  description: string;
  original_value: Json | null;
  proposed_value: Json | null;
  impact_analysis_json: Json | null;
  status: ChangeStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}
export interface ScopeChangeRequestInsert {
  id?: string;
  sow_id: string;
  organisation_id: string;
  requested_by: string;
  change_type: ChangeType;
  description: string;
  original_value?: Json | null;
  proposed_value?: Json | null;
  impact_analysis_json?: Json | null;
  status?: ChangeStatus;
  resolved_by?: string | null;
  resolved_at?: string | null;
}

export interface ScopeAlertRow {
  id: string;
  sow_id: string;
  organisation_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata_json: Json | null;
  resolved: boolean;
  created_at: string;
}
export interface ScopeAlertInsert {
  id?: string;
  sow_id: string;
  organisation_id: string;
  alert_type: AlertType;
  severity?: AlertSeverity;
  message: string;
  metadata_json?: Json | null;
  resolved?: boolean;
}

// ── Session 10 row/insert types ───────────────────────────────────────────────

export interface InvoiceRow {
  id: string;
  organisation_id: string;
  sow_id: string;
  milestone_id: string | null;
  invoice_number: string;
  brand_name: string;
  amount: number;
  currency: string;
  tax_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  line_items_json: Json;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface InvoiceInsert {
  id?: string;
  organisation_id: string;
  sow_id: string;
  milestone_id?: string | null;
  invoice_number: string;
  brand_name: string;
  amount: number;
  currency?: string;
  tax_amount?: number;
  total_amount: number;
  status?: InvoiceStatus;
  due_date?: string | null;
  paid_at?: string | null;
  line_items_json: Json;
  notes?: string | null;
  created_by: string;
}

export interface DeliveryLockRow {
  id: string;
  sow_id: string;
  organisation_id: string;
  locked_by: string;
  locked_at: string;
  checklist_json: Json;
  all_deliverables_approved: boolean;
  all_milestones_paid: boolean;
  compliance_cleared: boolean;
  final_assets_uploaded: boolean;
  lock_status: LockStatus;
  notes: string | null;
}
export interface DeliveryLockInsert {
  id?: string;
  sow_id: string;
  organisation_id: string;
  locked_by: string;
  locked_at?: string;
  checklist_json: Json;
  all_deliverables_approved?: boolean;
  all_milestones_paid?: boolean;
  compliance_cleared?: boolean;
  final_assets_uploaded?: boolean;
  lock_status?: LockStatus;
  notes?: string | null;
}

// ── Session 11 enums ─────────────────────────────────────────────────────────
export type ApprovalRequestStatus = "pending" | "approved" | "rejected" | "revision_requested";
export type ProofEntryType = "screenshot" | "video" | "document" | "url_capture" | "metric_report";
export type TimelineEventType =
  | "sow_created" | "deliverable_submitted" | "approval_granted" | "revision_requested"
  | "payment_made" | "scope_change" | "invoice_sent" | "delivery_locked" | "proof_uploaded";

export interface ApprovalRequestRow {
  id: string;
  organisation_id: string;
  sow_id: string | null;
  deliverable_id: string | null;
  submitted_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  content_url: string | null;
  status: ApprovalRequestStatus;
  feedback: string | null;
  due_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface ApprovalRequestInsert {
  id?: string;
  organisation_id: string;
  sow_id?: string | null;
  deliverable_id?: string | null;
  submitted_by: string;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  content_url?: string | null;
  status?: ApprovalRequestStatus;
  feedback?: string | null;
  due_date?: string | null;
  resolved_at?: string | null;
}

export interface ProofVaultEntryRow {
  id: string;
  organisation_id: string;
  approval_request_id: string | null;
  sow_id: string | null;
  entry_type: ProofEntryType;
  title: string;
  file_path: string | null;
  external_url: string | null;
  metadata_json: Json | null;
  uploaded_by: string;
  created_at: string;
}
export interface ProofVaultEntryInsert {
  id?: string;
  organisation_id: string;
  approval_request_id?: string | null;
  sow_id?: string | null;
  entry_type: ProofEntryType;
  title: string;
  file_path?: string | null;
  external_url?: string | null;
  metadata_json?: Json | null;
  uploaded_by: string;
}

export interface EvidenceTimelineRow {
  id: string;
  organisation_id: string;
  sow_id: string | null;
  event_type: TimelineEventType;
  title: string;
  description: string | null;
  actor_id: string | null;
  reference_id: string | null;
  reference_table: string | null;
  metadata_json: Json | null;
  created_at: string;
}
export interface EvidenceTimelineInsert {
  id?: string;
  organisation_id: string;
  sow_id?: string | null;
  event_type: TimelineEventType;
  title: string;
  description?: string | null;
  actor_id?: string | null;
  reference_id?: string | null;
  reference_table?: string | null;
  metadata_json?: Json | null;
}

// ── Session 12 enums ─────────────────────────────────────────────────────────
export type DealStatus = "active" | "closed" | "archived";
export type MessageType = "text" | "term_proposal" | "counter_proposal" | "acceptance" | "rejection";

export interface DealRoomRow {
  id: string;
  organisation_id: string;
  sow_id: string | null;
  creator_id: string;
  title: string;
  status: DealStatus;
  jurisdiction: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface DealRoomInsert {
  id?: string;
  organisation_id: string;
  sow_id?: string | null;
  creator_id: string;
  title: string;
  status?: DealStatus;
  jurisdiction?: string;
  created_by: string;
}

export interface DealMessageRow {
  id: string;
  deal_room_id: string;
  sender_id: string;
  message_type: MessageType;
  content: string;
  term_json: Json | null;
  ai_analysis_json: Json | null;
  created_at: string;
}
export interface DealMessageInsert {
  id?: string;
  deal_room_id: string;
  sender_id: string;
  message_type?: MessageType;
  content: string;
  term_json?: Json | null;
  ai_analysis_json?: Json | null;
}

export interface ExclusivityAlertRow {
  id: string;
  organisation_id: string;
  creator_id: string;
  conflicting_sow_id: string | null;
  existing_record_id: string;
  alert_message: string;
  severity: "high" | "medium" | "low";
  resolved: boolean;
  created_at: string;
}
export interface ExclusivityAlertInsert {
  id?: string;
  organisation_id: string;
  creator_id: string;
  conflicting_sow_id?: string | null;
  existing_record_id: string;
  alert_message: string;
  severity?: "high" | "medium" | "low";
  resolved?: boolean;
}

// ── Session 13 enums ─────────────────────────────────────────────────────────
export type WhitelistingStatus = "pending_review" | "approved" | "rejected" | "needs_amendment";
export type PassportStatus = "clear" | "flagged" | "suspended";

export interface WhitelistingRequestRow {
  id: string;
  organisation_id: string;
  sow_id: string | null;
  creator_id: string;
  brand_name: string;
  platform: "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok";
  content_description: string;
  requested_rights: string[];
  jurisdiction: string;
  analysis_json: Json | null;
  status: WhitelistingStatus;
  created_at: string;
}
export interface WhitelistingRequestInsert {
  id?: string;
  organisation_id: string;
  sow_id?: string | null;
  creator_id: string;
  brand_name: string;
  platform: "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok";
  content_description: string;
  requested_rights: string[];
  jurisdiction?: string;
  analysis_json?: Json | null;
  status?: WhitelistingStatus;
}

export interface RightsValuationRow {
  id: string;
  organisation_id: string;
  creator_id: string;
  content_type: string;
  platforms: string[];
  duration_days: number;
  territory: string;
  exclusivity: boolean;
  usage_types: string[];
  jurisdiction: string;
  base_fee: number | null;
  suggested_range_low: number | null;
  suggested_range_high: number | null;
  reasoning: string | null;
  created_at: string;
}
export interface RightsValuationInsert {
  id?: string;
  organisation_id: string;
  creator_id: string;
  content_type: string;
  platforms: string[];
  duration_days: number;
  territory: string;
  exclusivity?: boolean;
  usage_types: string[];
  jurisdiction?: string;
  base_fee?: number | null;
  suggested_range_low?: number | null;
  suggested_range_high?: number | null;
  reasoning?: string | null;
}

export interface SafetyPassportRow {
  id: string;
  organisation_id: string;
  creator_id: string;
  jurisdiction: string;
  compliance_score: number | null;
  last_assessed_at: string | null;
  checklist_json: Json;
  risk_flags: string[] | null;
  status: PassportStatus;
  created_at: string;
  updated_at: string;
}
export interface SafetyPassportInsert {
  id?: string;
  organisation_id: string;
  creator_id: string;
  jurisdiction?: string;
  compliance_score?: number | null;
  last_assessed_at?: string | null;
  checklist_json?: Json;
  risk_flags?: string[] | null;
  status?: PassportStatus;
}

// ── Session 14 enums ─────────────────────────────────────────────────────────
export type RecipientType = "brand" | "creator" | "platform" | "lawyer" | "regulator" | "media" | "other";
export type SendChannel = "whatsapp" | "email" | "instagram_dm" | "twitter_dm" | "linkedin" | "other";
export type OverallRisk = "low" | "medium" | "high" | "critical";
export type SendRecommendation = "safe_to_send" | "send_with_caution" | "rewrite_recommended" | "do_not_send";
export type RewriteGoal = "neutralise_tone" | "remove_commitments" | "add_disclaimers" | "strengthen_position";

export interface SendScanRow {
  id: string;
  organisation_id: string;
  content: string;
  recipient_type: RecipientType;
  channel: SendChannel;
  jurisdiction: string;
  overall_risk: OverallRisk | null;
  send_recommendation: SendRecommendation | null;
  issues_json: Json | null;
  rewrite_json: Json | null;
  counsel_json: Json | null;
  created_by: string;
  created_at: string;
}
export interface SendScanInsert {
  id?: string;
  organisation_id: string;
  content: string;
  recipient_type: RecipientType;
  channel: SendChannel;
  jurisdiction?: string;
  overall_risk?: OverallRisk | null;
  send_recommendation?: SendRecommendation | null;
  issues_json?: Json | null;
  rewrite_json?: Json | null;
  counsel_json?: Json | null;
  created_by: string;
}

// ── Session 15 enums ─────────────────────────────────────────────────────────
export type TermSheetStatus = "draft" | "shared" | "accepted" | "rejected";

export interface MeetingTranscriptRow {
  id: string;
  organisation_id: string;
  title: string;
  transcript_text: string;
  participants: string[];
  meeting_date: string | null;
  analysis_json: Json | null;
  term_sheet_json: Json | null;
  term_sheet_id: string | null;
  created_by: string;
  created_at: string;
}
export interface MeetingTranscriptInsert {
  id?: string;
  organisation_id: string;
  title: string;
  transcript_text: string;
  participants?: string[];
  meeting_date?: string | null;
  analysis_json?: Json | null;
  term_sheet_json?: Json | null;
  term_sheet_id?: string | null;
  created_by: string;
}

export interface TermSheetRow {
  id: string;
  organisation_id: string;
  transcript_id: string | null;
  terms_json: Json;
  status: TermSheetStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface TermSheetInsert {
  id?: string;
  organisation_id: string;
  transcript_id?: string | null;
  terms_json: Json;
  status?: TermSheetStatus;
  created_by: string;
}

// ── Session 16 enums ─────────────────────────────────────────────────────────
export type CrisisStatus = "open" | "monitoring" | "escalated" | "resolved";
export type CrisisSeverity = "low" | "medium" | "high" | "critical";

export interface CrisisRoomRow {
  id: string;
  organisation_id: string;
  legal_notice_id: string | null;
  title: string;
  severity: CrisisSeverity;
  status: CrisisStatus;
  action_plan_json: Json | null;
  timeline_json: Json | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface CrisisRoomInsert {
  id?: string;
  organisation_id: string;
  legal_notice_id?: string | null;
  title: string;
  severity?: CrisisSeverity;
  status?: CrisisStatus;
  action_plan_json?: Json | null;
  timeline_json?: Json | null;
  created_by: string;
}

export interface LiabilityMapRow {
  id: string;
  organisation_id: string;
  legal_notice_id: string;
  parties_json: Json;
  indemnity_chain_json: Json | null;
  created_by: string;
  created_at: string;
}
export interface LiabilityMapInsert {
  id?: string;
  organisation_id: string;
  legal_notice_id: string;
  parties_json: Json;
  indemnity_chain_json?: Json | null;
  created_by: string;
}

// ── Session 17 enums ─────────────────────────────────────────────────────────
export type InfringementStatus = "open" | "in_dispute" | "resolved" | "takedown_sent";
export type TakedownStatus = "draft" | "sent" | "acknowledged" | "resolved" | "escalated";

export interface InfringementRecordRow {
  id: string;
  organisation_id: string;
  ip_record_id: string;
  platform: string;
  infringing_url: string | null;
  description: string;
  evidence_paths: string[];
  analysis_json: Json | null;
  status: InfringementStatus;
  created_by: string;
  created_at: string;
}
export interface InfringementRecordInsert {
  id?: string;
  organisation_id: string;
  ip_record_id: string;
  platform: string;
  infringing_url?: string | null;
  description: string;
  evidence_paths?: string[];
  analysis_json?: Json | null;
  status?: InfringementStatus;
  created_by: string;
}

export interface TakedownNoticeRow {
  id: string;
  organisation_id: string;
  infringement_record_id: string;
  notice_text: string;
  filing_instructions: string | null;
  deadline_notes: string | null;
  status: TakedownStatus;
  sent_at: string | null;
  created_by: string;
  created_at: string;
}
export interface TakedownNoticeInsert {
  id?: string;
  organisation_id: string;
  infringement_record_id: string;
  notice_text: string;
  filing_instructions?: string | null;
  deadline_notes?: string | null;
  status?: TakedownStatus;
  sent_at?: string | null;
  created_by: string;
}

// ── Session 18 enums ─────────────────────────────────────────────────────────
export type PlaybookCategory = "contract_review" | "content_approval" | "crisis" | "ip" | "onboarding" | "offboarding" | "general";
export type NdaVerdictType = "safe" | "review_recommended" | "do_not_sign";

export interface PlaybookEntryRow {
  id: string;
  organisation_id: string;
  category: PlaybookCategory;
  jurisdiction: string;
  title: string;
  content: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface PlaybookEntryInsert {
  id?: string;
  organisation_id: string;
  category: PlaybookCategory;
  jurisdiction?: string;
  title: string;
  content: string;
  tags?: string[];
  created_by: string;
}

export interface ClauseLibraryRow {
  id: string;
  organisation_id: string;
  clause_type: string;
  jurisdiction: string;
  title: string;
  clause_text: string;
  analysis_json: Json | null;
  created_by: string;
  created_at: string;
}
export interface ClauseLibraryInsert {
  id?: string;
  organisation_id: string;
  clause_type: string;
  jurisdiction?: string;
  title: string;
  clause_text: string;
  analysis_json?: Json | null;
  created_by: string;
}

export interface NdaScanRow {
  id: string;
  organisation_id: string;
  nda_text: string;
  jurisdiction: string;
  traps_json: Json | null;
  safe_clauses_json: Json | null;
  overall_verdict: NdaVerdictType | null;
  recommended_redlines_json: Json | null;
  created_by: string;
  created_at: string;
}
export interface NdaScanInsert {
  id?: string;
  organisation_id: string;
  nda_text: string;
  jurisdiction?: string;
  traps_json?: Json | null;
  safe_clauses_json?: Json | null;
  overall_verdict?: NdaVerdictType | null;
  recommended_redlines_json?: Json | null;
  created_by: string;
}

// ── Session 19 enums ─────────────────────────────────────────────────────────
export type AiRiskLevel = "low" | "medium" | "high" | "critical";

export interface AiWorkflowScanRow {
  id: string;
  organisation_id: string;
  workflow_description: string;
  jurisdiction: string;
  risk_categories_json: Json | null;
  disclosure_obligations_json: Json | null;
  recommended_policies_json: Json | null;
  overall_risk: AiRiskLevel | null;
  created_by: string;
  created_at: string;
}
export interface AiWorkflowScanInsert {
  id?: string;
  organisation_id: string;
  workflow_description: string;
  jurisdiction?: string;
  risk_categories_json?: Json | null;
  disclosure_obligations_json?: Json | null;
  recommended_policies_json?: Json | null;
  overall_risk?: AiRiskLevel | null;
  created_by: string;
}

export interface VendorContractRow {
  id: string;
  organisation_id: string;
  vendor_name: string;
  contract_text: string;
  jurisdiction: string;
  extracted_provisions_json: Json | null;
  risk_score: number | null;
  gaps_json: Json | null;
  protections_json: Json | null;
  recommended_additions_json: Json | null;
  data_processor_compliant: boolean | null;
  created_by: string;
  created_at: string;
}
export interface VendorContractInsert {
  id?: string;
  organisation_id: string;
  vendor_name: string;
  contract_text: string;
  jurisdiction?: string;
  extracted_provisions_json?: Json | null;
  risk_score?: number | null;
  gaps_json?: Json | null;
  protections_json?: Json | null;
  recommended_additions_json?: Json | null;
  data_processor_compliant?: boolean | null;
  created_by: string;
}

// ── Session 20 enums ─────────────────────────────────────────────────────────
export type AdversaryType = "opposing_counsel" | "regulator" | "brand" | "creator" | "media";
export type ComplaintBodyType =
  | "ASCI" | "MIB" | "TRAI" | "SEBI" | "RBI" | "CCI" | "consumer_forum" | "police";

export interface CrossReferenceQueryRow {
  id: string;
  organisation_id: string;
  query_text: string;
  jurisdictions: string[];
  results_json: Json | null;
  conflicts_json: Json | null;
  created_by: string;
  created_at: string;
}
export interface CrossReferenceQueryInsert {
  id?: string;
  organisation_id: string;
  query_text: string;
  jurisdictions: string[];
  results_json?: Json | null;
  conflicts_json?: Json | null;
  created_by: string;
}

export interface AdversaryAnalysisRow {
  id: string;
  organisation_id: string;
  scenario: string;
  adversary_type: AdversaryType;
  jurisdiction: string;
  attack_vectors_json: Json | null;
  vulnerabilities_json: Json | null;
  defences_json: Json | null;
  counter_arguments_json: Json | null;
  risk_score: number | null;
  created_by: string;
  created_at: string;
}
export interface AdversaryAnalysisInsert {
  id?: string;
  organisation_id: string;
  scenario: string;
  adversary_type: AdversaryType;
  jurisdiction?: string;
  attack_vectors_json?: Json | null;
  vulnerabilities_json?: Json | null;
  defences_json?: Json | null;
  counter_arguments_json?: Json | null;
  risk_score?: number | null;
  created_by: string;
}

export interface ComplaintSimulationRow {
  id: string;
  organisation_id: string;
  scenario: string;
  complaint_body: ComplaintBodyType;
  jurisdiction: string;
  complaint_text_json: Json | null;
  case_strength: number | null;
  weaknesses_json: Json | null;
  created_by: string;
  created_at: string;
}
export interface ComplaintSimulationInsert {
  id?: string;
  organisation_id: string;
  scenario: string;
  complaint_body: ComplaintBodyType;
  jurisdiction?: string;
  complaint_text_json?: Json | null;
  case_strength?: number | null;
  weaknesses_json?: Json | null;
  created_by: string;
}

// ── Session 21 enums ─────────────────────────────────────────────────────────
export type PlanName = "free" | "pro" | "agency" | "enterprise";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "paused";
export type BillingEventType =
  | "subscription_created" | "payment_success" | "payment_failed"
  | "subscription_cancelled" | "jurisdiction_added" | "plan_upgraded";

export interface SubscriptionPlanRow {
  id: string;
  name: PlanName;
  price_inr: number;
  price_usd: number;
  features_json: Json;
  jurisdiction_limit: number;
  created_at: string;
}

export interface OrganisationSubscriptionRow {
  id: string;
  organisation_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  razorpay_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
export interface OrganisationSubscriptionInsert {
  id?: string;
  organisation_id: string;
  plan_id: string;
  status?: SubscriptionStatus;
  razorpay_subscription_id?: string | null;
  current_period_end?: string | null;
}

export interface BillingEventRow {
  id: string;
  organisation_id: string;
  event_type: BillingEventType;
  amount: number | null;
  currency: string | null;
  razorpay_event_id: string | null;
  metadata_json: Json | null;
  created_at: string;
}
export interface BillingEventInsert {
  id?: string;
  organisation_id: string;
  event_type: BillingEventType;
  amount?: number | null;
  currency?: string | null;
  razorpay_event_id?: string | null;
  metadata_json?: Json | null;
}

// ─── Database root type ───────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: OrganisationRow;
        Insert: OrganisationInsert;
        Update: Partial<OrganisationInsert>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<Omit<ProfileInsert, "id">>;
        Relationships: [
          { foreignKeyName: "profiles_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      contracts: {
        Row: ContractRow;
        Insert: ContractInsert;
        Update: Partial<ContractInsert>;
        Relationships: [
          { foreignKeyName: "contracts_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "contracts_uploaded_by_fkey"; columns: ["uploaded_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      campaigns: {
        Row: CampaignRow;
        Insert: CampaignInsert;
        Update: Partial<CampaignInsert>;
        Relationships: [
          { foreignKeyName: "campaigns_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "campaigns_creator_id_fkey"; columns: ["creator_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "campaigns_contract_id_fkey"; columns: ["contract_id"]; referencedRelation: "contracts"; referencedColumns: ["id"] }
        ];
      };
      creators: {
        Row: CreatorRow;
        Insert: CreatorInsert;
        Update: Partial<CreatorInsert>;
        Relationships: [
          { foreignKeyName: "creators_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "creators_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      scope_items: {
        Row: ScopeItemRow;
        Insert: ScopeItemInsert;
        Update: Partial<ScopeItemInsert>;
        Relationships: [
          { foreignKeyName: "scope_items_sow_id_fkey"; columns: ["sow_id"]; referencedRelation: "sows"; referencedColumns: ["id"] }
        ];
      };
      approvals: {
        Row: ApprovalRow;
        Insert: ApprovalInsert;
        Update: Partial<ApprovalInsert>;
        Relationships: [
          { foreignKeyName: "approvals_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "approvals_campaign_id_fkey"; columns: ["campaign_id"]; referencedRelation: "campaigns"; referencedColumns: ["id"] }
        ];
      };
      evidence_vault: {
        Row: EvidenceRow;
        Insert: EvidenceInsert;
        Update: Partial<EvidenceInsert>;
        Relationships: [
          { foreignKeyName: "evidence_vault_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      content_scans: {
        Row: ContentScanRow;
        Insert: ContentScanInsert;
        Update: Partial<ContentScanInsert>;
        Relationships: [
          { foreignKeyName: "content_scans_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      legal_notices: {
        Row: LegalNoticeRow;
        Insert: LegalNoticeInsert;
        Update: Partial<LegalNoticeInsert>;
        Relationships: [
          { foreignKeyName: "legal_notices_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      ip_records: {
        Row: IpRecordRow;
        Insert: IpRecordInsert;
        Update: Partial<IpRecordInsert>;
        Relationships: [
          { foreignKeyName: "ip_records_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      invitations: {
        Row: InvitationRow;
        Insert: InvitationInsert;
        Update: Partial<InvitationInsert>;
        Relationships: [
          { foreignKeyName: "invitations_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      claims: {
        Row: ClaimRow;
        Insert: ClaimInsert;
        Update: Partial<ClaimInsert>;
        Relationships: [
          { foreignKeyName: "claims_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "claims_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      claim_evidence: {
        Row: ClaimEvidenceRow;
        Insert: ClaimEvidenceInsert;
        Update: Partial<ClaimEvidenceInsert>;
        Relationships: [
          { foreignKeyName: "claim_evidence_claim_id_fkey"; columns: ["claim_id"]; referencedRelation: "claims"; referencedColumns: ["id"] },
          { foreignKeyName: "claim_evidence_uploaded_by_fkey"; columns: ["uploaded_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      claim_audit_log: {
        Row: ClaimAuditLogRow;
        Insert: ClaimAuditLogInsert;
        Update: Partial<ClaimAuditLogInsert>;
        Relationships: [
          { foreignKeyName: "claim_audit_log_claim_id_fkey"; columns: ["claim_id"]; referencedRelation: "claims"; referencedColumns: ["id"] },
          { foreignKeyName: "claim_audit_log_performed_by_fkey"; columns: ["performed_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      content_advanced_scans: {
        Row: ContentAdvancedScanRow;
        Insert: ContentAdvancedScanInsert;
        Update: Partial<ContentAdvancedScanInsert>;
        Relationships: [
          { foreignKeyName: "content_advanced_scans_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "content_advanced_scans_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      sow_templates: {
        Row: SowTemplateRow;
        Insert: SowTemplateInsert;
        Update: Partial<SowTemplateInsert>;
        Relationships: [
          { foreignKeyName: "sow_templates_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "sow_templates_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      sows: {
        Row: SowRow;
        Insert: SowInsert;
        Update: Partial<SowInsert>;
        Relationships: [
          { foreignKeyName: "sows_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "sows_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      sow_deliverables: {
        Row: SowDeliverableRow;
        Insert: SowDeliverableInsert;
        Update: Partial<SowDeliverableInsert>;
        Relationships: [
          { foreignKeyName: "sow_deliverables_sow_id_fkey"; columns: ["sow_id"]; referencedRelation: "sows"; referencedColumns: ["id"] }
        ];
      };
      sow_payment_milestones: {
        Row: SowPaymentMilestoneRow;
        Insert: SowPaymentMilestoneInsert;
        Update: Partial<SowPaymentMilestoneInsert>;
        Relationships: [
          { foreignKeyName: "sow_payment_milestones_sow_id_fkey"; columns: ["sow_id"]; referencedRelation: "sows"; referencedColumns: ["id"] }
        ];
      };
      scope_change_requests: {
        Row: ScopeChangeRequestRow;
        Insert: ScopeChangeRequestInsert;
        Update: Partial<ScopeChangeRequestInsert>;
        Relationships: [
          { foreignKeyName: "scope_change_requests_sow_id_fkey"; columns: ["sow_id"]; referencedRelation: "sows"; referencedColumns: ["id"] },
          { foreignKeyName: "scope_change_requests_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      scope_alerts: {
        Row: ScopeAlertRow;
        Insert: ScopeAlertInsert;
        Update: Partial<ScopeAlertInsert>;
        Relationships: [
          { foreignKeyName: "scope_alerts_sow_id_fkey"; columns: ["sow_id"]; referencedRelation: "sows"; referencedColumns: ["id"] },
          { foreignKeyName: "scope_alerts_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: Partial<InvoiceInsert>;
        Relationships: [
          { foreignKeyName: "invoices_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_sow_id_fkey"; columns: ["sow_id"]; referencedRelation: "sows"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      delivery_locks: {
        Row: DeliveryLockRow;
        Insert: DeliveryLockInsert;
        Update: Partial<DeliveryLockInsert>;
        Relationships: [
          { foreignKeyName: "delivery_locks_sow_id_fkey"; columns: ["sow_id"]; referencedRelation: "sows"; referencedColumns: ["id"] },
          { foreignKeyName: "delivery_locks_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "delivery_locks_locked_by_fkey"; columns: ["locked_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      exclusivity_records: {
        Row: {
          id: string;
          creator_id: string;
          brand_name: string;
          category: string;
          start_date: string;
          end_date: string;
          contract_id: string | null;
          status: ExclusivityStatus;
          created_at: string;
          organisation_id: string | null;
          jurisdiction: string | null;
          sow_id: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          creator_id: string;
          brand_name: string;
          category: string;
          start_date: string;
          end_date: string;
          contract_id?: string | null;
          status?: ExclusivityStatus;
          organisation_id?: string | null;
          jurisdiction?: string | null;
          sow_id?: string | null;
          notes?: string | null;
        };
        Update: {
          brand_name?: string;
          category?: string;
          start_date?: string;
          end_date?: string;
          contract_id?: string | null;
          status?: ExclusivityStatus;
          organisation_id?: string | null;
          jurisdiction?: string | null;
          sow_id?: string | null;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "exclusivity_records_creator_id_fkey"; columns: ["creator_id"]; referencedRelation: "creators"; referencedColumns: ["id"] }
        ];
      };
      approval_requests: {
        Row: ApprovalRequestRow;
        Insert: ApprovalRequestInsert;
        Update: Partial<ApprovalRequestInsert>;
        Relationships: [
          { foreignKeyName: "approval_requests_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "approval_requests_submitted_by_fkey"; columns: ["submitted_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      proof_vault_entries: {
        Row: ProofVaultEntryRow;
        Insert: ProofVaultEntryInsert;
        Update: Partial<ProofVaultEntryInsert>;
        Relationships: [
          { foreignKeyName: "proof_vault_entries_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "proof_vault_entries_uploaded_by_fkey"; columns: ["uploaded_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      evidence_timeline: {
        Row: EvidenceTimelineRow;
        Insert: EvidenceTimelineInsert;
        Update: Partial<EvidenceTimelineInsert>;
        Relationships: [
          { foreignKeyName: "evidence_timeline_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      deal_rooms: {
        Row: DealRoomRow;
        Insert: DealRoomInsert;
        Update: Partial<DealRoomInsert>;
        Relationships: [
          { foreignKeyName: "deal_rooms_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "deal_rooms_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      deal_messages: {
        Row: DealMessageRow;
        Insert: DealMessageInsert;
        Update: Partial<DealMessageInsert>;
        Relationships: [
          { foreignKeyName: "deal_messages_deal_room_id_fkey"; columns: ["deal_room_id"]; referencedRelation: "deal_rooms"; referencedColumns: ["id"] },
          { foreignKeyName: "deal_messages_sender_id_fkey"; columns: ["sender_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      exclusivity_alerts: {
        Row: ExclusivityAlertRow;
        Insert: ExclusivityAlertInsert;
        Update: Partial<ExclusivityAlertInsert>;
        Relationships: [
          { foreignKeyName: "exclusivity_alerts_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "exclusivity_alerts_creator_id_fkey"; columns: ["creator_id"]; referencedRelation: "creators"; referencedColumns: ["id"] }
        ];
      };
      whitelisting_requests: {
        Row: WhitelistingRequestRow;
        Insert: WhitelistingRequestInsert;
        Update: Partial<WhitelistingRequestInsert>;
        Relationships: [
          { foreignKeyName: "whitelisting_requests_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "whitelisting_requests_creator_id_fkey"; columns: ["creator_id"]; referencedRelation: "creators"; referencedColumns: ["id"] }
        ];
      };
      rights_valuations: {
        Row: RightsValuationRow;
        Insert: RightsValuationInsert;
        Update: Partial<RightsValuationInsert>;
        Relationships: [
          { foreignKeyName: "rights_valuations_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "rights_valuations_creator_id_fkey"; columns: ["creator_id"]; referencedRelation: "creators"; referencedColumns: ["id"] }
        ];
      };
      safety_passports: {
        Row: SafetyPassportRow;
        Insert: SafetyPassportInsert;
        Update: Partial<SafetyPassportInsert>;
        Relationships: [
          { foreignKeyName: "safety_passports_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "safety_passports_creator_id_fkey"; columns: ["creator_id"]; referencedRelation: "creators"; referencedColumns: ["id"] }
        ];
      };
      send_scans: {
        Row: SendScanRow;
        Insert: SendScanInsert;
        Update: Partial<SendScanInsert>;
        Relationships: [
          { foreignKeyName: "send_scans_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      meeting_transcripts: {
        Row: MeetingTranscriptRow;
        Insert: MeetingTranscriptInsert;
        Update: Partial<MeetingTranscriptInsert>;
        Relationships: [
          { foreignKeyName: "meeting_transcripts_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      term_sheets: {
        Row: TermSheetRow;
        Insert: TermSheetInsert;
        Update: Partial<TermSheetInsert>;
        Relationships: [
          { foreignKeyName: "term_sheets_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      crisis_rooms: {
        Row: CrisisRoomRow;
        Insert: CrisisRoomInsert;
        Update: Partial<CrisisRoomInsert>;
        Relationships: [
          { foreignKeyName: "crisis_rooms_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      liability_maps: {
        Row: LiabilityMapRow;
        Insert: LiabilityMapInsert;
        Update: Partial<LiabilityMapInsert>;
        Relationships: [
          { foreignKeyName: "liability_maps_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      infringement_records: {
        Row: InfringementRecordRow;
        Insert: InfringementRecordInsert;
        Update: Partial<InfringementRecordInsert>;
        Relationships: [
          { foreignKeyName: "infringement_records_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      takedown_notices: {
        Row: TakedownNoticeRow;
        Insert: TakedownNoticeInsert;
        Update: Partial<TakedownNoticeInsert>;
        Relationships: [
          { foreignKeyName: "takedown_notices_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      playbook_entries: {
        Row: PlaybookEntryRow;
        Insert: PlaybookEntryInsert;
        Update: Partial<PlaybookEntryInsert>;
        Relationships: [
          { foreignKeyName: "playbook_entries_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      clause_library: {
        Row: ClauseLibraryRow;
        Insert: ClauseLibraryInsert;
        Update: Partial<ClauseLibraryInsert>;
        Relationships: [
          { foreignKeyName: "clause_library_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      nda_scans: {
        Row: NdaScanRow;
        Insert: NdaScanInsert;
        Update: Partial<NdaScanInsert>;
        Relationships: [
          { foreignKeyName: "nda_scans_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      ai_workflow_scans: {
        Row: AiWorkflowScanRow;
        Insert: AiWorkflowScanInsert;
        Update: Partial<AiWorkflowScanInsert>;
        Relationships: [
          { foreignKeyName: "ai_workflow_scans_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      vendor_contracts: {
        Row: VendorContractRow;
        Insert: VendorContractInsert;
        Update: Partial<VendorContractInsert>;
        Relationships: [
          { foreignKeyName: "vendor_contracts_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      cross_reference_queries: {
        Row: CrossReferenceQueryRow;
        Insert: CrossReferenceQueryInsert;
        Update: Partial<CrossReferenceQueryInsert>;
        Relationships: [
          { foreignKeyName: "cross_reference_queries_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      adversary_analyses: {
        Row: AdversaryAnalysisRow;
        Insert: AdversaryAnalysisInsert;
        Update: Partial<AdversaryAnalysisInsert>;
        Relationships: [
          { foreignKeyName: "adversary_analyses_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      complaint_simulations: {
        Row: ComplaintSimulationRow;
        Insert: ComplaintSimulationInsert;
        Update: Partial<ComplaintSimulationInsert>;
        Relationships: [
          { foreignKeyName: "complaint_simulations_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
      subscription_plans: {
        Row: SubscriptionPlanRow;
        Insert: Omit<SubscriptionPlanRow, "id" | "created_at">;
        Update: Partial<Omit<SubscriptionPlanRow, "id" | "created_at">>;
        Relationships: [];
      };
      organisation_subscriptions: {
        Row: OrganisationSubscriptionRow;
        Insert: OrganisationSubscriptionInsert;
        Update: Partial<OrganisationSubscriptionInsert>;
        Relationships: [
          { foreignKeyName: "organisation_subscriptions_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] },
          { foreignKeyName: "organisation_subscriptions_plan_id_fkey"; columns: ["plan_id"]; referencedRelation: "subscription_plans"; referencedColumns: ["id"] }
        ];
      };
      billing_events: {
        Row: BillingEventRow;
        Insert: BillingEventInsert;
        Update: Partial<BillingEventInsert>;
        Relationships: [
          { foreignKeyName: "billing_events_organisation_id_fkey"; columns: ["organisation_id"]; referencedRelation: "organisations"; referencedColumns: ["id"] }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_org_id: { Args: Record<PropertyKey, never>; Returns: string };
      get_user_role: { Args: Record<PropertyKey, never>; Returns: UserRole };
      same_org: { Args: { record_org_id: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      plan_tier: PlanTier;
      contract_status: ContractStatus;
      campaign_status: CampaignStatus;
      approval_type: ApprovalType;
      approval_status: ApprovalStatus;
      scope_item_status: ScopeItemStatus;
      evidence_type: EvidenceType;
      exclusivity_status: ExclusivityStatus;
      content_type: ContentType;
      scan_verdict: ScanVerdict;
      notice_urgency: NoticeUrgency;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
